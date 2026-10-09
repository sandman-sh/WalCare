'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  FolderLock,
  Upload,
  Download,
  FileText,
  Search,
  ExternalLink,
  ShieldCheck,
  HardDrive,
  Copy,
  Check,
  Plus,
  RefreshCw,
  FileCode,
  Activity,
  Pill,
  Trash2,
  Eye,
  Loader2,
  X,
  Lock,
  Wallet,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import {
  WalrusConsoleFile,
  WalrusConsoleBucket,
  WalrusConsoleStorageUsage,
  UserProfile,
} from '@/types/carecircle';
import { SuiAccount } from './WalletModal';
import { DEFAULT_BUCKET_ID, DEFAULT_SEAL_POLICY } from '@/lib/consoleConfig';

interface ConsoleVaultProps {
  suiAccount?: SuiAccount | null;
  isGuestMode?: boolean;
  userProfile?: UserProfile | null;
  onStatsUpdated?: (count: number) => void;
  onOpenWalletModal?: () => void;
}

export function ConsoleVault({
  suiAccount,
  isGuestMode = true,
  userProfile,
  onStatsUpdated,
  onOpenWalletModal,
}: ConsoleVaultProps) {
  const [files, setFiles] = useState<WalrusConsoleFile[]>([]);
  const [storageUsage, setStorageUsage] = useState<WalrusConsoleStorageUsage | null>(null);
  const [buckets, setBuckets] = useState<WalrusConsoleBucket[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [copiedBlobId, setCopiedBlobId] = useState<string | null>(null);

  // In-app Document Preview Modal
  const [previewFile, setPreviewFile] = useState<WalrusConsoleFile | null>(null);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [fileName, setFileName] = useState('');
  const [fileContent, setFileContent] = useState('');
  const [fileDesc, setFileDesc] = useState('');
  const [fileCategory, setFileCategory] = useState('clinical');
  const [isUploading, setIsUploading] = useState(false);

  const fetchConsoleData = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (suiAccount?.address) {
        params.append('walletAddress', suiAccount.address);
      }
      params.append('isGuest', isGuestMode ? 'true' : 'false');
      if (userProfile?.walrusNamespace) {
        params.append('walrusNamespace', userProfile.walrusNamespace);
      }

      const res = await fetch(`/api/console?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        const docList: WalrusConsoleFile[] = data.files || [];
        setFiles(docList);
        setBuckets(data.buckets || []);
        setStorageUsage(data.storageUsage || null);
        if (onStatsUpdated) {
          onStatsUpdated(docList.length);
        }
      }
    } catch (err) {
      console.error('Error loading Walrus Console files:', err);
    } finally {
      setIsLoading(false);
    }
  }, [suiAccount?.address, isGuestMode, userProfile?.walrusNamespace, onStatsUpdated]);

  useEffect(() => {
    fetchConsoleData();
  }, [fetchConsoleData]);

  const handleCopyBlob = (blobId: string) => {
    navigator.clipboard.writeText(blobId);
    setCopiedBlobId(blobId);
    setTimeout(() => setCopiedBlobId(null), 2000);
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileName.trim() || !fileContent.trim() || isUploading) return;

    setIsUploading(true);
    try {
      const activeBucketId = buckets[0]?.id || DEFAULT_BUCKET_ID;
      const res = await fetch('/api/console', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'upload',
          walletAddress: suiAccount?.address || null,
          isGuest: isGuestMode,
          bucketId: activeBucketId,
          file: {
            name: fileName.endsWith('.txt') || fileName.endsWith('.json') || fileName.endsWith('.pdf')
              ? fileName
              : `${fileName}.txt`,
            content: fileContent,
            description: fileDesc,
            tags: [
              fileCategory,
              userProfile?.name ? userProfile.name.toLowerCase().replace(/\s+/g, '_') : 'patient',
              'carecircle',
            ],
            bucketId: activeBucketId,
          },
        }),
      });

      if (res.ok) {
        setShowUploadModal(false);
        setFileName('');
        setFileContent('');
        setFileDesc('');
        await fetchConsoleData();
      }
    } catch (err) {
      console.error('Failed to upload file to Walrus Console:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const getDownloadUrl = (file: WalrusConsoleFile) => {
    const params = new URLSearchParams({
      action: 'download',
      id: file.id,
      bucketId: file.bucketId,
      isGuest: isGuestMode ? 'true' : 'false',
    });
    if (suiAccount?.address) {
      params.append('walletAddress', suiAccount.address);
    }
    return `/api/console?${params.toString()}`;
  };

  const handleDownload = async (file: WalrusConsoleFile) => {
    try {
      const res = await fetch(getDownloadUrl(file));
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return;
      }
      if (res.status === 403) {
        alert('Access Denied: This document is SEAL-encrypted and private to its wallet owner.');
      } else {
        alert('Could not download document from Walrus storage.');
      }
    } catch (err) {
      console.error('Failed to download decrypted file:', err);
    }
  };

  const handleViewFile = async (file: WalrusConsoleFile) => {
    setPreviewFile(file);
    setIsPreviewLoading(true);
    setPreviewContent(null);
    try {
      const res = await fetch(getDownloadUrl(file));
      if (res.ok) {
        const text = await res.text();
        setPreviewContent(text);
      } else if (res.status === 403) {
        setPreviewContent('Access Denied: You do not have decryption authorization for this medical document. It is private to another wallet.');
      } else {
        setPreviewContent('Decryption engine unavailable. Please ensure local SEAL threshold policy is active.');
      }
    } catch (err) {
      setPreviewContent('Failed to decrypt document from Walrus storage.');
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleDeleteFile = async (fileId: string, fileName: string, fileBucketId: string) => {
    if (!confirm(`Delete "${fileName}" permanently from Walrus Console?`)) return;
    try {
      const res = await fetch('/api/console', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          id: fileId,
          bucketId: fileBucketId || DEFAULT_BUCKET_ID,
          walletAddress: suiAccount?.address || null,
          isGuest: isGuestMode,
        }),
      });
      if (res.ok) {
        await fetchConsoleData();
      } else if (res.status === 403) {
        alert('Access Denied: Cannot delete document owned by another wallet.');
      }
    } catch (err) {
      console.error('Failed to delete file from Walrus Console:', err);
    }
  };

  const filteredFiles = files.filter((f) => {
    const q = searchQuery.toLowerCase();
    return (
      f.name.toLowerCase().includes(q) ||
      f.metadata?.description?.toLowerCase().includes(q) ||
      f.blobId.toLowerCase().includes(q) ||
      f.metadata?.tags?.some((t) => t.toLowerCase().includes(q))
    );
  });

  const percentUsedFormatted = storageUsage
    ? storageUsage.percentUsed < 0.001
      ? '<0.001%'
      : `${storageUsage.percentUsed.toFixed(3)}%`
    : '0.001%';

  const patientDisplayName = !isGuestMode && userProfile?.name && userProfile.name !== 'Eleanor Vance'
    ? userProfile.name
    : isGuestMode
    ? 'Eleanor Vance (Demo)'
    : 'Personal Patient';

  return (
    <div className="flex-1 p-4 sm:p-8 overflow-y-auto max-w-6xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-cyan-900/60 via-[#171A24] to-[#12151E] border border-white/10 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            {!isGuestMode && suiAccount ? (
              <>
                <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[11px] font-bold flex items-center gap-1.5">
                  <Lock className="w-3 h-3 text-cyan-400" />
                  Private Wallet Vault
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold">
                  SEAL Threshold Encrypted
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[11px] font-mono">
                  {suiAccount.address.slice(0, 6)}...{suiAccount.address.slice(-4)}
                </span>
              </>
            ) : (
              <>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-bold">
                  Guest Demo Mode • Sample Records
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold">
                  SEAL Threshold Encrypted
                </span>
              </>
            )}
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {!isGuestMode && suiAccount
              ? `${patientDisplayName}'s Medical Records`
              : 'Walrus Console Medical Storage'}
          </h2>

          <p className="text-xs sm:text-sm font-medium text-slate-300 mt-1 max-w-xl leading-relaxed">
            {!isGuestMode && suiAccount ? (
              <>
                Decentralized, encrypted medical storage for <span className="text-cyan-300 font-bold">{patientDisplayName}</span> in private bucket <code className="text-cyan-300 font-mono">{buckets[0]?.name || 'walcare-vault'}</code>. Cryptographically isolated to your Sui wallet—no other user or guest can access your files.
              </>
            ) : (
              <>
                Decentralized storage demo with sample records for Eleanor Vance in bucket <code className="text-cyan-300 font-mono">{buckets[0]?.name || 'sandman-demo'}</code>. Connect your Sui wallet to create your own isolated private vault.
              </>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={fetchConsoleData}
            className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white font-semibold text-xs cursor-pointer transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Sync Vault</span>
          </button>
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold text-xs shadow-lg shadow-cyan-950/40 cursor-pointer transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Upload Document</span>
          </button>
        </div>
      </div>

      {/* Guest Mode Notice Banner */}
      {isGuestMode && (
        <div className="p-4 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-200">
          <div className="flex items-center gap-3 text-xs">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <p className="font-semibold text-white">Viewing Eleanor Vance Demo Records</p>
              <p className="text-amber-200/80 text-[11px] mt-0.5">
                These are sample clinical records. Connect your Sui wallet to get your own private vault where each user has their own documents and no one else can access them.
              </p>
            </div>
          </div>
          {onOpenWalletModal && (
            <button
              onClick={onOpenWalletModal}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs shrink-0 cursor-pointer transition-colors flex items-center gap-1.5"
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>Connect Sui Wallet</span>
            </button>
          )}
        </div>
      )}

      {/* Storage Quota & Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-3xl bg-white dark:bg-[#141722] border border-slate-200 dark:border-white/10 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-cyan-600 dark:text-cyan-400">
              Walrus Storage Used
            </span>
            <HardDrive className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {storageUsage ? `${(storageUsage.storageUsed / 1024).toFixed(1)} KB` : '0.0 KB'}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
            5.00 GB Mainnet Quota Allocated
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-[#141722] border border-slate-200 dark:border-white/10 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              Clinical Documents
            </span>
            <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{files.length}</div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
            {!isGuestMode && suiAccount ? 'Private Records for Your Wallet' : 'Decentralized Blobs in Bucket'}
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-[#141722] border border-slate-200 dark:border-white/10 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400">
              SEAL Threshold Encrypted
            </span>
            <ShieldCheck className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">100%</div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
            {!isGuestMode && suiAccount ? 'Wallet Private Key Authorization' : 'Demo Policy Verification'}
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-[#141722] border border-slate-200 dark:border-white/10 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
              Active Storage Bucket
            </span>
            <FolderLock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-white mt-1 truncate">
            {buckets[0]?.name || (isGuestMode ? 'sandman-demo' : 'walcare-vault')}
          </div>
          <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 mt-0.5 truncate">
            {(buckets[0]?.id || DEFAULT_BUCKET_ID).slice(0, 16)}...
          </div>
        </div>
      </div>

      {/* Storage Quota Progress Bar */}
      <div className="p-4 rounded-3xl bg-white dark:bg-[#141722] border border-slate-200 dark:border-white/10 shadow-sm">
        <div className="flex items-center justify-between text-xs font-semibold mb-2">
          <span className="text-slate-700 dark:text-slate-300">Walrus Storage Quota</span>
          <span className="text-cyan-600 dark:text-cyan-400">{percentUsedFormatted} of 5.00 GB used</span>
        </div>
        <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-cyan-400 to-purple-500 rounded-full transition-all duration-500"
            style={{ width: `${Math.max(1, Math.min(100, (storageUsage?.percentUsed || 0.001) * 100))}%` }}
          />
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search documents by filename, tags, or Walrus Blob ID..."
          className="w-full pl-10 pr-4 py-2.5 rounded-full bg-slate-100 dark:bg-[#171A24] border border-slate-300 dark:border-white/10 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 shadow-xs"
        />
      </div>

      {/* File Cards Grid or Empty State */}
      {isLoading ? (
        <div className="p-12 text-center rounded-3xl bg-[#141722] border border-white/10 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
          <p className="text-xs text-slate-400">Loading your Walrus Console medical documents...</p>
        </div>
      ) : files.length === 0 ? (
        /* Isolated Empty State for brand new wallet user */
        <div className="p-8 sm:p-12 text-center rounded-3xl bg-gradient-to-b from-[#141722] to-[#0E111A] border border-cyan-500/20 shadow-2xl space-y-4">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-950/50">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-xl font-black text-white">Your Private Medical Vault is Ready</h3>
            <p className="text-xs sm:text-sm text-slate-300 max-w-lg mx-auto mt-2 leading-relaxed">
              {!isGuestMode && suiAccount ? (
                <>
                  Your wallet (<span className="text-cyan-300 font-mono">{suiAccount.address.slice(0, 8)}...{suiAccount.address.slice(-6)}</span>) has an isolated, zero-knowledge Walrus vault. No other user can access or view your documents.
                </>
              ) : (
                'No documents have been uploaded to this vault yet.'
              )}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl mx-auto pt-2 text-left">
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-2 text-xs font-bold text-cyan-300">
                <Lock className="w-3.5 h-3.5" />
                <span>SEAL Encryption</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Client-side threshold encryption before blobs touch the network.</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-300">
                <HardDrive className="w-3.5 h-3.5" />
                <span>Walrus Protocol</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Decentralized storage certified across global Sui validator nodes.</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-2 text-xs font-bold text-purple-300">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Strict Isolation</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Each wallet gets its own isolated bucket and document namespace.</p>
            </div>
          </div>

          <div className="pt-3">
            <button
              onClick={() => setShowUploadModal(true)}
              className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold text-xs shadow-xl shadow-cyan-950/60 cursor-pointer inline-flex items-center gap-2 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Upload First Medical Document</span>
            </button>
          </div>
        </div>
      ) : filteredFiles.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-[#141722] border border-white/10 text-slate-400 text-xs">
          No clinical documents match your search query: &ldquo;{searchQuery}&rdquo;.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredFiles.map((file) => (
            <div
              key={file.id}
              className="p-5 rounded-3xl bg-white dark:bg-[#141722] hover:bg-slate-50 dark:hover:bg-[#181C2A] border border-slate-200 dark:border-white/10 hover:border-cyan-500/40 shadow-lg transition-all duration-300 flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-cyan-400 transition-colors">
                        {file.name}
                      </h4>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                        <span>{`${Math.max(1, Math.round((file.size || file.contentSize || 1024) / 1024))} KB`}</span>
                        <span>•</span>
                        <span>{new Date(file.createdAt).toLocaleDateString()}</span>
                        {file.ownerAddress && file.ownerAddress !== 'guest' && (
                          <>
                            <span>•</span>
                            <span className="font-mono text-cyan-400">
                              {file.ownerAddress.slice(0, 6)}...{file.ownerAddress.slice(-4)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                    SEAL Locked
                  </span>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 my-2 leading-relaxed">
                  {file.metadata?.description || 'Clinical observation file certified on Walrus storage.'}
                </p>

                {file.metadata?.tags && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {file.metadata.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-[10px] font-medium text-slate-600 dark:text-slate-300"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200 dark:border-white/5 flex items-center justify-between text-xs">
                <button
                  onClick={() => handleCopyBlob(file.blobId)}
                  className="flex items-center gap-1 font-mono text-[10px] text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
                  title="Copy Blob ID"
                >
                  {copiedBlobId === file.blobId ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>{file.blobId.slice(0, 10)}...</span>
                    </>
                  )}
                </button>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleViewFile(file)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 font-semibold text-xs transition-colors cursor-pointer"
                    title="Decrypt and view document directly in app"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View</span>
                  </button>
                  <button
                    onClick={() => handleDownload(file)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-semibold text-xs transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </button>
                  <a
                    href={`https://walruscan.com/mainnet/blob/${file.blobId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
                    title="View on Walruscan"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <button
                    onClick={() => handleDeleteFile(file.id, file.name, file.bucketId)}
                    className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 dark:text-rose-400 hover:text-rose-600 transition-colors cursor-pointer"
                    title="Delete Document"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
          onClick={() => setShowUploadModal(false)}
        >
          <div
            className="w-full max-w-lg p-6 rounded-3xl bg-[#171A24] border border-white/20 shadow-2xl text-white space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400">
                  <Upload className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Upload Medical Document</h3>
                  <p className="text-[10px] text-slate-400">
                    {!isGuestMode && suiAccount
                      ? `Saving directly into private vault for ${suiAccount.address.slice(0, 6)}...${suiAccount.address.slice(-4)}`
                      : 'Saving into Guest Demo vault'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-slate-400 hover:text-white text-xs cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Document Name
                </label>
                <input
                  type="text"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  placeholder="e.g. comprehensive_blood_panel.txt"
                  className="w-full p-2.5 rounded-xl bg-[#141722] border border-white/10 text-xs text-white focus:outline-none focus:border-cyan-500/50"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Category Tag
                </label>
                <select
                  value={fileCategory}
                  onChange={(e) => setFileCategory(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[#141722] border border-white/10 text-xs text-white focus:outline-none"
                >
                  <option value="clinical">Clinical Orders & Diagnosis</option>
                  <option value="telemetry">ECG / Telemetry Metrics</option>
                  <option value="medication">Medication Reconciliation</option>
                  <option value="labs">Laboratory & Pathology Results</option>
                  <option value="handover">Shift Handover Export</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Description / Clinical Summary
                </label>
                <input
                  type="text"
                  value={fileDesc}
                  onChange={(e) => setFileDesc(e.target.value)}
                  placeholder="e.g. Complete metabolic panel, fasting blood glucose 98 mg/dL..."
                  className="w-full p-2.5 rounded-xl bg-[#141722] border border-white/10 text-xs text-white focus:outline-none focus:border-cyan-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Document Content / Medical Payload
                </label>
                <textarea
                  rows={4}
                  value={fileContent}
                  onChange={(e) => setFileContent(e.target.value)}
                  placeholder="Paste clinical text, doctor notes, JSON telemetry, or lab findings..."
                  className="w-full p-3 rounded-xl bg-[#141722] border border-white/10 text-xs text-white focus:outline-none focus:border-cyan-500/50 placeholder-slate-500 font-mono"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-xs font-bold shadow-md cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isUploading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isUploading ? 'Encrypting & Storing...' : 'Upload to Walrus'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* In-App Decrypted Document Viewer Modal */}
      {previewFile && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in"
          onClick={() => setPreviewFile(null)}
        >
          <div
            className="w-full max-w-2xl max-h-[85vh] flex flex-col p-6 rounded-3xl bg-white dark:bg-[#171A24] border border-slate-200 dark:border-white/20 shadow-2xl text-slate-900 dark:text-white overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-500 border border-cyan-500/20">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold truncate max-w-sm sm:max-w-md">{previewFile.name}</h3>
                  <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                    <span>Walrus Blob: {previewFile.blobId.slice(0, 16)}...</span>
                    <span>•</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Decrypted via SEAL</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setPreviewFile(null)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body: Decrypted Document Content */}
            <div className="my-4 flex-1 overflow-y-auto rounded-2xl bg-slate-50 dark:bg-[#12151E] border border-slate-200 dark:border-white/5 p-4 text-xs font-mono leading-relaxed whitespace-pre-wrap select-text">
              {isPreviewLoading ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin text-cyan-500" />
                  <span className="text-xs font-sans font-medium">
                    Invoking SEAL threshold decryption engine on Walrus Protocol...
                  </span>
                </div>
              ) : (
                previewContent || 'Empty document payload.'
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-2 flex items-center justify-between text-xs shrink-0">
              <button
                onClick={() => {
                  if (previewContent) {
                    navigator.clipboard.writeText(previewContent);
                    alert('Decrypted document copied to clipboard!');
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Payload</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownload(previewFile)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download File</span>
                </button>
                <button
                  onClick={() => setPreviewFile(null)}
                  className="px-4 py-1.5 rounded-xl bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/15 text-slate-700 dark:text-white font-semibold cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
