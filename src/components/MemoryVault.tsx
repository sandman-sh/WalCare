'use client';

import React, { useState, useEffect } from 'react';
import {
  Database,
  Search,
  ExternalLink,
  ShieldAlert,
  RefreshCw,
  Plus,
  Clock,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { WalrusMemoryItem, MemoryCategory } from '@/types/carecircle';
import { CAREGIVERS, PATIENT_PROFILE } from '@/lib/seedData';

interface MemoryVaultProps {
  onRefreshMemories: () => void;
}

export function MemoryVault({ onRefreshMemories }: MemoryVaultProps) {
  const [memories, setMemories] = useState<WalrusMemoryItem[]>([]);
  const [filteredMemories, setFilteredMemories] = useState<WalrusMemoryItem[]>([]);
  const [activeFilter, setActiveFilter] = useState<'all' | 'daughter' | 'nurse' | 'physio' | 'physician' | 'critical'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 30,
    byCaregiver: { daughter_sarah: 10, nurse_elena: 10, physio_david: 10, dr_adams: 0 },
    namespace: 'carecircle-eleanor-88',
    suiObjectId: '0xd7ec125eb467c0cce65b219ff7ddeea217c16709077c2c48c183e47e80704287',
  });

  const [showAddModal, setShowAddModal] = useState(false);
  const [newText, setNewText] = useState('');
  const [newAuthor, setNewAuthor] = useState('daughter_sarah');
  const [newCategory, setNewCategory] = useState<MemoryCategory>('vitals');
  const [newIsCritical, setNewIsCritical] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchMemories = async (query = '') => {
    setIsLoading(true);
    try {
      const url = query ? `/api/memory?q=${encodeURIComponent(query)}` : '/api/memory';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setMemories(data.memories || []);
        if (data.stats) setStats(data.stats);
      }
    } catch (err) {
      console.error('Error loading vault memories:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMemories();
  }, []);

  useEffect(() => {
    let result = [...memories];

    if (activeFilter === 'daughter') {
      result = result.filter((m) => m.authorId === 'daughter_sarah');
    } else if (activeFilter === 'nurse') {
      result = result.filter((m) => m.authorId === 'nurse_elena');
    } else if (activeFilter === 'physio') {
      result = result.filter((m) => m.authorId === 'physio_david');
    } else if (activeFilter === 'physician') {
      result = result.filter((m) => m.authorId === 'dr_adams');
    } else if (activeFilter === 'critical') {
      result = result.filter((m) => m.isSafetyCritical);
    }

    setFilteredMemories(result);
  }, [memories, activeFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchMemories(searchQuery);
  };

  const handleCreateMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: newText,
          authorId: newAuthor,
          category: newCategory,
          isSafetyCritical: newIsCritical,
        }),
      });

      if (res.ok) {
        setNewText('');
        setShowAddModal(false);
        await fetchMemories();
        onRefreshMemories();
      }
    } catch (err) {
      console.error('Failed to commit memory to Walrus:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 p-4 sm:p-8 overflow-y-auto max-w-6xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-purple-900/60 via-[#171A24] to-[#12151E] border border-white/10 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[11px] font-bold">
              MemWal SDK v0.1.8
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold">
              Sui Mainnet Relayer
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Walrus Decentralized Memory Vault
          </h2>
          <p className="text-xs sm:text-sm font-medium text-slate-300 mt-1">
            Verifiable on-chain clinical memory for patient{' '}
            <strong className="text-purple-300">{PATIENT_PROFILE.name}</strong> (88yo)
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchMemories()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white font-semibold text-xs cursor-pointer transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Sync Blobs</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-gradient-to-r from-rose-500 to-purple-600 hover:from-rose-600 hover:to-purple-700 text-white font-bold text-xs shadow-lg shadow-purple-950/40 cursor-pointer transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Observation</span>
          </button>
        </div>
      </div>

      {/* Protocol Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-3xl bg-white dark:bg-[#141722] border border-slate-200 dark:border-white/10 shadow-lg">
          <div className="text-[11px] font-semibold text-purple-600 dark:text-purple-400">Total Memories</div>
          <div className="text-3xl font-black text-slate-900 dark:text-white mt-1">{stats.total}</div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Walrus Blobs Certified</div>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-[#141722] border border-slate-200 dark:border-white/10 shadow-lg">
          <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">Sarah (Daughter)</div>
          <div className="text-3xl font-black text-slate-900 dark:text-white mt-1">
            {stats.byCaregiver.daughter_sarah}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Morning Vitals & Mood</div>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-[#141722] border border-slate-200 dark:border-white/10 shadow-lg">
          <div className="text-[11px] font-semibold text-cyan-600 dark:text-cyan-400">Elena (Nurse RN)</div>
          <div className="text-3xl font-black text-slate-900 dark:text-white mt-1">
            {stats.byCaregiver.nurse_elena}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Clinical Meds & Wound</div>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-[#141722] border border-slate-200 dark:border-white/10 shadow-lg">
          <div className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">David (Physio DPT)</div>
          <div className="text-3xl font-black text-slate-900 dark:text-white mt-1">
            {stats.byCaregiver.physio_david}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Gait & TUG Scores</div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Semantic Search Bar */}
        <form onSubmit={handleSearch} className="flex-1 max-w-md relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Walrus memories (e.g. 'blood pressure', 'dizzy', 'ibuprofen')..."
            className="w-full pl-10 pr-4 py-2.5 rounded-full bg-slate-100 dark:bg-[#171A24] border border-slate-300 dark:border-white/10 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 shadow-xs"
          />
        </form>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {(
            [
              { id: 'all', label: 'All Blobs (Multiplayer)' },
              { id: 'daughter', label: 'Sarah (Family)' },
              { id: 'nurse', label: 'Elena (Nurse RN)' },
              { id: 'physio', label: 'David (Physio)' },
              { id: 'physician', label: 'Dr. Adams (MD)' },
              { id: 'critical', label: 'Critical Flags' },
            ] as const
          ).map((f) => {
            const isSelected = activeFilter === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setActiveFilter(f.id)}
                className={`px-3 py-1 rounded-full text-xs font-semibold shrink-0 transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30 ring-1 ring-white/30'
                    : 'bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-white/5'
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Memories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {isLoading ? (
          <div className="col-span-2 text-center py-12 text-slate-500 dark:text-slate-400 text-xs">
            Querying Sui Mainnet & Walrus Memory relayer...
          </div>
        ) : filteredMemories.length === 0 ? (
          <div className="col-span-2 text-center py-12 text-slate-500 dark:text-slate-400 text-xs">
            No memories match the filter query.
          </div>
        ) : (
          filteredMemories.map((mem) => {
            return (
              <div
                key={mem.id}
                className="p-5 rounded-3xl bg-white dark:bg-[#141722] hover:bg-slate-50 dark:hover:bg-[#181C2A] border border-slate-200 dark:border-white/10 hover:border-purple-500/40 shadow-lg transition-all duration-300 flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-purple-500/10 dark:bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-600 dark:text-purple-300">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white">
                          {mem.authorName}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                          {mem.authorRole.toUpperCase()}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {mem.isSafetyCritical && (
                        <span className="px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30 text-[10px] font-bold flex items-center gap-1">
                          <ShieldAlert className="w-3 h-3 text-rose-500 dark:text-rose-400" />
                          Critical Flag
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10 text-[10px] font-medium capitalize">
                        {mem.category}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 mt-2 font-medium leading-relaxed">
                    &ldquo;{mem.text}&rdquo;
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-[10px] font-mono text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-1 text-slate-500">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(mem.timestamp).toLocaleDateString()}</span>
                  </div>

                  <a
                    href={`https://walruscan.com/mainnet/blob/${mem.blobId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-semibold underline"
                  >
                    <span>Blob {mem.blobId.slice(0, 8)}...</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Observation Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="w-full max-w-lg p-6 rounded-3xl bg-white dark:bg-[#171A24] border border-slate-200 dark:border-white/20 shadow-2xl text-slate-900 dark:text-white space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-lg font-bold">Write Observation to Walrus Memory</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateMemory} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Caregiver Persona
                </label>
                <select
                  value={newAuthor}
                  onChange={(e) => setNewAuthor(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-[#141722] border border-slate-300 dark:border-white/10 text-xs text-slate-900 dark:text-white focus:outline-none"
                >
                  <option value="daughter_sarah">Sarah Miller (Daughter / Family Caregiver)</option>
                  <option value="nurse_elena">Elena Rostova, RN (Registered Nurse)</option>
                  <option value="physio_david">David Chen, DPT (Physical Therapist)</option>
                  <option value="dr_adams">Dr. Robert Adams, MD (Attending Physician)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Category
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as MemoryCategory)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-[#141722] border border-slate-300 dark:border-white/10 text-xs text-slate-900 dark:text-white focus:outline-none"
                >
                  <option value="vitals">Vitals (BP, HR, SpO2)</option>
                  <option value="medication">Medication & Administration</option>
                  <option value="symptom">Symptom Observation</option>
                  <option value="diet">Diet & Hydration</option>
                  <option value="mobility">Mobility & Fall Risk</option>
                  <option value="general">General Note</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Clinical Observation
                </label>
                <textarea
                  rows={3}
                  value={newText}
                  onChange={(e) => setNewText(e.target.value)}
                  placeholder="Record vitals, behavior, medication compliance, or physical status..."
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-[#141722] border border-slate-300 dark:border-white/10 text-xs text-slate-900 dark:text-white focus:outline-none placeholder-slate-400"
                  required
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="criticalCheck"
                  checked={newIsCritical}
                  onChange={(e) => setNewIsCritical(e.target.checked)}
                  className="rounded bg-slate-200 dark:bg-white/10 border-slate-300 dark:border-white/20 text-purple-600 focus:ring-0"
                />
                <label htmlFor="criticalCheck" className="text-xs text-slate-700 dark:text-slate-300 font-medium cursor-pointer">
                  Mark as Safety Critical (e.g. Allergy, Melena, Contraindication)
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 text-slate-700 dark:text-white text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-purple-600 hover:from-rose-600 hover:to-purple-700 text-white text-xs font-bold shadow-md cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Committing Blob...' : 'Commit to Sui Mainnet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
