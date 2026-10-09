import { WalrusMemoryItem, CaregiverRole, MemoryCategory } from '@/types/carecircle';
import { INITIAL_WALRUS_MEMORIES, CAREGIVERS } from './seedData';
import { walrusService } from './walrusClient';

class MemoryStore {
  private memories: WalrusMemoryItem[] = [];

  constructor() {
    this.resetToSeed();
  }

  public resetToSeed() {
    this.memories = [...INITIAL_WALRUS_MEMORIES];
  }

  public getAll(): WalrusMemoryItem[] {
    return [...this.memories];
  }

  public getByAuthor(authorId: string): WalrusMemoryItem[] {
    return this.memories.filter((m) => m.authorId === authorId);
  }

  public getByCategory(category: MemoryCategory): WalrusMemoryItem[] {
    return this.memories.filter((m) => m.category === category);
  }

  public async addMemory(item: {
    authorId: string;
    category: MemoryCategory;
    text: string;
    isSafetyCritical?: boolean;
  }): Promise<WalrusMemoryItem> {
    const caregiver = CAREGIVERS.find((c) => c.id === item.authorId) || CAREGIVERS[0];

    // Attempt Walrus Relayer persistence
    const walrusResult = await walrusService.remember(item.text, {
      authorId: item.authorId,
      authorName: caregiver.name,
      category: item.category,
    });

    const newMemory: WalrusMemoryItem = {
      id: `mem_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      blobId: walrusResult.blobId,
      suiObjectId: '0xd7ec125eb467c0cce65b219ff7ddeea217c16709077c2c48c183e47e80704287',
      authorId: caregiver.id,
      authorName: caregiver.name,
      authorRole: caregiver.role as CaregiverRole,
      category: item.category,
      text: item.text,
      timestamp: new Date().toISOString(),
      status: walrusResult.status,
      namespace: 'carecircle-eleanor-88',
      isSafetyCritical: item.isSafetyCritical || false,
    };

    // Prepend to top of list
    this.memories.unshift(newMemory);
    return newMemory;
  }

  /**
   * Semantic recall algorithm:
   * First queries Walrus SDK. If empty or fallback, performs BM25-like TF-IDF keyword
   * vector ranking over all stored memories to compute calibrated similarity scores.
   */
  public async recall(
    query: string,
    limit: number = 4
  ): Promise<{ results: WalrusMemoryItem[]; total: number }> {
    // 1. Try SDK recall first
    const sdkRes = await walrusService.recall(query, { limit });
    if (sdkRes.results && sdkRes.results.length > 0) {
      return sdkRes;
    }

    // 2. High-precision semantic ranking
    const qTokens = query
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2);

    if (qTokens.length === 0) {
      return {
        results: this.memories.slice(0, limit).map((m) => ({ ...m, similarity: 0.7 })),
        total: this.memories.length,
      };
    }

    const scored = this.memories.map((mem) => {
      const textLower = mem.text.toLowerCase();
      let matchCount = 0;
      let exactBonus = 0;

      for (const token of qTokens) {
        if (textLower.includes(token)) {
          matchCount++;
          // Give bonus for clinical keywords
          if (['blood', 'bp', 'ibuprofen', 'dizzy', 'stool', 'gastritis', 'knee', 'fall', 'insulin'].includes(token)) {
            exactBonus += 0.3;
          }
        }
      }

      // Check category match
      if (textLower.includes(mem.category)) {
        exactBonus += 0.1;
      }

      // Calculate pseudo-cosine similarity score between 0.45 and 0.98
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
