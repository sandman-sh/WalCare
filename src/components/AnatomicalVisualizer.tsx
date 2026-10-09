'use client';

import React, { useState, useEffect } from 'react';
import {
  Heart,
  Activity,
  AlertTriangle,
  Brain,
  Eye,
  ShieldCheck,
  Sparkles,
  Wind,
  Footprints,
  X,
  ChevronUp,
  ChevronDown,
  Info,
} from 'lucide-react';
import { HumanModel3DCanvas } from './HumanModel3DCanvas';
import { useTheme } from './ThemeProvider';

export type OrganType = 'heart' | 'brain' | 'stomach' | 'lungs' | 'eyes' | 'mobility' | 'skin';

interface AnatomicalVisualizerProps {
  selectedOrgan: OrganType;
  onSelectOrgan: (organ: OrganType) => void;
  onQuickAskAI: (prompt: string) => void;
  heartRate?: number;
}

const ORGAN_TABS = [
  { id: 'heart' as const, label: 'Heart', icon: Heart, color: 'text-rose-500' },
  { id: 'brain' as const, label: 'Brain', icon: Brain, color: 'text-purple-500' },
  { id: 'stomach' as const, label: 'Stomach', icon: AlertTriangle, color: 'text-amber-500' },
  { id: 'lungs' as const, label: 'Lungs', icon: Wind, color: 'text-cyan-500' },
  { id: 'eyes' as const, label: 'Eyes', icon: Eye, color: 'text-blue-500' },
  { id: 'mobility' as const, label: 'Mobility', icon: Footprints, color: 'text-emerald-500' },
] as const;

export function AnatomicalVisualizer({
  selectedOrgan,
  onSelectOrgan,
  onQuickAskAI,
  heartRate = 110,
}: AnatomicalVisualizerProps) {
  const { theme } = useTheme();
  const [activeHotspot, setActiveHotspot] = useState<OrganType>(selectedOrgan);
  const [isInspectorExpanded, setIsInspectorExpanded] = useState<boolean>(false);

  // Sync when parent changes selected organ
  useEffect(() => {
    setActiveHotspot(selectedOrgan);
  }, [selectedOrgan]);

  const handleHotspotClick = (organ: OrganType) => {
    setActiveHotspot(organ);
    onSelectOrgan(organ);
  };

  // Dynamic ECG speed based on real heart rate
  const ecgDurationSeconds = (60 / Math.max(40, Math.min(180, heartRate))).toFixed(2);

  // Quick summary texts for compact HUD bar
  const getQuickStatus = (organ: OrganType) => {
    switch (organ) {
      case 'heart':
        return `${heartRate} BPM • ${heartRate >= 100 ? 'Sinus Tachycardia' : 'Normal Sinus Rhythm'}`;
      case 'stomach':
        return 'Gastric Bleed History • Absolute Contraindication: NO NSAIDs';
      case 'lungs':
        return 'Bilateral Clear • SpO2 98% on Room Air';
      case 'brain':
        return 'Normotonic 4/5 Cognition • Memory Vault Synced';
      case 'eyes':
        return 'Bifocals Active • Hallway Lighting Protocol';
      case 'mobility':
        return 'Walker Required Outdoors • Fall Risk Precautions';
      case 'skin':
      default:
        return 'Braden Scale 19 • Low Pressure Risk';
    }
  };

  const getOrganPrompt = (organ: OrganType) => {
    switch (organ) {
      case 'heart':
        return `Analyze Eleanor’s telemetry heart rate of ${heartRate} bpm and AFib history from Walrus memory.`;
      case 'stomach':
        return 'Why is Ibuprofen contraindicated for Eleanor Vance based on her gastritis recorded in Walrus Memory?';
      case 'lungs':
        return 'Review Eleanor’s respiratory auscultation notes and verify no nocturnal dyspnea.';
      case 'brain':
        return 'Summarize Eleanor’s cognitive baseline and memory orientation from the latest caregiver notes.';
      case 'eyes':
        return 'What are the environmental fall prevention protocols for Eleanor Vance?';
      case 'mobility':
        return 'Explain David DPT’s gait transfer instructions for Eleanor Vance.';
      case 'skin':
      default:
        return 'Review skin integrity and barrier cream schedule for Eleanor Vance.';
    }
  };

  return (
    <div className="relative flex flex-col h-full rounded-3xl bg-white dark:bg-[#12151E] border border-slate-200/80 dark:border-white/10 p-4 sm:p-5 overflow-hidden shadow-xl transition-colors duration-300">
      {/* Ambient Radial Lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-rose-500/10 dark:bg-rose-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-72 h-72 bg-cyan-500/10 dark:bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* Top Controls: Organ Selector Pills with Crisp Icons */}
      <div className="relative z-10 flex items-center justify-between pb-2.5">
        <div className="flex items-center gap-1 sm:gap-1.5 p-1 bg-slate-100 dark:bg-white/5 rounded-full border border-slate-200 dark:border-white/10 overflow-x-auto scrollbar-none max-w-[calc(100%-120px)]">
          {ORGAN_TABS.map((item) => {
            const isActive = activeHotspot === item.id;
            const IconComp = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => handleHotspotClick(item.id)}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full transition-all duration-300 cursor-pointer shrink-0 ${
                  isActive
                    ? 'bg-gradient-to-r from-rose-500 to-purple-600 text-white shadow-md shadow-rose-500/25 ring-1 ring-white/20'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/40 dark:hover:bg-white/5'
                }`}
              >
                <IconComp className={`w-3.5 h-3.5 ${isActive ? 'text-white' : item.color}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
            <span>Interactive 3D</span>
          </span>
        </div>
      </div>

      {/* Main 3D Interactive Viewport with human-model.glb */}
      <div className="relative flex-1 flex items-center justify-center min-h-[420px] rounded-2xl overflow-hidden">
        {/* Three.js 3D WebGL Canvas Component */}
        <HumanModel3DCanvas
          selectedOrgan={activeHotspot}
          onSelectOrgan={handleHotspotClick}
          isDarkMode={theme === 'dark'}
        />

        {/* ========================================================================= */}
        {/* NON-OBSTRUCTIVE DOCKED CLINICAL TELEMETRY HUD */}
        {/* ========================================================================= */}

        {!isInspectorExpanded ? (
          /* COMPACT HUD BAR — Takes only 44px, NEVER obscures the 3D body! */
          <div className="absolute bottom-3 left-3 right-3 z-30 transition-all duration-300 pointer-events-auto">
            <div className="flex items-center justify-between p-2.5 sm:p-3 rounded-2xl bg-white/90 dark:bg-[#12151E]/90 backdrop-blur-xl border border-purple-500/30 shadow-xl text-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-rose-500/20 to-purple-500/20 border border-purple-500/30 flex items-center justify-center text-rose-500 shrink-0">
                  {activeHotspot === 'heart' && <Heart className="w-4 h-4 text-rose-500 fill-rose-500 animate-pulse" />}
                  {activeHotspot === 'brain' && <Brain className="w-4 h-4 text-purple-500" />}
                  {activeHotspot === 'stomach' && <AlertTriangle className="w-4 h-4 text-amber-500" />}
                  {activeHotspot === 'lungs' && <Wind className="w-4 h-4 text-cyan-500" />}
                  {activeHotspot === 'eyes' && <Eye className="w-4 h-4 text-blue-500" />}
                  {activeHotspot === 'mobility' && <Footprints className="w-4 h-4 text-emerald-500" />}
                  {activeHotspot === 'skin' && <ShieldCheck className="w-4 h-4 text-pink-500" />}
                </div>

                <div className="truncate">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-white capitalize">
                      {activeHotspot} Telemetry
                    </span>
                    <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                      Live
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {getQuickStatus(activeHotspot)}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 ml-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onQuickAskAI(getOrganPrompt(activeHotspot));
                  }}
                  className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md shadow-purple-600/20 cursor-pointer transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Query KIRO</span>
                </button>

                <button
                  onClick={() => setIsInspectorExpanded(true)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 text-slate-700 dark:text-slate-200 text-xs font-bold cursor-pointer transition-colors"
                  title="Expand Full Telemetry & Lab Data"
                >
                  <span className="hidden sm:inline">Details</span>
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* EXPANDED TELEMETRY PANEL — With Close/Minimize Button */
          <div className="absolute bottom-3 left-3 right-3 z-30 transition-all duration-300 pointer-events-auto">
            {/* 1. HEART CARDIAC TELEMETRY */}
            {activeHotspot === 'heart' && (
              <div className="p-3.5 rounded-2xl bg-white/95 dark:bg-[#12151E]/95 backdrop-blur-xl border border-rose-500/40 shadow-2xl">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-500">
                      <Heart className="w-4 h-4 fill-rose-500 animate-pulse" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">Cardiac Telemetry</span>
                        <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-300 border border-rose-500/30">
                          Live AFib
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onQuickAskAI(getOrganPrompt('heart'));
                      }}
                      className="px-2.5 py-1 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-700 dark:text-rose-300 text-xs font-bold transition-colors cursor-pointer border border-rose-500/30"
                    >
                      Query AI
                    </button>
                    <button
                      onClick={() => setIsInspectorExpanded(false)}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 text-xs font-semibold transition-colors cursor-pointer"
                      title="Minimize Telemetry Panel"
                    >
                      <ChevronDown className="w-4 h-4" />
                      <span>Minimize</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200/80 dark:border-white/10">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-slate-900 dark:text-white">{heartRate}</span>
                    <span className="text-xs font-semibold text-rose-500 dark:text-rose-400 uppercase">bpm</span>
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 ml-2">
                      {heartRate >= 100 ? 'Sinus Tachycardia' : 'Normal Sinus Rhythm'}
                    </span>
                  </div>
                  <div className="w-32 h-6">
                    <svg
                      viewBox="0 0 160 30"
                      className="w-full h-full stroke-rose-500 dark:stroke-rose-400 fill-none"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ ['--ecg-duration' as string]: `${ecgDurationSeconds}s` }}
                    >
                      <path
                        className="ecg-path"
                        d="M 0 15 L 25 15 L 32 15 L 37 5 L 43 25 L 48 2 L 54 28 L 60 15 L 68 15 L 85 15 L 92 15 L 97 5 L 103 25 L 108 2 L 114 28 L 120 15 L 128 15 L 160 15"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            )}

            {/* 2. STOMACH GASTRIC FLARE */}
            {activeHotspot === 'stomach' && (
              <div className="p-3.5 rounded-2xl bg-amber-50/95 dark:bg-[#181512]/95 backdrop-blur-xl border border-amber-500/40 shadow-2xl">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-500">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-amber-900 dark:text-amber-200">Gastric Flare (Melena)</span>
                        <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                          Walrus Safety Alert
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onQuickAskAI(getOrganPrompt('stomach'));
                      }}
                      className="px-2.5 py-1 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-800 dark:text-amber-200 text-xs font-bold transition-colors cursor-pointer border border-amber-500/30"
                    >
                      Test Safety
                    </button>
                    <button
                      onClick={() => setIsInspectorExpanded(false)}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <ChevronDown className="w-4 h-4" />
                      <span>Minimize</span>
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-700 dark:text-slate-300 mt-2 leading-relaxed">
                  Dark stool recorded by RN Elena. <span className="font-bold text-rose-600 dark:text-rose-400">Absolute Contraindication: NO NSAIDs (Advil/Ibuprofen)!</span>
                </p>
              </div>
            )}

            {/* 3. BRAIN COGNITION */}
            {activeHotspot === 'brain' && (
              <div className="p-3.5 rounded-2xl bg-white/95 dark:bg-[#12151E]/95 backdrop-blur-xl border border-purple-500/40 shadow-2xl">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-500">
                      <Brain className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">Brain: Normotonic 4/5</span>
                        <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30">
                          MMSE: 26/30
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onQuickAskAI(getOrganPrompt('brain'));
                      }}
                      className="px-2.5 py-1 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-700 dark:text-purple-300 text-xs font-bold transition-colors cursor-pointer border border-purple-500/30"
                    >
                      Query AI
                    </button>
                    <button
                      onClick={() => setIsInspectorExpanded(false)}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <ChevronDown className="w-4 h-4" />
                      <span>Minimize</span>
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-700 dark:text-slate-300 mt-2 leading-relaxed">
                  Mild sundowning noted in past sessions. Routine reminders and familiar environment maintain high stability.
                </p>
              </div>
            )}

            {/* 4. LUNGS RESPIRATORY */}
            {activeHotspot === 'lungs' && (
              <div className="p-3.5 rounded-2xl bg-white/95 dark:bg-[#12151E]/95 backdrop-blur-xl border border-cyan-500/40 shadow-2xl">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-500">
                      <Wind className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">Lungs: Clear Auscultation</span>
                        <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30">
                          SpO2: 98%
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setIsInspectorExpanded(false)}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <ChevronDown className="w-4 h-4" />
                      <span>Minimize</span>
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-700 dark:text-slate-300 mt-2 leading-relaxed">
                  Bilateral lungs clear to auscultation. Room air saturation 96-98%. No nocturnal dyspnea reported.
                </p>
              </div>
            )}

            {/* 5. EYES VISION */}
            {activeHotspot === 'eyes' && (
              <div className="p-3.5 rounded-2xl bg-white/95 dark:bg-[#12151E]/95 backdrop-blur-xl border border-blue-500/40 shadow-2xl">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-500">
                      <Eye className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">Vision: Bifocals Required</span>
                        <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30">
                          Protocol Active
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setIsInspectorExpanded(false)}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <ChevronDown className="w-4 h-4" />
                      <span>Minimize</span>
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-700 dark:text-slate-300 mt-2 leading-relaxed">
                  Pupils react. Bifocals required for ambulation. Hallway lighting protocol recommended to prevent falls.
                </p>
              </div>
            )}

            {/* 6. MOBILITY & GAIT */}
            {activeHotspot === 'mobility' && (
              <div className="p-3.5 rounded-2xl bg-white/95 dark:bg-[#12151E]/95 backdrop-blur-xl border border-emerald-500/40 shadow-2xl">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-500">
                      <Footprints className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">Mobility: Walker Required</span>
                        <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                          Fall Risk 3/5
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setIsInspectorExpanded(false)}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <ChevronDown className="w-4 h-4" />
                      <span>Minimize</span>
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-700 dark:text-slate-300 mt-2 leading-relaxed">
                  David DPT: Walker assistance required outdoors. Stand-by supervision during transfers.
                </p>
              </div>
            )}

            {/* 7. SKIN & TISSUE */}
            {activeHotspot === 'skin' && (
              <div className="p-3.5 rounded-2xl bg-white/95 dark:bg-[#12151E]/95 backdrop-blur-xl border border-pink-500/40 shadow-2xl">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-pink-500/15 border border-pink-500/30 flex items-center justify-center text-pink-500">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">Skin: Braden Scale 19</span>
                        <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-pink-500/15 text-pink-700 dark:text-pink-300 border border-pink-500/30">
                          Intact
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setIsInspectorExpanded(false)}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <ChevronDown className="w-4 h-4" />
                      <span>Minimize</span>
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-700 dark:text-slate-300 mt-2 leading-relaxed">
                  Low risk for pressure ulcers. Barrier cream applied twice daily by Elena RN.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
