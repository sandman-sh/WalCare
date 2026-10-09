'use client';

import React, { useState, useEffect } from 'react';
import {
  ClipboardCheck,
  AlertTriangle,
  Activity,
  Pill,
  Footprints,
  Copy,
  Check,
  RefreshCw,
  FolderLock,
  Upload,
  Sparkles,
} from 'lucide-react';
import { HandoverSummary, UserProfile } from '@/types/carecircle';
import { SuiAccount } from './WalletModal';
import { DEFAULT_BUCKET_ID } from '@/lib/consoleConfig';
import { PATIENT_PROFILE } from '@/lib/seedData';

interface HandoverViewProps {
  suiAccount?: SuiAccount | null;
  isGuestMode?: boolean;
  userProfile?: UserProfile | null;
}

export function HandoverView({
  suiAccount,
  isGuestMode = true,
  userProfile,
}: HandoverViewProps = {}) {
  const [handover, setHandover] = useState<HandoverSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isSavingToConsole, setIsSavingToConsole] = useState(false);
  const [savedConsoleFileId, setSavedConsoleFileId] = useState<string | null>(null);

  const fetchHandover = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/handover');
      if (res.ok) {
        const data = await res.json();
        setHandover(data.handover);
      }
    } catch (err) {
      console.error('Error fetching handover report:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHandover();
  }, []);

  const handleCopy = () => {
    if (!handover) return;
    const text = `=== WALCARE CLINICAL SHIFT HANDOVER ===
Patient: ${PATIENT_PROFILE.name} (Age ${PATIENT_PROFILE.age})
Date: ${handover.date}
Total Walrus Blobs Consulted: ${handover.totalBlobsConsulted}

VITALS SUMMARY:
${handover.vitalsSummary}

MEDICATION & ALLERGY ALERTS:
${handover.medicationAlerts.map((m) => `• ${m}`).join('\n')}

MOBILITY & REHABILITATION:
${handover.mobilityNotes.map((m) => `• ${m}`).join('\n')}

PENDING ACTIONS:
${handover.pendingActions.map((m) => `[ ] ${m}`).join('\n')}
=========================================`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveToConsole = async () => {
    if (!handover || isSavingToConsole) return;
    setIsSavingToConsole(true);
    try {
      const content = `WALCARE CLINICAL SHIFT HANDOVER REPORT
Generated on Walrus Protocol: ${new Date().toISOString()}
Patient: ${PATIENT_PROFILE.name} (Age ${PATIENT_PROFILE.age})
Status: ${handover.overallStatus.toUpperCase()}

1. VITALS SUMMARY:
${handover.vitalsSummary}

2. MEDICATION WATCHLIST & CONTRAINDICATIONS:
${handover.medicationAlerts.map((m) => `- ${m}`).join('\n')}

3. MOBILITY & PHYSICAL THERAPY:
${handover.mobilityNotes.map((m) => `- ${m}`).join('\n')}

4. NEXT SHIFT ACTION ITEMS:
${handover.pendingActions.map((m) => `[ ] ${m}`).join('\n')}

Certified Walrus Blobs Consulted: ${handover.totalBlobsConsulted}`;

      const res = await fetch('/api/console', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'upload',
          walletAddress: suiAccount?.address || null,
          isGuest: isGuestMode,
          file: {
            name: `handover_report_${handover.date}.txt`,
            content,
            description: `Auto-generated multi-caregiver handover briefing for ${userProfile?.name || PATIENT_PROFILE.name}`,
            tags: ['handover', 'clinical', 'briefing', 'walcare'],
            bucketId: DEFAULT_BUCKET_ID,
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSavedConsoleFileId(data.file?.blobId || 'confirmed');
        setTimeout(() => setSavedConsoleFileId(null), 4000);
      }
    } catch (err) {
      console.error('Failed to commit handover to Walrus Console:', err);
    } finally {
      setIsSavingToConsole(false);
    }
  };

  return (
    <div className="flex-1 p-4 sm:p-8 overflow-y-auto max-w-5xl mx-auto space-y-6">
      {/* Header Card */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-purple-900/60 via-purple-950 to-[#12151E] border border-white/10 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[11px] font-bold">
              Shift Handover Briefing
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold">
              Walrus Certified
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Automated Cross-Caregiver Briefing
          </h2>
          <p className="text-xs sm:text-sm font-medium text-slate-300 mt-1">
            Synthesized from Walrus Memory across Daughter, Visiting Nurse, and Physical Therapist.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={fetchHandover}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white font-semibold text-xs cursor-pointer transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Regenerate</span>
          </button>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white font-semibold text-xs cursor-pointer transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy Text'}</span>
          </button>
          <button
            onClick={handleSaveToConsole}
            disabled={isSavingToConsole}
            className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold text-xs shadow-lg shadow-cyan-950/40 cursor-pointer transition-all disabled:opacity-50"
          >
            <FolderLock className="w-3.5 h-3.5" />
            <span>{isSavingToConsole ? 'Sealing to Console...' : 'Save to Walrus Console'}</span>
          </button>
        </div>
      </div>

      {savedConsoleFileId && (
        <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2.5">
          <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>
            Handover report committed as encrypted document to Walrus Console (Blob: {savedConsoleFileId.slice(0, 16)}...)
          </span>
        </div>
      )}

      {isLoading || !handover ? (
        <div className="text-center py-12 text-slate-500 dark:text-slate-400 text-xs font-medium">
          Synthesizing shift records across Walrus namespaces...
        </div>
      ) : (
        <div className="space-y-4">
          {/* Patient Header Banner */}
          <div className="p-4 rounded-3xl bg-white dark:bg-[#141722] border border-slate-200 dark:border-white/10 shadow-lg flex flex-wrap items-center justify-between gap-3 text-xs">
            <div>
              <span className="text-slate-500 dark:text-slate-400">Patient:</span>{' '}
              <strong className="text-slate-900 dark:text-white text-sm">{PATIENT_PROFILE.name}</strong>{' '}
              <span className="text-slate-500 dark:text-slate-400">({PATIENT_PROFILE.age}yo)</span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400">Report Date:</span>{' '}
              <span className="font-mono text-purple-700 dark:text-purple-300 font-bold">{handover.date}</span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400">Walrus Blobs Consulted:</span>{' '}
              <span className="px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30 font-mono text-[11px] font-bold">
                {handover.totalBlobsConsulted} On-Chain Blobs
              </span>
            </div>
          </div>

          {/* 1. Vitals Summary Card */}
          <div className="p-5 rounded-3xl bg-white dark:bg-[#141722] border border-slate-200 dark:border-white/10 shadow-lg space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-600 dark:text-amber-300">
              <Activity className="w-4 h-4 text-amber-500 dark:text-amber-400" />
              <span>Vitals & Telemetry Summary</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
              {handover.vitalsSummary}
            </p>
          </div>

          {/* 2. Medication & Critical Contraindications Card */}
          <div className="p-5 rounded-3xl bg-white dark:bg-[#141722] border border-rose-500/30 shadow-lg space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-rose-600 dark:text-rose-300">
              <Pill className="w-4 h-4 text-rose-500 dark:text-rose-400" />
              <span>Medication Alerts & Safety Contraindications</span>
            </div>
            <ul className="space-y-2 text-xs text-slate-800 dark:text-slate-200">
              {handover.medicationAlerts.map((alert, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2 p-2.5 rounded-2xl bg-rose-500/10 dark:bg-rose-950/40 border border-rose-500/20 font-medium text-rose-900 dark:text-rose-100"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400 shrink-0 mt-0.5" />
                  <span>{alert}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* 3. Mobility & Gait Progress */}
          <div className="p-5 rounded-3xl bg-white dark:bg-[#141722] border border-slate-200 dark:border-white/10 shadow-lg space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-cyan-600 dark:text-cyan-300">
              <Footprints className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />
              <span>Physical Therapy & Fall Prevention (David Chen DPT)</span>
            </div>
            <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-200">
              {handover.mobilityNotes.map((note, idx) => (
                <li key={idx} className="flex items-start gap-2 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 dark:bg-cyan-400 shrink-0 mt-1.5" />
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* 4. Next Shift Pending Actions Checklist */}
          <div className="p-5 rounded-3xl bg-white dark:bg-[#141722] border border-slate-200 dark:border-white/10 shadow-lg space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-300">
              <ClipboardCheck className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
              <span>Action Items for Upcoming Caregiver</span>
            </div>
            <div className="space-y-2">
              {handover.pendingActions.map((action, idx) => (
                <label
                  key={idx}
                  className="flex items-start gap-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs text-slate-800 dark:text-slate-200 font-medium hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <input
                    type="checkbox"
                    className="mt-0.5 rounded bg-slate-200 dark:bg-white/10 border-slate-300 dark:border-white/20 text-emerald-600 focus:ring-0"
                  />
                  <span>{action}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
