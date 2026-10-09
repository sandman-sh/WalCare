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

function callConsoleMcp(toolName: string, args: Record<string, any> = {}): Promise<any> {
  return new Promise((resolve, reject) => {
    const localAppData = process.env.LOCALAPPDATA || '';
    const cmdPath = path.join(localAppData, 'walrus-console-mcp', 'node_modules', '.bin', 'walrus-console-mcp.cmd');

    const proc = spawn(cmdPath, [], {
      shell: true,
      env: { ...process.env, CONSOLE_MCP_ALLOWED_DIRS: process.cwd() }
    });

    let buffer = '';
    let initialized = false;
    let finished = false;

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
            finished = true;
            try { proc.kill(); } catch (e) {}
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
        finished = true;
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
        finished = true;
        try { proc.kill(); } catch (e) {}
        reject(new Error(`Walrus Console MCP tool ${toolName} timed out after 35s`));
      }
    }, 35000);
  });
}

class WalrusConsoleStore {
  private cachedFiles: WalrusConsoleFile[] = [];
  private cachedBuckets: WalrusConsoleBucket[] = [];
  private cachedUsage: WalrusConsoleStorageUsage | null = null;
  private lastFetchTime = 0;

  private getHeaders() {
    return {
      'Authorization': `Bearer ${getApiKey()}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };
  }

  /**
   * Fetch live buckets from Walrus Console
   */
  public async getBuckets(spaceId: string = DEFAULT_SPACE_ID): Promise<WalrusConsoleBucket[]> {
    try {
      const res = await fetch(`${CONSOLE_API_BASE}/api/v1/spaces/${spaceId}/buckets`, {
        headers: this.getHeaders(),
        next: { revalidate: 0 },
      });

      if (!res.ok) {
        console.warn(`[Walrus Console] Bucket fetch HTTP ${res.status}`);
        return this.cachedBuckets.length ? this.cachedBuckets : this.getDefaultBuckets();
      }

      const json = await res.json();
      const rawBuckets = json.buckets || json.data || [];
      const buckets: WalrusConsoleBucket[] = rawBuckets.map((b: any) => ({
        id: b.id,
        name: b.name,
        spaceId: b.space_id || spaceId,
        status: b.status || 'active',
        storageUsed: b.storage_used || 0,
        fileCount: b.file_count || 0,
        sealPolicyId: b.sealPolicy || b.seal_policy_id || DEFAULT_SEAL_POLICY,
        visibility: b.visibility || 'private',
        createdAt: b.created_at || new Date().toISOString(),
      }));

      this.cachedBuckets = buckets;
      return buckets;
    } catch (err) {
      console.error('[Walrus Console] getBuckets error:', err);
      return this.cachedBuckets.length ? this.cachedBuckets : this.getDefaultBuckets();
    }
  }

  /**
   * Fetch live files from Walrus Console bucket
   */
  public async getFiles(bucketId: string = DEFAULT_BUCKET_ID): Promise<WalrusConsoleFile[]> {
    try {
      const res = await fetch(`${CONSOLE_API_BASE}/api/v1/buckets/${bucketId}/files`, {
        headers: this.getHeaders(),
        next: { revalidate: 0 },
      });

      if (!res.ok) {
        console.warn(`[Walrus Console] Files fetch HTTP ${res.status}`);
        return this.cachedFiles;
      }

      const json = await res.json();
      const rawFiles = json.data || json.files || [];

      const files: WalrusConsoleFile[] = rawFiles.map((f: any) => ({
        id: f.id,
        name: f.name,
        bucketId: f.bucket_id || bucketId,
        blobId: f.blob_id,
        pooledBlobObjectId: f.pooled_blob_object_id || f.oyster_object_id,
        mimeType: f.mime_type || 'text/plain',
        size: f.size || f.display_size || 512,
        contentSize: f.content_size || f.display_size || 512,
        status: (f.status as any) || 'active',
        createdAt: f.created_at || new Date().toISOString(),
        updatedAt: f.updated_at,
        metadata: {
          tags: f.metadata?.tags || ['clinical', 'carecircle'],
          description: f.metadata?.description || 'Encrypted clinical record stored on Walrus Protocol',
        },
      }));

      this.cachedFiles = files;
      this.lastFetchTime = Date.now();
      return files;
    } catch (err) {
      console.error('[Walrus Console] getFiles error:', err);
      return this.cachedFiles;
    }
  }

  /**
   * Fetch live storage quota and breakdown from Walrus Console
   */
  public async getStorageUsage(): Promise<WalrusConsoleStorageUsage> {
    try {
      const res = await fetch(`${CONSOLE_API_BASE}/api/v1/usage`, {
        headers: this.getHeaders(),
        next: { revalidate: 0 },
      });

      if (res.ok) {
        const json = await res.json();
        const data = json.data || json;
        const usage: WalrusConsoleStorageUsage = {
          storageUsed: data.storage_used || 0,
          storageCap: data.storage_cap || 5000000000,
          available: data.available || (data.storage_cap - data.storage_used),
          percentUsed: data.percent_used ? (data.percent_used * 100) : ((data.storage_used / (data.storage_cap || 5000000000)) * 100),
          fileCount: this.cachedFiles.length,
          bucketCount: Math.max(1, this.cachedBuckets.length),
        };
        this.cachedUsage = usage;
        return usage;
      }
    } catch (err) {
      console.error('[Walrus Console] getStorageUsage error:', err);
    }

    if (this.cachedUsage) return this.cachedUsage;

    const totalBytes = this.cachedFiles.reduce((acc, f) => acc + f.size, 0);
    const cap = 5000000000;
    return {
      storageUsed: totalBytes,
      storageCap: cap,
      available: cap - totalBytes,
      percentUsed: (totalBytes / cap) * 100,
      fileCount: this.cachedFiles.length,
      bucketCount: 2,
    };
  }

  /**
   * Permanently delete a file from Walrus Console bucket
   */
  public async deleteFile(id: string, bucketId: string = DEFAULT_BUCKET_ID): Promise<boolean> {
    try {
      const res = await fetch(`${CONSOLE_API_BASE}/api/v1/buckets/${bucketId}/files/${id}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });

      if (res.status === 200 || res.status === 204) {
        this.cachedFiles = this.cachedFiles.filter((f) => f.id !== id);
        return true;
      }
      console.error(`[Walrus Console] Delete failed HTTP ${res.status}`);
      return false;
    } catch (err) {
      console.error('[Walrus Console] deleteFile error:', err);
      return false;
    }
  }

  /**
   * Upload file to Walrus Console with live SEAL client-side encryption
   */
  public async uploadFile(item: {
    name: string;
    content: string;
    mimeType?: string;
    description?: string;
    tags?: string[];
    bucketId?: string;
    sealPolicyId?: string;
  }): Promise<WalrusConsoleFile> {
    const bucketId = item.bucketId || DEFAULT_BUCKET_ID;
    const sealPolicyId = item.sealPolicyId || DEFAULT_SEAL_POLICY;
    const tmpDir = path.join(process.cwd(), '.tmp');
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }

    const safeName = item.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const localFilePath = path.join(tmpDir, `upload_${Date.now()}_${safeName}`);

    try {
      fs.writeFileSync(localFilePath, item.content, 'utf8');

      // Call MCP bridge to encrypt and store on Walrus Protocol
      const mcpResult = await callConsoleMcp('upload_file', {
        bucketId,
        sealPolicyId,
        localPath: localFilePath,
        name: item.name,
        description: item.description || 'Clinical observation file certified on Walrus storage',
        tags: item.tags || ['clinical', 'patient', 'carecircle'],
      });

      const fileId = mcpResult.fileId || mcpResult.id;

      // Re-fetch files to get complete on-chain blob references
      const freshFiles = await this.getFiles(bucketId);
      const uploaded = freshFiles.find((f) => f.id === fileId || f.name === item.name);

      if (uploaded) {
        return uploaded;
      }

      // Fallback synthetic representation until indexer refreshes
      const size = Buffer.byteLength(item.content, 'utf8');
      const fallbackFile: WalrusConsoleFile = {
        id: fileId || `file_${Date.now()}`,
        name: item.name,
        bucketId,
        blobId: `walrus_blob_${Date.now()}`,
        mimeType: item.mimeType || 'text/plain',
        size: size + 316,
        contentSize: size,
        status: 'active',
        createdAt: new Date().toISOString(),
        metadata: {
          tags: item.tags || ['clinical', 'patient'],
          description: item.description,
        },
      };

      this.cachedFiles.unshift(fallbackFile);
      return fallbackFile;
    } finally {
      if (fs.existsSync(localFilePath)) {
        try { fs.unlinkSync(localFilePath); } catch (e) {}
      }
    }
  }

  /**
   * Download and decrypt file from Walrus Console using local SEAL private key
   */
  public async downloadFile(fileId: string, bucketId: string = DEFAULT_BUCKET_ID, sealPolicyId: string = DEFAULT_SEAL_POLICY): Promise<{ content: string; name: string }> {
    const tmpDir = path.join(process.cwd(), '.tmp');
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
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
        const file = this.cachedFiles.find((f) => f.id === fileId);
        return {
          content,
          name: file?.name || `${fileId}.txt`,
        };
      }
      throw new Error('Downloaded file not found on disk');
    } finally {
      if (fs.existsSync(destPath)) {
        try { fs.unlinkSync(destPath); } catch (e) {}
      }
    }
  }

  private getDefaultBuckets(): WalrusConsoleBucket[] {
    return [
      {
        id: DEFAULT_BUCKET_ID,
        name: 'sandman',
        spaceId: DEFAULT_SPACE_ID,
        status: 'active',
        storageUsed: 7208,
        fileCount: 4,
        sealPolicyId: DEFAULT_SEAL_POLICY,
        visibility: 'private',
        createdAt: '2026-09-22T18:07:51.167Z',
      },
    ];
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
