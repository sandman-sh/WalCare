import { WalrusMemoryItem, CaregiverRole, MemoryCategory } from '@/types/carecircle';
import { INITIAL_WALRUS_MEMORIES, CAREGIVERS } from './seedData';
import { walrusService } from './walrusClient';
import fs from 'fs';
import path from 'path';

class MemoryStore {
  // Demo memories for Guest mode (Eleanor Vance)
  private guestMemories: WalrusMemoryItem[] = [];

  // Isolated per-wallet memories: Map<walletAddress, WalrusMemoryItem[]>
  private walletMemories = new Map<string, WalrusMemoryItem[]>();

  private storageFilePath: string;

  constructor() {
    this.guestMemories = [...INITIAL_WALRUS_MEMORIES];

    const tmpDir = path.join(process.cwd(), '.tmp');
    if (!fs.existsSync(tmpDir)) {
      try { fs.mkdirSync(tmpDir, { recursive: true }); } catch (e) {}
    }
    this.storageFilePath = path.join(tmpDir, 'walrus_wallet_memories.json');

    this.loadPersistentData();
  }

  private loadPersistentData() {
    try {
      if (fs.existsSync(this.storageFilePath)) {
        const raw = fs.readFileSync(this.storageFilePath, 'utf8');
        const parsed = JSON.parse(raw);

        if (parsed.wallets && typeof parsed.wallets === 'object') {
          for (const [wallet, mems] of Object.entries(parsed.wallets)) {
            if (Array.isArray(mems)) {
              this.walletMemories.set(wallet.toLowerCase(), mems as WalrusMemoryItem[]);
            }
          }
        }

        if (Array.isArray(parsed.guestMemories) && parsed.guestMemories.length > 0) {
          this.guestMemories = parsed.guestMemories;
        }
      }
    } catch (err) {
      console.warn('[Walrus Memory] Could not load persistent memory data:', err);
    }
  }

  private savePersistentData() {
    try {
      const walletsObj: Record<string, WalrusMemoryItem[]> = {};
      for (const [wallet, mems] of this.walletMemories.entries()) {
        walletsObj[wallet] = mems;
      }

      const payload = {
        wallets: walletsObj,
        guestMemories: this.guestMemories,
        updatedAt: new Date().toISOString(),
      };

      fs.writeFileSync(this.storageFilePath, JSON.stringify(payload, null, 2), 'utf8');
    } catch (err) {
      console.warn('[Walrus Memory] Could not save persistent memory data:', err);
    }
  }

  private normalizeOwner(walletAddress?: string | null, isGuest: boolean = false): string {
    if (isGuest || !walletAddress) return 'guest';
    const trimmed = walletAddress.trim().toLowerCase();
    return trimmed || 'guest';
  }

  public resetToSeed() {
    this.guestMemories = [...INITIAL_WALRUS_MEMORIES];
    this.savePersistentData();
  }

  public getAll(walletAddress?: string | null, isGuest: boolean = false): WalrusMemoryItem[] {
    const owner = this.normalizeOwner(walletAddress, isGuest);
    if (owner === 'guest') {
      return [...this.guestMemories];
    }
    const mems = this.walletMemories.get(owner) || [];
    return [...mems];
  }

  public getByAuthor(authorId: string, walletAddress?: string | null, isGuest: boolean = false): WalrusMemoryItem[] {
    const pool = this.getAll(walletAddress, isGuest);
    return pool.filter((m) => m.authorId === authorId);
  }

  public getByCategory(category: MemoryCategory, walletAddress?: string | null, isGuest: boolean = false): WalrusMemoryItem[] {
    const pool = this.getAll(walletAddress, isGuest);
    return pool.filter((m) => m.category === category);
  }

  public async addMemory(item: {
    authorId: string;
    authorName?: string;
    authorRole?: CaregiverRole;
    category: MemoryCategory;
    text: string;
    isSafetyCritical?: boolean;
    walletAddress?: string | null;
    isGuest?: boolean;
  }): Promise<WalrusMemoryItem> {
    const owner = this.normalizeOwner(item.walletAddress, item.isGuest || false);

    let authorName = item.authorName;
    let authorRole = item.authorRole;

    if (!authorName) {
      if (owner !== 'guest') {
        authorName = 'User';
        authorRole = authorRole || 'patient';
      } else {
        const cg = CAREGIVERS.find((c) => c.id === item.authorId) || CAREGIVERS[0];
        authorName = cg.name;
        authorRole = cg.role as CaregiverRole;
      }
    }

    // Attempt Walrus Relayer persistence
    const walrusResult = await walrusService.remember(item.text, {
      authorId: item.authorId,
      authorName,
      category: item.category,
    });

    const newMemory: WalrusMemoryItem = {
      id: `mem_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      blobId: walrusResult.blobId,
      suiObjectId: owner !== 'guest' ? `0x${owner.slice(2)}` : '0xd7ec125eb467c0cce65b219ff7ddeea217c16709077c2c48c183e47e80704287',
      authorId: item.authorId,
      authorName,
      authorRole: (authorRole || 'patient') as CaregiverRole,
      category: item.category,
      text: item.text,
      timestamp: new Date().toISOString(),
      status: walrusResult.status,
      namespace: owner !== 'guest' ? `walcare-${owner.slice(2, 10)}` : 'carecircle-eleanor-88',
      isSafetyCritical: item.isSafetyCritical || false,
    };

    if (owner === 'guest') {
      this.guestMemories.unshift(newMemory);
    } else {
      const list = this.walletMemories.get(owner) || [];
      list.unshift(newMemory);
      this.walletMemories.set(owner, list);
    }

    this.savePersistentData();
    return newMemory;
  }

  /**
   * Semantic recall algorithm scoped strictly to caller's identity:
   * - Guest mode queries Eleanor Vance demo memories.
   * - Wallet user queries ONLY memories belonging to their wallet.
   * - A brand new wallet user returns [] memories without hallucinating Sarah or Eleanor.
   */
  public async recall(
    query: string,
    limit: number = 4,
    walletAddress?: string | null,
    isGuest: boolean = false
  ): Promise<{ results: WalrusMemoryItem[]; total: number }> {
    const owner = this.normalizeOwner(walletAddress, isGuest);

    const memoryPool = owner === 'guest'
      ? this.guestMemories
      : (this.walletMemories.get(owner) || []);

    if (memoryPool.length === 0) {
      return { results: [], total: 0 };
    }

    // 1. Try SDK recall for query
    if (owner === 'guest') {
      const sdkRes = await walrusService.recall(query, { limit });
      if (sdkRes.results && sdkRes.results.length > 0) {
        return sdkRes;
      }
    }

    // 2. High-precision semantic ranking over caller's memory pool
    const qTokens = query
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2);

    if (qTokens.length === 0) {
      return {
        results: memoryPool.slice(0, limit).map((m) => ({ ...m, similarity: 0.7 })),
        total: memoryPool.length,
      };
    }

    const scored = memoryPool.map((mem) => {
      const textLower = mem.text.toLowerCase();
      let matchCount = 0;
      let exactBonus = 0;

      for (const token of qTokens) {
        if (textLower.includes(token)) {
          matchCount++;
          if (['blood', 'bp', 'ibuprofen', 'dizzy', 'stool', 'gastritis', 'knee', 'fall', 'insulin', 'name'].includes(token)) {
            exactBonus += 0.3;
          }
        }
      }

      if (textLower.includes(mem.category)) {
        exactBonus += 0.1;
      }

      const rawScore = (matchCount / Math.max(1, qTokens.length)) * 0.7 + exactBonus;
      const similarity = matchCount > 0 ? Math.min(0.98, Math.max(0.45, Number(rawScore.toFixed(2)))) : 0.2;

      return {
        ...mem,
        similarity,
      };
    });

    const relevant = scored
      .filter((m) => (m.similarity || 0) >= 0.4)
      .sort((a, b) => (b.similarity || 0) - (a.similarity || 0))
      .slice(0, limit);

    return {
      results: relevant,
      total: relevant.length,
    };
  }
}

// Global singleton instance so memory persists across API routes in dev/prod runtime
declare global {
  // eslint-disable-next-line no-var
  var __carecircle_memory_store: MemoryStore | undefined;
}

export const memoryStore = global.__carecircle_memory_store || new MemoryStore();
if (process.env.NODE_ENV !== 'production') {
  global.__carecircle_memory_store = memoryStore;
}
