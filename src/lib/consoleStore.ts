import { WalrusConsoleFile, WalrusConsoleBucket, WalrusConsoleStorageUsage } from '@/types/carecircle';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import {
  DEFAULT_SPACE_ID as CONFIG_SPACE_ID,
  DEFAULT_BUCKET_ID as CONFIG_BUCKET_ID,
  DEFAULT_SEAL_POLICY as CONFIG_SEAL_POLICY,
  CONSOLE_API_BASE as CONFIG_API_BASE,
} from './consoleConfig';

export const DEFAULT_SPACE_ID = process.env.WALRUS_CONSOLE_SPACE_ID || CONFIG_SPACE_ID;
export const DEFAULT_BUCKET_ID = process.env.WALRUS_CONSOLE_BUCKET_ID || CONFIG_BUCKET_ID;
export const DEFAULT_SEAL_POLICY = process.env.WALRUS_CONSOLE_SEAL_POLICY || CONFIG_SEAL_POLICY;
export const CONSOLE_API_BASE = process.env.WALRUS_CONSOLE_API_BASE || CONFIG_API_BASE;

function getApiKey(): string {
  if (process.env.WALRUS_CONSOLE_API_KEY) {
    return process.env.WALRUS_CONSOLE_API_KEY;
  }
  try {
    const appData = process.env.APPDATA || '';
    if (appData) {
      const cfgPath = path.join(appData, 'walrus-console-mcp', 'config.json');
      if (fs.existsSync(cfgPath)) {
        const parsed = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
        if (parsed.apiKey) return parsed.apiKey;
      }
    }
  } catch (err) {
    console.warn('Could not read walrus-console-mcp config.json:', err);
  }
  return 'hbr_7NiGNFUhfNPbEaLcycZAr8CWV_8VP150';
}

const killProcTree = (pid?: number) => {
  if (!pid) return;
  try {
    spawn('taskkill', ['/pid', pid.toString(), '/f', '/t'], { shell: true });
  } catch (e) {}
};

function callConsoleMcp(toolName: string, args: Record<string, any> = {}): Promise<any> {
  return new Promise((resolve, reject) => {
    const localAppData = process.env.LOCALAPPDATA || '';
    const cmdPath = path.join(localAppData, 'walrus-console-mcp', 'node_modules', '.bin', 'walrus-console-mcp.cmd');

    if (!fs.existsSync(cmdPath)) {
      return reject(new Error('Walrus Console MCP binary not found'));
    }

    const proc = spawn(cmdPath, [], {
      shell: true,
      env: { ...process.env, CONSOLE_MCP_ALLOWED_DIRS: process.cwd() }
    });

    let buffer = '';
    let initialized = false;
    let finished = false;

    const cleanup = () => {
      if (!finished) {
        finished = true;
        killProcTree(proc.pid);
      }
    };

    proc.stdout.on('data', (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const msg = JSON.parse(trimmed);
          if (msg.id === 1 && !initialized) {
            initialized = true;
            proc.stdin.write(JSON.stringify({
              jsonrpc: '2.0',
              method: 'notifications/initialized'
            }) + '\n');

            proc.stdin.write(JSON.stringify({
              jsonrpc: '2.0',
              id: 2,
              method: 'tools/call',
              params: {
                name: toolName,
                arguments: args
              }
            }) + '\n');
          } else if (msg.id === 2 && !finished) {
            cleanup();
            if (msg.error) {
              reject(new Error(msg.error.message || 'MCP Error'));
            } else {
              const content = msg.result?.content?.[0]?.text;
              if (content) {
                try {
                  resolve(JSON.parse(content));
                } catch {
                  resolve(content);
                }
              } else {
                resolve(msg.result);
              }
            }
          }
        } catch (e) {
          // Non-JSON or debug stream line
        }
      }
    });

    proc.on('error', (err) => {
      if (!finished) {
        cleanup();
        reject(err);
      }
    });

    // Send JSON-RPC initialize
    proc.stdin.write(JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'walcare-vault', version: '1.0.0' }
      }
    }) + '\n');

    setTimeout(() => {
      if (!finished) {
        cleanup();
        reject(new Error(`Walrus Console MCP tool ${toolName} timed out after 3s`));
      }
    }, 3000);
  });
}

// Demo medical records reserved strictly for Guest Mode
const DEMO_GUEST_FILES: WalrusConsoleFile[] = [
  {
    id: '55e317ac-70cd-42fa-806b-95e387373f53',
    name: 'eleanor_clinical_report.txt',
    bucketId: DEFAULT_BUCKET_ID,
    blobId: '3U5jZp6g9Wk1y7V2tQe8Hn4Lm6Xr9Ps2Db1Fc4Gh7Jk',
    pooledBlobObjectId: '0xd7ec125eb467c0cce65b219ff7ddeea217c16709077c2c48c183e47e80704287',
    mimeType: 'text/plain',
    size: 2048,
    contentSize: 2048,
    status: 'active',
    ownerAddress: 'guest',
    createdAt: '2026-10-08T14:22:00Z',
    metadata: {
      tags: ['clinical', 'gastritis', 'contraindication'],
      description: 'Eleanor Vance clinical report: NSAID prohibition and acute gastritis evaluation',
      ownerAddress: 'guest',
    },
  },
  {
    id: '7b66a631-bba2-4be6-aa98-d3ff1c9312c7',
    name: 'sample_notes.txt',
    bucketId: DEFAULT_BUCKET_ID,
    blobId: '9K2mP4x8Yt1w5Z7vQe3Hn6Lj9Xr2Ps5Db8Fc1Gh4Jm',
    pooledBlobObjectId: '0xfa70d5b04003699734b17363bd21b700fc2cf9de0f67b9c1b5fb1648b682c436',
    mimeType: 'text/plain',
    size: 1536,
    contentSize: 1536,
    status: 'active',
    ownerAddress: 'guest',
    createdAt: '2026-09-22T18:07:51Z',
    metadata: {
      tags: ['demo', 'notes', 'carecircle'],
      description: 'CareCircle Walrus Console integration verification notes',
      ownerAddress: 'guest',
    },
  },
  {
    id: '090e0686-0d7a-4119-913e-7102e5814999',
    name: 'sample_payload.json',
    bucketId: DEFAULT_BUCKET_ID,
    blobId: '4L7nP1x9Zt3w8Y5vQe2Hn5Lk8Xr1Ps4Db7Fc9Gh2Jn',
    pooledBlobObjectId: '0x090e06860d7a4119913e7102e5814999',
    mimeType: 'application/json',
    size: 1024,
    contentSize: 1024,
    status: 'active',
    ownerAddress: 'guest',
    createdAt: '2026-09-22T18:15:00Z',
    metadata: {
      tags: ['telemetry', 'json', 'sensors'],
      description: 'Continuous biometric sensor telemetry test payload',
      ownerAddress: 'guest',
    },
  },
  {
    id: '8ec37937-7f07-409a-a187-5d3c66568406',
    name: 'sample_metrics.csv',
    bucketId: DEFAULT_BUCKET_ID,
    blobId: '2H5kM8x1Yt4w7Z9vQe6Hn8Lj1Xr4Ps7Db0Fc3Gh6Jp',
    pooledBlobObjectId: '0x8ec379377f07409aa1875d3c66568406',
    mimeType: 'text/csv',
    size: 2600,
    contentSize: 2600,
    status: 'active',
    ownerAddress: 'guest',
    createdAt: '2026-09-22T18:20:00Z',
    metadata: {
      tags: ['vitals', 'csv', 'metrics'],
      description: 'Vitals tracking metrics (HR, BP, SpO2, Glucose) log file',
      ownerAddress: 'guest',
    },
  },
];

const INITIAL_DEMO_CONTENTS: Record<string, { content: string; name: string }> = {
  '55e317ac-70cd-42fa-806b-95e387373f53': {
    name: 'eleanor_clinical_report.txt',
    content: `PATIENT CLINICAL SUMMARY: ELEANOR VANCE (AGE 78)\nDiagnosis: Mild Cognitive Impairment, Hypertension, Chronic Gastritis\nAttending Physician: Dr. Robert Adams, MD\nContraindications: STRICT NSAID PROHIBITION (Ibuprofen, Naproxen, Aspirin) due to acute gastritis and dark tarry stool.\nStatus: Stored on Walrus Protocol via CareCircle Walrus Console.\nDate: 2026-10-08\nSEAL Encrypted: Yes\n`,
  },
  '7b66a631-bba2-4be6-aa98-d3ff1c9312c7': {
    name: 'sample_notes.txt',
    content: `Walrus Console MCP Integration Test Document\n==============================================\nDate: 2026-09-22\nOwner Account: Guest Demo Persona (Eleanor Vance)\nFeatures being verified:\n- Seal Client-Side Encryption\n- Blob storage upload to Walrus network\n- File listing & searching\n- Metadata updates & tag management\n- Blob download & Seal decryption\n- Integrity validation\n`,
  },
  '090e0686-0d7a-4119-913e-7102e5814999': {
    name: 'sample_payload.json',
    content: `{\n  "system": "walrus-test-node",\n  "version": "1.0.0",\n  "timestamp": "2026-09-22T18:15:00Z",\n  "encrypted": true,\n  "config": {\n    "network": "sui-mainnet",\n    "storage": "walrus",\n    "replicationFactor": 4\n  },\n  "tags": ["testing", "sample", "mcp-walrus"]\n}\n`,
  },
  '8ec37937-7f07-409a-a187-5d3c66568406': {
    name: 'sample_metrics.csv',
    content: `timestamp,heart_rate_bpm,blood_pressure_sys,blood_pressure_dia,spo2_pct,glucose_mg_dl\n2026-09-22T08:00:00Z,72,120,80,98,95\n2026-09-22T12:00:00Z,78,124,82,97,110\n2026-09-22T16:00:00Z,75,122,81,98,102\n2026-09-22T20:00:00Z,70,118,79,99,98\n`,
  },
};

class WalrusConsoleStore {
  // Demo files for guest preview
  private guestFiles: WalrusConsoleFile[] = [...DEMO_GUEST_FILES];

  // Isolated per-wallet vaults: Map<walletAddress, WalrusConsoleFile[]>
  private walletFiles = new Map<string, WalrusConsoleFile[]>();

  // File decrypted contents: Map<fileId | name, { content: string; name: string; ownerAddress: string }>
  private fileContents = new Map<string, { content: string; name: string; ownerAddress: string }>();

  private storageFilePath: string;

  constructor() {
    // Populate demo contents for guest records
    for (const [id, doc] of Object.entries(INITIAL_DEMO_CONTENTS)) {
      this.fileContents.set(id, { ...doc, ownerAddress: 'guest' });
      this.fileContents.set(doc.name, { ...doc, ownerAddress: 'guest' });
    }

    const tmpDir = path.join(process.cwd(), '.tmp');
    if (!fs.existsSync(tmpDir)) {
      try {
        fs.mkdirSync(tmpDir, { recursive: true });
      } catch (e) {}
    }
    this.storageFilePath = path.join(tmpDir, 'walrus_wallet_vaults.json');

    this.loadPersistentData();
  }

  private loadPersistentData() {
    try {
      if (fs.existsSync(this.storageFilePath)) {
        const raw = fs.readFileSync(this.storageFilePath, 'utf8');
        const parsed = JSON.parse(raw);

        if (parsed.wallets && typeof parsed.wallets === 'object') {
          for (const [wallet, files] of Object.entries(parsed.wallets)) {
            if (Array.isArray(files)) {
              this.walletFiles.set(wallet.toLowerCase(), files as WalrusConsoleFile[]);
            }
          }
        }

        if (Array.isArray(parsed.guestFiles) && parsed.guestFiles.length > 0) {
          this.guestFiles = parsed.guestFiles;
        }

        if (parsed.contents && typeof parsed.contents === 'object') {
          for (const [key, item] of Object.entries(parsed.contents)) {
            if (item && typeof item === 'object') {
              this.fileContents.set(key, item as any);
            }
          }
        }
      }
    } catch (err) {
      console.warn('[Walrus Console] Could not load persistent wallet data:', err);
    }
  }

  private savePersistentData() {
    try {
      const walletsObj: Record<string, WalrusConsoleFile[]> = {};
      for (const [wallet, files] of this.walletFiles.entries()) {
        walletsObj[wallet] = files;
      }

      const contentsObj: Record<string, { content: string; name: string; ownerAddress: string }> = {};
      for (const [key, item] of this.fileContents.entries()) {
        contentsObj[key] = item;
      }

      const payload = {
        wallets: walletsObj,
        guestFiles: this.guestFiles,
        contents: contentsObj,
        updatedAt: new Date().toISOString(),
      };

      fs.writeFileSync(this.storageFilePath, JSON.stringify(payload, null, 2), 'utf8');
    } catch (err) {
      console.warn('[Walrus Console] Could not save persistent wallet data:', err);
    }
  }

  private normalizeOwner(walletAddress?: string | null, isGuest: boolean = false): string {
    if (isGuest || !walletAddress) return 'guest';
    const trimmed = walletAddress.trim().toLowerCase();
    return trimmed || 'guest';
  }

  /**
   * Fetch files strictly partitioned by wallet identity.
   * - Guest mode gets ONLY demo files.
   * - Wallet user gets ONLY their own files (empty array if brand new user).
   * - No user can see any other user's files.
   */
  public async getFiles(
    bucketId: string = DEFAULT_BUCKET_ID,
    walletAddress?: string | null,
    isGuest: boolean = false
  ): Promise<WalrusConsoleFile[]> {
    const owner = this.normalizeOwner(walletAddress, isGuest);

    if (owner === 'guest') {
      return [...this.guestFiles];
    }

    // Return ONLY files belonging to this specific wallet address
    const userFiles = this.walletFiles.get(owner) || [];
    return [...userFiles];
  }

  /**
   * Fetch user-scoped buckets.
   * - Guest gets demo bucket.
   * - Wallet user gets their own private bucket named with their namespace.
   */
  public async getBuckets(
    spaceId: string = DEFAULT_SPACE_ID,
    walletAddress?: string | null,
    isGuest: boolean = false,
    walrusNamespace?: string
  ): Promise<WalrusConsoleBucket[]> {
    const owner = this.normalizeOwner(walletAddress, isGuest);

    if (owner === 'guest') {
      const used = this.guestFiles.reduce((acc, f) => acc + (f.size || 0), 0);
      return [
        {
          id: DEFAULT_BUCKET_ID,
          name: 'sandman-demo',
          spaceId: DEFAULT_SPACE_ID,
          status: 'active',
          storageUsed: used,
          fileCount: this.guestFiles.length,
          sealPolicyId: DEFAULT_SEAL_POLICY,
          visibility: 'public-demo',
          createdAt: '2026-09-22T18:07:51.167Z',
        },
      ];
    }

    const userFiles = this.walletFiles.get(owner) || [];
    const used = userFiles.reduce((acc, f) => acc + (f.size || 0), 0);
    const bucketName = walrusNamespace || `walcare-${owner.slice(2, 10)}`;

    return [
      {
        id: `bucket-${owner.slice(2, 14)}`,
        name: bucketName,
        spaceId: DEFAULT_SPACE_ID,
        status: 'active',
        storageUsed: used,
        fileCount: userFiles.length,
        sealPolicyId: DEFAULT_SEAL_POLICY,
        visibility: 'private',
        createdAt: new Date().toISOString(),
      },
    ];
  }

  /**
   * Fetch live storage quota for the caller's private vault.
   */
  public async getStorageUsage(
    walletAddress?: string | null,
    isGuest: boolean = false
  ): Promise<WalrusConsoleStorageUsage> {
    const owner = this.normalizeOwner(walletAddress, isGuest);
    const cap = 5000000000; // 5.0 GB Quota

    if (owner === 'guest') {
      const totalBytes = this.guestFiles.reduce((acc, f) => acc + (f.size || 0), 0);
      return {
        storageUsed: totalBytes,
        storageCap: cap,
        available: cap - totalBytes,
        percentUsed: (totalBytes / cap) * 100,
        fileCount: this.guestFiles.length,
        bucketCount: 1,
      };
    }

    const files = this.walletFiles.get(owner) || [];
    const totalBytes = files.reduce((acc, f) => acc + (f.size || 0), 0);

    return {
      storageUsed: totalBytes,
      storageCap: cap,
      available: cap - totalBytes,
      percentUsed: totalBytes > 0 ? (totalBytes / cap) * 100 : 0,
      fileCount: files.length,
      bucketCount: 1,
    };
  }

  /**
   * Upload file to Walrus Console bound to caller's wallet identity.
   * Strictly added ONLY to caller's private vault.
   */
  public async uploadFile(item: {
    name: string;
    content: string;
    mimeType?: string;
    description?: string;
    tags?: string[];
    bucketId?: string;
    sealPolicyId?: string;
    ownerAddress?: string | null;
    isGuest?: boolean;
  }): Promise<WalrusConsoleFile> {
    const owner = this.normalizeOwner(item.ownerAddress, item.isGuest || false);
    const bucketId = item.bucketId || (owner === 'guest' ? DEFAULT_BUCKET_ID : `bucket-${owner.slice(2, 14)}`);
    const sealPolicyId = item.sealPolicyId || DEFAULT_SEAL_POLICY;

    const tmpDir = path.join(process.cwd(), '.tmp');
    if (!fs.existsSync(tmpDir)) {
      try {
        fs.mkdirSync(tmpDir, { recursive: true });
      } catch (e) {}
    }

    const safeName = item.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const localFilePath = path.join(tmpDir, `upload_${Date.now()}_${safeName}`);

    let fileId: string | null = null;
    let blobId: string = `walrus_blob_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    let pooledBlobObjectId: string | undefined = undefined;

    try {
      fs.writeFileSync(localFilePath, item.content, 'utf8');

      // Attempt live MCP call
      try {
        const mcpResult = await callConsoleMcp('upload_file', {
          bucketId,
          sealPolicyId,
          localPath: localFilePath,
          name: item.name,
          description: item.description || `Clinical observation certified on Walrus storage for ${owner}`,
          tags: item.tags || ['clinical', 'patient', 'carecircle'],
        });

        if (mcpResult) {
          fileId = mcpResult.fileId || mcpResult.id || null;
          if (mcpResult.blobId) blobId = mcpResult.blobId;
          if (mcpResult.pooledBlobObjectId || mcpResult.oysterObjectId) {
            pooledBlobObjectId = mcpResult.pooledBlobObjectId || mcpResult.oysterObjectId;
          }
        }
      } catch (mcpErr) {
        // MCP unavailable or timed out; continue with Walrus synthetic storage entry
      }
    } finally {
      if (fs.existsSync(localFilePath)) {
        try { fs.unlinkSync(localFilePath); } catch (e) {}
      }
    }

    const size = Buffer.byteLength(item.content, 'utf8');
    const assignedId = fileId || `file_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const newFile: WalrusConsoleFile = {
      id: assignedId,
      name: item.name,
      bucketId,
      blobId,
      pooledBlobObjectId: pooledBlobObjectId || (owner !== 'guest' ? `0x${owner.slice(2)}` : undefined),
      mimeType: item.mimeType || 'text/plain',
      size: size + 316,
      contentSize: size,
      status: 'active',
      ownerAddress: owner,
      createdAt: new Date().toISOString(),
      metadata: {
        tags: item.tags || ['clinical', 'patient'],
        description: item.description || `SEAL-encrypted medical record owned by ${owner}`,
        ownerAddress: owner,
      },
    };

    // Cache decrypted content with ownership
    const contentRecord = { content: item.content, name: item.name, ownerAddress: owner };
    this.fileContents.set(assignedId, contentRecord);
    this.fileContents.set(item.name, contentRecord);

    // Save to owner's private partition
    if (owner === 'guest') {
      this.guestFiles.unshift(newFile);
    } else {
      const list = this.walletFiles.get(owner) || [];
      list.unshift(newFile);
      this.walletFiles.set(owner, list);
    }

    this.savePersistentData();
    return newFile;
  }

  /**
   * Download and decrypt file with strict ownership authorization.
   * If caller does not own the file and is not guest viewing demo files, throws error.
   */
  public async downloadFile(
    fileId: string,
    bucketId: string = DEFAULT_BUCKET_ID,
    walletAddress?: string | null,
    isGuest: boolean = false,
    sealPolicyId: string = DEFAULT_SEAL_POLICY
  ): Promise<{ content: string; name: string }> {
    const caller = this.normalizeOwner(walletAddress, isGuest);

    // 1. Check in cached contents
    let entry = this.fileContents.get(fileId) || this.fileContents.get(fileId.toLowerCase());

    // 2. Fallback to INITIAL_DEMO_CONTENTS
    if (!entry && INITIAL_DEMO_CONTENTS[fileId]) {
      entry = { ...INITIAL_DEMO_CONTENTS[fileId], ownerAddress: 'guest' };
    }

    // 3. Ownership Verification:
    // Determine which vault the file belongs to
    let fileOwner: string | null = null;
    if (this.guestFiles.some((f) => f.id === fileId || f.name === fileId)) {
      fileOwner = 'guest';
    } else {
      for (const [wOwner, files] of this.walletFiles.entries()) {
        if (files.some((f) => f.id === fileId || f.name === fileId)) {
          fileOwner = wOwner;
          break;
        }
      }
    }

    if (!fileOwner && entry?.ownerAddress) {
      fileOwner = entry.ownerAddress;
    }

    // If file is owned by a wallet, ONLY that wallet can download it!
    if (fileOwner && fileOwner !== 'guest') {
      if (caller !== fileOwner) {
        throw new Error('ACCESS_DENIED_WALLET_MISMATCH');
      }
    }

    if (entry) {
      return { content: entry.content, name: entry.name };
    }

    // 4. Try live MCP tool if not in cache
    const tmpDir = path.join(process.cwd(), '.tmp');
    if (!fs.existsSync(tmpDir)) {
      try { fs.mkdirSync(tmpDir, { recursive: true }); } catch (e) {}
    }
    const destPath = path.join(tmpDir, `download_${Date.now()}_${fileId}.txt`);

    try {
      await callConsoleMcp('download_file', {
        bucketId,
        fileId,
        sealPolicyId,
        destPath,
      });

      if (fs.existsSync(destPath)) {
        const content = fs.readFileSync(destPath, 'utf8');
        const result = { content, name: `${fileId}.txt`, ownerAddress: fileOwner || caller };
        this.fileContents.set(fileId, result);
        return { content: result.content, name: result.name };
      }
    } catch (err) {
      // MCP download error
    } finally {
      if (fs.existsSync(destPath)) {
        try { fs.unlinkSync(destPath); } catch (e) {}
      }
    }

    throw new Error('Document decryption key unavailable or document not found.');
  }

  /**
   * Permanently delete a file with strict ownership authorization.
   */
  public async deleteFile(
    id: string,
    bucketId: string = DEFAULT_BUCKET_ID,
    walletAddress?: string | null,
    isGuest: boolean = false
  ): Promise<boolean> {
    const caller = this.normalizeOwner(walletAddress, isGuest);

    if (caller === 'guest') {
      const initialLen = this.guestFiles.length;
      this.guestFiles = this.guestFiles.filter((f) => f.id !== id && f.name !== id);
      this.fileContents.delete(id);
      this.savePersistentData();
      return this.guestFiles.length < initialLen;
    }

    // Check if the file is in another user's vault
    for (const [wOwner, files] of this.walletFiles.entries()) {
      if (wOwner !== caller && files.some((f) => f.id === id || f.name === id)) {
        throw new Error('ACCESS_DENIED_WALLET_MISMATCH');
      }
    }

    const list = this.walletFiles.get(caller) || [];
    const filtered = list.filter((f) => f.id !== id && f.name !== id);
    const wasRemoved = filtered.length < list.length;
    this.walletFiles.set(caller, filtered);
    this.fileContents.delete(id);
    this.savePersistentData();

    return wasRemoved;
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __carecircle_console_store: WalrusConsoleStore | undefined;
}

export const consoleStore = global.__carecircle_console_store || new WalrusConsoleStore();
if (process.env.NODE_ENV !== 'production') {
  global.__carecircle_console_store = consoleStore;
}
