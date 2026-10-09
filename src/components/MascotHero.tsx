'use client';

import React from 'react';
import Image from 'next/image';
import { Pill, Activity, FileText, Footprints, Sparkles, Heart, Shield } from 'lucide-react';

import { UserProfile } from '@/types/carecircle';

interface MascotHeroProps {
  onSelectPrompt: (prompt: string) => void;
  activeCaregiverName: string;
  userProfile?: UserProfile | null;
  isGuestMode?: boolean;
}

export function MascotHero({ onSelectPrompt, activeCaregiverName, userProfile, isGuestMode = false }: MascotHeroProps) {
  const isPersonalUser = !isGuestMode && !!userProfile?.walletAddress;
  const patientDisplayName = isPersonalUser ? (userProfile?.name || 'You') : 'Eleanor Vance';
  const possessive = isPersonalUser ? (userProfile?.name ? `${userProfile.name}'s` : 'my') : 'Eleanor’s';

  const suggestions = isPersonalUser
    ? [
        {
          icon: <Pill className="w-4 h-4 text-rose-500 dark:text-rose-400" />,
          title: 'Safety Contraindication Probe',
          label: 'Can I take 400mg Ibuprofen for a headache?',
          prompt: 'Can I take 400mg Ibuprofen (Advil) for a headache? Please cross-reference my health profile and Walrus records.',
          border: 'border-rose-500/20 hover:border-rose-500/50',
          badge: 'Safety Check',
          badgeColor: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30',
        },
        {
          icon: <Activity className="w-4 h-4 text-teal-600 dark:text-teal-400" />,
          title: 'Natural Language Vitals Update',
          label: 'Log BP 120/80, pulse 72 bpm, weight 68 kg',
          prompt: 'Update my vitals: Blood pressure is 120/80 mmHg, heart rate is 72 bpm, weight is 68 kg.',
          border: 'border-teal-500/20 hover:border-teal-500/50',
          badge: 'Biometric Action',
          badgeColor: 'bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30',
        },
        {
          icon: <FileText className="w-4 h-4 text-purple-600 dark:text-purple-400" />,
          title: 'Health Profile Analysis',
          label: 'Analyze my clinical profile & recommendations',
          prompt: 'Analyze my personalized clinical health profile and summarize key medical recommendations and precautions.',
          border: 'border-purple-500/20 hover:border-purple-500/50',
          badge: 'Walrus Memory',
          badgeColor: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30',
        },
        {
          icon: <Footprints className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />,
          title: 'Natural Language Observation Save',
          label: 'Record that I experienced mild morning fatigue',
          prompt: 'Remember in Walrus Memory that I experienced mild morning fatigue and needed extra rest after breakfast.',
          border: 'border-cyan-500/20 hover:border-cyan-500/50',
          badge: 'Persist to Walrus',
          badgeColor: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30',
        },
      ]
    : [
        {
          icon: <Pill className="w-4 h-4 text-rose-500 dark:text-rose-400" />,
          title: 'Safety Contraindication Probe',
          label: 'Can I give Eleanor 400mg Ibuprofen for headache?',
          prompt: 'Eleanor has a headache this afternoon. Can I give her 400mg Ibuprofen (Advil)?',
          border: 'border-rose-500/20 hover:border-rose-500/50',
          badge: 'Critical Safety Test',
          badgeColor: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30',
        },
        {
          icon: <Activity className="w-4 h-4 text-teal-600 dark:text-teal-400" />,
          title: 'Natural Language Vitals Update',
          label: 'Log BP 120/80, pulse 72 bpm, weight 64 kg',
          prompt: 'Update Eleanor’s vitals: Blood pressure is 120/80 mmHg, heart rate is 72 bpm, weight is 64 kg.',
          border: 'border-teal-500/20 hover:border-teal-500/50',
          badge: 'Natural Language Bot Action',
          badgeColor: 'bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30',
        },
        {
          icon: <FileText className="w-4 h-4 text-purple-600 dark:text-purple-400" />,
          title: 'Decentralized Memory Recall',
          label: 'Summarize what Nurse Elena reported today',
          prompt: 'Can you summarize what Nurse Elena reported during her shift regarding Eleanor’s medication and stomach flare?',
          border: 'border-purple-500/20 hover:border-purple-500/50',
          badge: 'Walrus Memory',
          badgeColor: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30',
        },
        {
          icon: <Footprints className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />,
          title: 'Natural Language Observation Save',
          label: 'Remember that Eleanor had mild morning fatigue',
          prompt: 'Remember in Walrus Memory that Eleanor experienced mild morning fatigue and needed arm support for standing.',
          border: 'border-cyan-500/20 hover:border-cyan-500/50',
          badge: 'Persist to Walrus',
          badgeColor: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30',
        },
      ];

  return (
    <div className="flex flex-col items-center justify-center text-center py-6 px-4 max-w-4xl mx-auto space-y-6">
      {/* 3D Holographic AI Orb & Pulse Core */}
      <div className="relative flex items-center justify-center">
        {/* Ambient Glow */}
        <div className="absolute w-48 h-48 rounded-full bg-gradient-to-tr from-rose-500/20 via-purple-500/20 to-cyan-500/20 blur-2xl animate-pulse" />

        {/* 3D Heart Sphere Core */}
        <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-white dark:bg-[#141722] border border-slate-200 dark:border-white/15 p-2 shadow-2xl flex items-center justify-center group hover:scale-105 transition-transform duration-300">
          <div className="relative w-full h-full rounded-2xl overflow-hidden bg-radial from-rose-500/10 to-transparent flex items-center justify-center">
            <Image
              src="/images/organ_heart_3d.png"
              alt="Holographic Core"
              fill
              sizes="(max-width: 640px) 112px, 128px"
              className="object-contain filter contrast-110 drop-shadow-lg med-asset-blend"
            />
            {/* Holographic Scanline */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-400/20 to-transparent animate-pulse pointer-events-none" />
          </div>

          {/* Floating AI Status Pill */}
          <div className="absolute -bottom-3 px-3 py-0.5 rounded-full bg-slate-900 text-white dark:bg-[#1A1E2B] border border-white/20 text-[10px] font-bold text-rose-300 flex items-center gap-1.5 shadow-lg">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
            <span>Walrus Memory Online</span>
          </div>
        </div>
      </div>

      {/* Main Title & Context */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-700 dark:text-purple-300 text-xs font-semibold mb-3">
          <Sparkles className="w-3.5 h-3.5 text-purple-500 dark:text-purple-400" />
          <span>Meet KIRO • Personalized Clinical AI on Walrus</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">
          Clinical AI That{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-500 via-pink-500 to-purple-600 dark:from-rose-400 dark:via-pink-400 dark:to-purple-400">
            Remembers Every Detail
          </span>
        </h1>

        <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm font-medium max-w-xl mx-auto mt-2 leading-relaxed">
          I am <span className="text-purple-600 dark:text-purple-300 font-bold">KIRO</span>. Connected to {isPersonalUser ? 'your' : `${patientDisplayName}’s`} decentralized Walrus Memory vault on Sui. Speak naturally to update vitals, check drug contraindications, or record clinical observations.
        </p>
      </div>

      {/* Clinical Scenario Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full max-w-3xl text-left pt-2">
        {suggestions.map((item, idx) => (
          <button
            key={idx}
            onClick={() => onSelectPrompt(item.prompt)}
            className={`p-4 rounded-3xl bg-white dark:bg-[#141722] hover:bg-slate-50 dark:hover:bg-[#191D2B] border border-slate-200 dark:border-white/10 ${item.border} transition-all duration-300 cursor-pointer flex flex-col justify-between group hover:-translate-y-1 hover:shadow-xl shadow-slate-200/50 dark:shadow-black/20`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                  {item.icon}
                </div>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${item.badgeColor}`}>
                  {item.badge}
                </span>
              </div>

              <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-300 transition-colors">
                {item.title}
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2 leading-snug">
                &ldquo;{item.label}&rdquo;
              </p>
            </div>

            <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-[10px] text-slate-500 font-medium">
              <span className="text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                Click to run prompt →
              </span>
              <span className="font-mono text-purple-600 dark:text-purple-400 font-bold">Sui Mainnet</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
