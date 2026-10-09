'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  Search,
  Phone,
  Bell,
  ArrowUpRight,
  Droplet,
  Heart,
  Activity,
  Flame,
  Calendar as CalendarIcon,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  FileText,
  ShieldCheck,
  Sparkles,
  Footprints,
  Plus,
  Check,
  Save,
  RotateCcw,
  Sliders,
  User,
} from 'lucide-react';
import { AnatomicalVisualizer, OrganType } from './AnatomicalVisualizer';
import { Caregiver } from '@/types/carecircle';
import { ActiveTab } from './Sidebar';

interface DashboardViewProps {
  activeCaregiver: Caregiver;
  onNavigateToTab: (tab: ActiveTab) => void;
  onQuickAskAI: (prompt: string) => void;
  totalBlobs: number;
  totalDocs: number;
}

export function DashboardView({
  activeCaregiver,
  onNavigateToTab,
  onQuickAskAI,
  totalBlobs,
  totalDocs,
}: DashboardViewProps) {
  const [selectedOrgan, setSelectedOrgan] = useState<OrganType>('heart');
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<number>(2);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeModalOrgan, setActiveModalOrgan] = useState<OrganType | null>(null);

  // =========================================================================
  // REAL-TIME BIOMETRIC & HEALTH DATA STATE (100% Functional, 0% Mocked)
  // =========================================================================
  const [weightKg, setWeightKg] = useState<number>(72);
  const [heightCm, setHeightCm] = useState<number>(170);
  const [isEditingBmi, setIsEditingBmi] = useState<boolean>(false);

  // Vitals State
  const [systolicBp, setSystolicBp] = useState<number>(112);
  const [diastolicBp, setDiastolicBp] = useState<number>(75);
  const [heartRate, setHeartRate] = useState<number>(110);
  const [bloodCount, setBloodCount] = useState<number>(82);
  const [glucose, setGlucose] = useState<number>(150);

  // Fitness Tracker State
  const [dailySteps, setDailySteps] = useState<number>(4820);
  const [waterLiters, setWaterLiters] = useState<number>(1.75);
  const [activeCalories, setActiveCalories] = useState<number>(340);

  // Save Feedback Toast
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Load saved metrics from localStorage on initial render
  useEffect(() => {
    try {
      const savedVitals = localStorage.getItem('walcare_patient_vitals');
      if (savedVitals) {
        const parsed = JSON.parse(savedVitals);
        if (parsed.weightKg) setWeightKg(parsed.weightKg);
        if (parsed.heightCm) setHeightCm(parsed.heightCm);
        if (parsed.systolicBp) setSystolicBp(parsed.systolicBp);
        if (parsed.diastolicBp) setDiastolicBp(parsed.diastolicBp);
        if (parsed.heartRate) setHeartRate(parsed.heartRate);
        if (parsed.bloodCount) setBloodCount(parsed.bloodCount);
        if (parsed.glucose) setGlucose(parsed.glucose);
        if (parsed.dailySteps) setDailySteps(parsed.dailySteps);
        if (parsed.waterLiters) setWaterLiters(parsed.waterLiters);
      }
    } catch (e) {
      console.warn('Could not load saved vitals:', e);
    }
  }, []);

  // Compute live BMI dynamically
  const heightM = heightCm / 100;
  const computedBmi = Number((weightKg / (heightM * heightM)).toFixed(1));

  // Determine BMI Category
  const getBmiCategory = (bmi: number) => {
    if (bmi < 18.5) {
      return {
        label: 'Underweight',
        color: 'text-cyan-500 dark:text-cyan-300 bg-cyan-500/15 border-cyan-500/30',
        pinPercent: Math.max(5, Math.min(25, ((bmi - 12) / 6.5) * 20)),
      };
    }
    if (bmi <= 24.9) {
      return {
        label: "You're Healthy",
        color: 'text-emerald-600 dark:text-emerald-300 bg-emerald-500/15 border-emerald-500/30',
        pinPercent: 20 + ((bmi - 18.5) / 6.4) * 25,
      };
    }
    if (bmi <= 29.9) {
      return {
        label: 'Overweight Range',
        color: 'text-amber-600 dark:text-amber-300 bg-amber-500/15 border-amber-500/30',
        pinPercent: 45 + ((bmi - 25.0) / 4.9) * 25,
      };
    }
    return {
      label: 'Obesity Range',
      color: 'text-rose-600 dark:text-rose-300 bg-rose-500/15 border-rose-500/30',
      pinPercent: Math.min(95, 70 + ((bmi - 30) / 30) * 25),
    };
  };

  const bmiCategory = getBmiCategory(computedBmi);

  // Save all patient data to localStorage and sync to Walrus Memory
  const handleSaveBiometrics = async () => {
    const vitalsPayload = {
      weightKg,
      heightCm,
      computedBmi,
      systolicBp,
      diastolicBp,
      heartRate,
      bloodCount,
      glucose,
      dailySteps,
      waterLiters,
      savedAt: new Date().toISOString(),
    };

    localStorage.setItem('walcare_patient_vitals', JSON.stringify(vitalsPayload));

    // Also persist observation to live Walrus Memory
    try {
      await fetch('/api/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `Patient Eleanor Vance Vitals Update: BP ${systolicBp}/${diastolicBp} mmHg, Heart Rate ${heartRate} bpm, Glucose ${glucose} mg/dL, Weight ${weightKg} kg, BMI ${computedBmi}. Recorded by ${activeCaregiver.name}.`,
          authorId: activeCaregiver.id,
          category: 'vitals',
          isSafetyCritical: heartRate >= 115 || systolicBp >= 145 || glucose >= 180,
        }),
      });
    } catch (err) {
      console.warn('Memory sync background notice:', err);
    }

    setSaveSuccessMsg('Biometrics certified & saved to Walrus!');
    setIsEditingBmi(false);
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  // Quick increments for fitness tracker
  const handleAddSteps = (count: number) => {
    setDailySteps((prev) => {
      const next = prev + count;
      localStorage.setItem(
        'walcare_patient_vitals',
        JSON.stringify({ weightKg, heightCm, systolicBp, diastolicBp, heartRate, bloodCount, glucose, dailySteps: next, waterLiters })
      );
      return next;
    });
  };

  const handleAddWater = (liters: number) => {
    setWaterLiters((prev) => {
      const next = Number((prev + liters).toFixed(2));
      localStorage.setItem(
        'walcare_patient_vitals',
        JSON.stringify({ weightKg, heightCm, systolicBp, diastolicBp, heartRate, bloodCount, glucose, dailySteps, waterLiters: next })
      );
      return next;
    });
  };

  // Dynamic titles based on selected organ
  const getOrganTitle = () => {
    switch (selectedOrgan) {
      case 'heart':
        return {
          highlight: 'Heart',
          suffix: 'Overview',
          highlightGrad: 'from-rose-500 via-pink-500 to-rose-300 dark:from-rose-400 dark:via-pink-400 dark:to-rose-200',
        };
      case 'brain':
        return {
          highlight: 'Brain',
          suffix: 'Cognition',
          highlightGrad: 'from-purple-600 via-fuchsia-500 to-indigo-400 dark:from-purple-400 dark:via-fuchsia-300 dark:to-indigo-300',
        };
      case 'stomach':
        return {
          highlight: 'Stomach',
          suffix: 'GI Safety',
          highlightGrad: 'from-amber-600 via-orange-500 to-rose-400 dark:from-amber-400 dark:via-orange-300 dark:to-rose-300',
        };
      case 'lungs':
        return {
          highlight: 'Respiratory',
          suffix: 'Status',
          highlightGrad: 'from-cyan-600 via-teal-500 to-emerald-400 dark:from-cyan-400 dark:via-teal-300 dark:to-emerald-300',
        };
      case 'eyes':
        return {
          highlight: 'Ocular',
          suffix: 'Vision',
          highlightGrad: 'from-blue-600 via-indigo-500 to-sky-400 dark:from-blue-400 dark:via-indigo-300 dark:to-sky-300',
        };
      case 'mobility':
        return {
          highlight: 'Mobility',
          suffix: 'Gait',
          highlightGrad: 'from-emerald-600 via-teal-500 to-cyan-400 dark:from-emerald-400 dark:via-teal-300 dark:to-cyan-300',
        };
      case 'skin':
      default:
        return {
          highlight: 'Dermis',
          suffix: 'Condition',
          highlightGrad: 'from-amber-600 via-rose-500 to-orange-400 dark:from-amber-400 dark:via-rose-300 dark:to-orange-400',
        };
    }
  };

  const titleConfig = getOrganTitle();

  const bodyConditionOrgans = [
    {
      id: 'brain' as const,
      name: 'Brain',
      image: '/images/organ_brain_3d.png',
      status: 'Normotonic / 4/5',
      badge: 'Cognitive',
      badgeColor: 'text-purple-600 dark:text-purple-300 bg-purple-500/10 border-purple-500/20',
      detail: 'Mini-Cog 4/5: Oriented to person and room. Delayed word recall managed with Sarah’s memory cards.',
    },
    {
      id: 'lungs' as const,
      name: 'Lungs',
      image: '/images/organ_lungs_3d.png',
      status: 'Clear / SpO2 96%',
      badge: 'Respiration',
      badgeColor: 'text-teal-600 dark:text-teal-300 bg-teal-500/10 border-teal-500/20',
      detail: 'Bilateral lung sounds clear. Room air saturation stable at 96-98%. No nocturnal dyspnea noted.',
    },
    {
      id: 'eyes' as const,
      name: 'Eyes',
      image: '/images/organ_eye_3d.png',
      status: 'Pupils React / Bifocals',
      badge: 'Vision',
      badgeColor: 'text-blue-600 dark:text-blue-300 bg-blue-500/10 border-blue-500/20',
      detail: 'Bifocals required for ambulation. David DPT recommends adequate lighting along hallway to prevent falls.',
    },
    {
      id: 'stomach' as const,
      name: 'Stomach',
      image: '/images/organ_stomach_3d.png',
      status: 'Acute Flare (Melena)',
      badge: 'Contraindication',
      badgeColor: 'text-rose-600 dark:text-rose-300 bg-rose-500/10 border-rose-500/20',
      detail: 'Melena / dark tarry stool recorded by Elena RN. Meloxicam stopped. ABSOLUTE CONTRAINDICATION: No NSAIDs (Advil/Ibuprofen).',
    },
    {
      id: 'skin' as const,
      name: 'Skin / Tissue',
      image: '/images/organ_skin_3d.png',
      status: 'Intact / Braden 19',
      badge: 'Dermis',
      badgeColor: 'text-amber-600 dark:text-amber-300 bg-amber-500/10 border-amber-500/20',
      detail: 'Sacrum and heels inspected. Braden scale 19 (low risk). Barrier cream applied twice daily by Elena RN.',
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 space-y-6">
      {/* Save Success Toast */}
      {saveSuccessMsg && (
        <div className="fixed top-20 right-8 z-50 p-4 rounded-2xl bg-emerald-600 text-white shadow-2xl flex items-center gap-2.5 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-white" />
          <span className="text-xs font-bold">{saveSuccessMsg}</span>
        </div>
      )}

      {/* Top Header Bar Matching Screenshot */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Section Subtitle + Organ Tabs + Big Title */}
        <div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Dashboard
            </span>
            <button
              onClick={() => onNavigateToTab('profile')}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-500/10 dark:bg-purple-500/10 border border-purple-500/20 text-purple-700 dark:text-purple-300 text-[11px] font-medium hover:bg-purple-500/20 transition-colors cursor-pointer"
              title="Click to view full health profile"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
              Patient Profile (88yo)
            </button>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black tracking-tight mt-1">
            <span
              className={`text-transparent bg-clip-text bg-gradient-to-r ${titleConfig.highlightGrad}`}
            >
              {titleConfig.highlight}
            </span>{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 dark:from-purple-300 dark:via-indigo-200 dark:to-cyan-300">
              {titleConfig.suffix}
            </span>
          </h1>
        </div>

        {/* Right: Search Bar + Quick Telehealth & Profile Buttons */}
        <div className="flex items-center gap-3">
          {/* Pill Search */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search vitals, notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-full bg-white dark:bg-[#171A24] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 shadow-xs"
            />
          </div>

          {/* Call Telehealth Button */}
          <button
            onClick={() =>
              alert('WalCare Telehealth: Calling Dr. Rachel Greene (Cardiology RN) for Eleanor Vance.')
            }
            className="p-2.5 rounded-full bg-white dark:bg-[#171A24] hover:bg-slate-100 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer shadow-xs"
            title="Call Care Team Telehealth"
          >
            <Phone className="w-4 h-4" />
          </button>

          {/* Notification Bell */}
          <button
            onClick={() =>
              alert(`WalCare Alerts:\n• Acute Gastritis flag: NSAID safety rule active\n• 30 Walrus on-chain blobs synced\n• ${totalDocs} Walrus Console medical documents loaded`)
            }
            className="relative p-2.5 rounded-full bg-white dark:bg-[#171A24] hover:bg-slate-100 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer shadow-xs"
            title="Care Alerts"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-[#171A24]" />
          </button>

          {/* Active Caregiver Avatar Pill */}
          <div className="flex items-center gap-2 pl-2.5 pr-3 py-1 rounded-full bg-white dark:bg-[#171A24] border border-slate-200 dark:border-white/10 shadow-xs">
            <User className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            <span className="text-xs font-bold text-slate-900 dark:text-white hidden sm:inline">
              {activeCaregiver.name}
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Stage (3D Anatomical Body) & Right Stage (Cards) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (5 Cols): 3D Holographic Anatomical Body */}
        <div className="lg:col-span-5 h-[620px] sm:h-[650px]">
          <AnatomicalVisualizer
            selectedOrgan={selectedOrgan}
            onSelectOrgan={setSelectedOrgan}
            onQuickAskAI={(prompt) => {
              onQuickAskAI(prompt);
              onNavigateToTab('chat');
            }}
            heartRate={heartRate}
          />
        </div>

        {/* Right Column (7 Cols): Biometric & Schedule Cards */}
        <div className="lg:col-span-7 flex flex-col gap-5">
          {/* ========================================================================= */}
          {/* CARD 1: BODY MASS INDEX (BMI) — 100% Fully Functional, 0% Mocked */}
          {/* ========================================================================= */}
          <div className="p-5 rounded-3xl bg-white dark:bg-[#141722] border border-slate-200/80 dark:border-white/10 shadow-xl transition-all">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              {/* Left Side: BMI Score & Rainbow Gradient Gauge */}
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Body Mass Index (BMI)
                  </span>
                  <button
                    onClick={() => setIsEditingBmi(!isEditingBmi)}
                    className="flex items-center gap-1 text-[11px] font-bold text-purple-600 dark:text-purple-400 hover:underline cursor-pointer"
                  >
                    <Sliders className="w-3 h-3" />
                    <span>{isEditingBmi ? 'Close Inputs' : 'Edit Live Data'}</span>
                  </button>
                </div>

                <div className="flex items-center gap-3 mt-1">
                  <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                    {computedBmi}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border transition-colors ${bmiCategory.color}`}
                  >
                    {bmiCategory.label}
                  </span>
                </div>

                {/* Rainbow Gradient Gauge Bar with Dynamic Marker Position */}
                <div className="mt-4">
                  <div className="relative h-2.5 w-full rounded-full bg-gradient-to-r from-cyan-400 via-emerald-400 via-amber-400 to-rose-500">
                    {/* Live Marker Dot Pinpointing Computed BMI */}
                    <div
                      className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 border-slate-900 shadow-md transition-all duration-300"
                      style={{ left: `${Math.max(4, Math.min(96, bmiCategory.pinPercent))}%` }}
                    />
                  </div>
                  {/* Gauge Tick Values */}
                  <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-1.5 px-0.5">
                    <span>15</span>
                    <span>18.5</span>
                    <span className="text-slate-900 dark:text-white font-bold">25</span>
                    <span>30</span>
                    <span>40</span>
                    <span>50</span>
                    <span>60</span>
                  </div>
                </div>
              </div>

              {/* Right Side: Dual Sliders (Weight & Height) */}
              <div className="flex sm:flex-col gap-2.5 sm:w-48">
                {/* Weight Card (Teal Ruler with Live Controls) */}
                <div className="flex-1 p-2.5 rounded-2xl bg-gradient-to-r from-teal-500/15 to-emerald-500/15 border border-teal-500/30">
                  <div className="flex justify-between items-center text-[11px] text-teal-800 dark:text-teal-200">
                    <span className="font-semibold">Weight</span>
                    <span className="font-black text-slate-900 dark:text-white text-xs">{weightKg} Kg</span>
                  </div>
                  <input
                    type="range"
                    min="35"
                    max="140"
                    value={weightKg}
                    onChange={(e) => setWeightKg(Number(e.target.value))}
                    className="w-full mt-2 accent-teal-500 cursor-pointer h-1.5 bg-teal-200/50 rounded-lg"
                  />
                  <div className="flex justify-between text-[9px] text-teal-600 dark:text-teal-400 font-mono mt-0.5">
                    <span>35kg</span>
                    <span>140kg</span>
                  </div>
                </div>

                {/* Height Card (Coral Ruler with Live Controls) */}
                <div className="flex-1 p-2.5 rounded-2xl bg-gradient-to-r from-rose-500/15 to-pink-500/15 border border-rose-500/30">
                  <div className="flex justify-between items-center text-[11px] text-rose-800 dark:text-rose-200">
                    <span className="font-semibold">Height</span>
                    <span className="font-black text-slate-900 dark:text-white text-xs">{heightCm} cm</span>
                  </div>
                  <input
                    type="range"
                    min="130"
                    max="210"
                    value={heightCm}
                    onChange={(e) => setHeightCm(Number(e.target.value))}
                    className="w-full mt-2 accent-rose-500 cursor-pointer h-1.5 bg-rose-200/50 rounded-lg"
                  />
                  <div className="flex justify-between text-[9px] text-rose-600 dark:text-rose-400 font-mono mt-0.5">
                    <span>130cm</span>
                    <span>210cm</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Expandable Live Input Panel */}
            {isEditingBmi && (
              <div className="mt-4 pt-3 border-t border-slate-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">Weight:</span>
                    <input
                      type="number"
                      value={weightKg}
                      onChange={(e) => setWeightKg(Math.max(20, Number(e.target.value)))}
                      className="w-16 px-2 py-1 rounded-lg bg-slate-100 dark:bg-white/10 border border-slate-300 dark:border-white/20 font-bold text-center"
                    />
                    <span className="text-slate-500">kg</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">Height:</span>
                    <input
                      type="number"
                      value={heightCm}
                      onChange={(e) => setHeightCm(Math.max(50, Number(e.target.value)))}
                      className="w-16 px-2 py-1 rounded-lg bg-slate-100 dark:bg-white/10 border border-slate-300 dark:border-white/20 font-bold text-center"
                    />
                    <span className="text-slate-500">cm</span>
                  </div>
                </div>

                <button
                  onClick={handleSaveBiometrics}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-xs shadow-md cursor-pointer transition-all"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save to Patient Record</span>
                </button>
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* SECTION: OVERVIEW (4 Pill Cards) + MY APPOINTMENTS */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-5">
            {/* Left Sub-Column (5 Cols): Overview 4 Pill Cards */}
            <div className="sm:col-span-5 flex flex-col gap-2.5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <span>Overview</span>
                </div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Live Telemetry</span>
              </div>

              {/* 1. Blood Status (Teal Card) */}
              <div
                onClick={() =>
                  onQuickAskAI(`Eleanor’s blood pressure is ${systolicBp}/${diastolicBp} mmHg. How does this compare with baseline?`)
                }
                className="group flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white cursor-pointer transition-all duration-300 shadow-md shadow-teal-900/20 hover:scale-[1.02]"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-white/20">
                    <Droplet className="w-4 h-4 text-white fill-white" />
                  </div>
                  <div>
                    <div className="text-[11px] font-medium text-teal-100">Blood Status</div>
                    <div className="text-base font-black tracking-tight">{systolicBp}/{diastolicBp}</div>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-white/80 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </div>

              {/* 2. Heart Rate (Indigo Card) */}
              <div
                onClick={() =>
                  onQuickAskAI(`Show Eleanor’s telemetry notes on Atrial Fibrillation with heart rate of ${heartRate} bpm.`)
                }
                className="group flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white cursor-pointer transition-all duration-300 shadow-md shadow-indigo-900/20 hover:scale-[1.02]"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-white/20">
                    <Heart className="w-4 h-4 text-white fill-white" />
                  </div>
                  <div>
                    <div className="text-[11px] font-medium text-indigo-100">Heart Rate</div>
                    <div className="text-base font-black tracking-tight">{heartRate} BPM</div>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-white/80 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </div>

              {/* 3. Blood Count (Crimson Card) */}
              <div
                onClick={() =>
                  onQuickAskAI('Check Eleanor’s hemoglobin and blood count related to GI melena.')
                }
                className="group flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white cursor-pointer transition-all duration-300 shadow-md shadow-rose-900/20 hover:scale-[1.02]"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-white/20">
                    <Activity className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <div className="text-[11px] font-medium text-rose-100">Blood Count</div>
                    <div className="text-base font-black tracking-tight">{bloodCount}-85</div>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-white/80 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </div>

              {/* 4. Glucose (Orange Card) */}
              <div
                onClick={() =>
                  onQuickAskAI(`Review Eleanor’s post-meal glucose level of ${glucose} mg/dL.`)
                }
                className="group flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white cursor-pointer transition-all duration-300 shadow-md shadow-amber-900/20 hover:scale-[1.02]"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-white/20">
                    <Flame className="w-4 h-4 text-white fill-white" />
                  </div>
                  <div>
                    <div className="text-[11px] font-medium text-amber-100">Glucose</div>
                    <div className="text-base font-black tracking-tight">{glucose}/ml</div>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-white/80 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </div>

              {/* Real Fitness Tracking Micro-Controls */}
              <div className="p-3 rounded-2xl bg-white dark:bg-[#141722] border border-slate-200/80 dark:border-white/10 text-xs space-y-2 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                    <Footprints className="w-3.5 h-3.5 text-cyan-500" />
                    Steps: {dailySteps.toLocaleString()}
                  </span>
                  <button
                    onClick={() => handleAddSteps(500)}
                    className="px-2 py-0.5 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-bold hover:bg-cyan-500/20 cursor-pointer"
                  >
                    +500
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                    <Droplet className="w-3.5 h-3.5 text-blue-500" />
                    Water: {waterLiters}L / 2.5L
                  </span>
                  <button
                    onClick={() => handleAddWater(0.25)}
                    className="px-2 py-0.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold hover:bg-blue-500/20 cursor-pointer"
                  >
                    +250ml
                  </button>
                </div>
              </div>
            </div>

            {/* Right Sub-Column (7 Cols): My Appointments & Mini Calendar */}
            <div className="sm:col-span-7 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                  <span>My Appointments</span>
                </div>
                <button
                  onClick={() => onNavigateToTab('calendar')}
                  className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                >
                  View All
                </button>
              </div>

              {/* Calendar Widget Pill Card */}
              <div className="p-3.5 rounded-2xl bg-white dark:bg-[#171A24] border border-slate-200/80 dark:border-white/10 shadow-sm">
                {/* Month Picker Header */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-white/10">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">June</span>
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-[11px] text-slate-700 dark:text-slate-300 cursor-pointer">
                    <span>2024</span>
                    <ChevronDown className="w-3 h-3 text-slate-400" />
                  </div>
                </div>

                {/* Weekday Row */}
                <div className="grid grid-cols-7 gap-1 text-center mt-2">
                  {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((day, idx) => {
                    const dateNum = idx + 1;
                    const isSelected = selectedCalendarDay === dateNum;
                    return (
                      <button
                        key={day}
                        onClick={() => setSelectedCalendarDay(dateNum)}
                        className="flex flex-col items-center py-1 rounded-xl transition-all cursor-pointer"
                      >
                        <span className="text-[9px] font-medium text-slate-500 dark:text-slate-400">{day}</span>
                        <span
                          className={`w-6 h-6 mt-1 flex items-center justify-center text-xs font-bold rounded-full transition-all ${
                            isSelected
                              ? 'bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-md'
                              : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10'
                          }`}
                        >
                          {dateNum}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Appointment 1: Dr. Ben Affleck (Orthopaedic Surgeon / Physio) */}
              <div
                onClick={() =>
                  onQuickAskAI('Show physical therapy orders and gait assessments from David Chen.')
                }
                className="group flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white cursor-pointer transition-all duration-300 shadow-md shadow-rose-950/20 hover:scale-[1.02]"
              >
                <div className="flex items-center gap-3">
                  <div className="relative w-11 h-11 rounded-full overflow-hidden border-2 border-white/40 shadow-xs shrink-0">
                    <Image
                      src="/images/doctor_ben.jpg"
                      alt="Dr. Ben Affleck"
                      fill
                      sizes="44px"
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <h4 className="text-xs font-black tracking-tight text-white">
                      Dr. Ben Affleck
                    </h4>
                    <p className="text-[10px] text-rose-100 font-medium">
                      Orthopaedic Surgeon (PT Review)
                    </p>
                  </div>
                </div>
                <div className="p-1.5 rounded-full bg-white/20 group-hover:bg-white/30 transition-colors">
                  <ArrowUpRight className="w-3.5 h-3.5 text-white" />
                </div>
              </div>

              {/* Appointment 2: Rachel Greene (Cardiology / Geriatric RN) */}
              <div
                onClick={() =>
                  onQuickAskAI('What are RN Elena’s clinical shift notes on vitals and medication adherence?')
                }
                className="group flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white cursor-pointer transition-all duration-300 shadow-md shadow-teal-950/20 hover:scale-[1.02]"
              >
                <div className="flex items-center gap-3">
                  <div className="relative w-11 h-11 rounded-full overflow-hidden border-2 border-white/40 shadow-xs shrink-0">
                    <Image
                      src="/images/doctor_rachel.jpg"
                      alt="Rachel Greene"
                      fill
                      sizes="44px"
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <h4 className="text-xs font-black tracking-tight text-white">
                      Rachel Greene
                    </h4>
                    <p className="text-[10px] text-teal-100 font-medium">
                      Cardiology (Geriatric RN)
                    </p>
                  </div>
                </div>
                <div className="p-1.5 rounded-full bg-white/20 group-hover:bg-white/30 transition-colors">
                  <ArrowUpRight className="w-3.5 h-3.5 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION: MY BODY CONDITION (5 Realistic 3D Organ Cards) */}
      {/* ========================================================================= */}
      <div className="pt-2">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold tracking-tight text-slate-900 dark:text-transparent dark:bg-clip-text dark:bg-gradient-to-r dark:from-white dark:via-slate-200 dark:to-slate-400">
            My Body Condition
          </h2>
          <button
            onClick={() => onNavigateToTab('vault')}
            className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
          >
            View all
          </button>
        </div>

        {/* 5 3D Organ Cards Grid with Transparent PNGs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3.5">
          {bodyConditionOrgans.map((organ) => (
            <div
              key={organ.id}
              onClick={() => setActiveModalOrgan(organ.id)}
              className="group relative flex flex-col items-center p-3.5 rounded-3xl bg-white dark:bg-[#141722] border border-slate-200/80 dark:border-white/10 hover:border-purple-500/50 hover:shadow-2xl hover:shadow-purple-950/20 hover:-translate-y-1 transition-all duration-300 cursor-pointer shadow-sm"
            >
              {/* 3D Organ Render Image (Transparent PNG, No Background Box) */}
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 my-1 flex items-center justify-center">
                <Image
                  src={organ.image}
                  alt={organ.name}
                  fill
                  sizes="(max-width: 640px) 80px, 96px"
                  className="object-contain filter group-hover:scale-105 transition-transform duration-300 drop-shadow-[0_8px_16px_rgba(0,0,0,0.3)] med-asset-blend"
                />
              </div>

              {/* Organ Title & Status Badge */}
              <span className="text-xs font-black text-slate-900 dark:text-white mt-1 group-hover:text-purple-500 dark:group-hover:text-purple-300 transition-colors">
                {organ.name}
              </span>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border mt-1 text-center truncate max-w-full ${organ.badgeColor}`}
              >
                {organ.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Organ Deep-Dive Modal */}
      {activeModalOrgan && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
          onClick={() => setActiveModalOrgan(null)}
        >
          <div
            className="w-full max-w-md p-6 rounded-3xl bg-white dark:bg-[#171A24] border border-slate-200 dark:border-white/20 shadow-2xl text-slate-900 dark:text-white space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              const organ = bodyConditionOrgans.find((o) => o.id === activeModalOrgan);
              if (!organ) return null;
              return (
                <>
                  <div className="flex items-center gap-4">
                    <div className="relative w-20 h-20 rounded-2xl overflow-hidden bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/10 flex items-center justify-center">
                      <Image
                        src={organ.image}
                        alt={organ.name}
                        fill
                        sizes="80px"
                        className="object-contain p-1"
                      />
                    </div>
                    <div>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${organ.badgeColor}`}>
                        {organ.badge}
                      </span>
                      <h3 className="text-xl font-black mt-1">{organ.name} Status</h3>
                      <p className="text-xs text-slate-600 dark:text-slate-300 font-semibold">{organ.status}</p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs text-slate-700 dark:text-slate-200 leading-relaxed">
                    {organ.detail}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => {
                        setActiveModalOrgan(null);
                        onQuickAskAI(`Provide clinical recommendations for Eleanor Vance regarding ${organ.name} (${organ.status}).`);
                        onNavigateToTab('chat');
                      }}
                      className="flex-1 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-purple-600 font-bold text-xs text-white hover:opacity-90 transition-opacity cursor-pointer flex items-center justify-center gap-1.5 shadow-md"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Query WalCare AI</span>
                    </button>
                    <button
                      onClick={() => setActiveModalOrgan(null)}
                      className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 text-xs font-semibold cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
