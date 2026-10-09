'use client';

import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { WalrusConsoleFile, WalrusConsoleBucket, WalrusConsoleStorageUsage } from '@/types/carecircle';
import { DEFAULT_BUCKET_ID, DEFAULT_SEAL_POLICY } from '@/lib/consoleConfig';

export function ConsoleVault() {
  const [files, setFiles] = useState<WalrusConsoleFile[]>([]);
  const [storageUsage, setStorageUsage] = useState<WalrusConsoleStorageUsage | null>(null);
  const [buckets, setBuckets] = useState<WalrusConsoleBucket[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [copiedBlobId, setCopiedBlobId] = useState<string | null>(null);

  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [fileName, setFileName] = useState('');
  const [fileContent, setFileContent] = useState('');
  const [fileDesc, setFileDesc] = useState('');
  const [fileCategory, setFileCategory] = useState('clinical');
  const [isUploading, setIsUploading] = useState(false);

  const fetchConsoleData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/console');
      if (res.ok) {
        const data = await res.json();
        setFiles(data.files || []);
        setBuckets(data.buckets || []);
        setStorageUsage(data.storageUsage || null);
      }
    } catch (err) {
      console.error('Error loading Walrus Console files:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConsoleData();
  }, []);

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
      const res = await fetch('/api/console', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'upload',
          file: {
            name: fileName.endsWith('.txt') || fileName.endsWith('.json') || fileName.endsWith('.pdf')
              ? fileName
              : `${fileName}.txt`,
            content: fileContent,
            description: fileDesc,
            tags: [fileCategory, 'patient', 'carecircle'],
            bucketId: DEFAULT_BUCKET_ID,
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

  const handleDownload = async (file: WalrusConsoleFile) => {
    try {
      const res = await fetch(`/api/console?action=download&id=${file.id}&bucketId=${file.bucketId}`);
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
    } catch (err) {
      console.error('Failed to download decrypted file:', err);
    }
  };

  const handleDeleteFile = async (fileId: string, fileName: string) => {
    if (!confirm(`Delete "${fileName}" permanently from Walrus Console?`)) return;
    try {
      const res = await fetch('/api/console', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id: fileId, bucketId: DEFAULT_BUCKET_ID }),
      });
      if (res.ok) {
        await fetchConsoleData();
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

  return (
    <div className="flex-1 p-4 sm:p-8 overflow-y-auto max-w-6xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-cyan-900/60 via-[#171A24] to-[#12151E] border border-white/10 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[11px] font-bold">
              Walrus Console API • Live Mainnet
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold">
              SEAL Threshold Encrypted
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Walrus Console Medical Storage
          </h2>
          <p className="text-xs sm:text-sm font-medium text-slate-300 mt-1 max-w-xl">
            Decentralized storage for Eleanor Vance&apos;s clinical records, ECG telemetry, lab metrics, and shift reports in bucket <code className="text-cyan-300 font-mono">{buckets[0]?.name || 'sandman'}</code>.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchConsoleData}
            className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white font-semibold text-xs cursor-pointer transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Sync Bucket</span>
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
            {storageUsage ? `${(storageUsage.storageUsed / 1024).toFixed(1)} KB` : '7.2 KB'}
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
            Decentralized Blobs in Bucket
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
            Private Patient Access Policy
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
            {buckets[0]?.name || 'sandman'}
          </div>
          <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 mt-0.5 truncate">
            {(buckets[0]?.id || DEFAULT_BUCKET_ID).slice(0, 12)}...
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

      {/* File Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {isLoading ? (
          <div className="col-span-2 text-center py-12 text-slate-500 dark:text-slate-400 text-xs">
            Connecting to Walrus Console storage API...
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="col-span-2 text-center py-12 text-slate-500 dark:text-slate-400 text-xs">
            No clinical documents match your search.
          </div>
        ) : (
          filteredFiles.map((file) => (
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
                      <h4 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                        {file.name}
                      </h4>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                        <span>{`${Math.max(1, Math.round((file.size || file.contentSize || 1024) / 1024))} KB`}</span>
                        <span>•</span>
                        <span>{new Date(file.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                    SEAL Locked
                  </span>
                </div>

                <p className="text-xs text-slate-300 my-2 leading-relaxed">
                  {file.metadata?.description || 'Clinical observation file certified on Walrus storage.'}
                </p>

                {file.metadata?.tags && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {file.metadata.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-medium text-slate-300"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs">
                <button
                  onClick={() => handleCopyBlob(file.blobId)}
                  className="flex items-center gap-1 font-mono text-[10px] text-slate-400 hover:text-white transition-colors cursor-pointer"
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

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDownload(file)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white font-semibold text-xs transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </button>
                  <a
                    href={`https://walruscan.com/mainnet/blob/${file.blobId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                    title="View on Walruscan"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <button
                    onClick={() => handleDeleteFile(file.id, file.name)}
                    className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
                    title="Delete Document"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

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
              <h3 className="text-lg font-bold">Upload Document to Walrus Console</h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-slate-400 hover:text-white text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  File Name
                </label>
                <input
                  type="text"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  placeholder="e.g. eleanor_ecg_rhythm_strip.txt"
                  className="w-full p-2.5 rounded-xl bg-[#141722] border border-white/10 text-xs text-white focus:outline-none"
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
                  placeholder="Summary of document findings..."
                  className="w-full p-2.5 rounded-xl bg-[#141722] border border-white/10 text-xs text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  File Content / Payload
                </label>
                <textarea
                  rows={4}
                  value={fileContent}
                  onChange={(e) => setFileContent(e.target.value)}
                  placeholder="Paste clinical text, JSON payload, or lab report metrics..."
                  className="w-full p-3 rounded-xl bg-[#141722] border border-white/10 text-xs text-white focus:outline-none placeholder-slate-500 font-mono"
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
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-xs font-bold shadow-md cursor-pointer disabled:opacity-50"
                >
                  {isUploading ? 'Encrypting & Storing...' : 'Upload to Walrus'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
