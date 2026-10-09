'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  User,
  Heart,
  Activity,
  AlertTriangle,
  Pill,
  ShieldCheck,
  Phone,
  Save,
  CheckCircle2,
  Plus,
  Trash2,
  Sparkles,
  Calendar,
  Wallet,
  RotateCcw,
  Camera,
  Upload,
  Loader2,
} from 'lucide-react';
import { UserProfile } from '@/types/carecircle';
import { SuiAccount } from './WalletModal';

interface ProfileViewProps {
  profile: UserProfile;
  onSaveProfile: (updatedProfile: UserProfile) => Promise<void>;
  suiAccount: SuiAccount | null;
  onConnectWallet: () => void;
  onAskKIRO: (prompt: string) => void;
}

export function ProfileView({
  profile,
  onSaveProfile,
  suiAccount,
  onConnectWallet,
  onAskKIRO,
}: ProfileViewProps) {
  const [formData, setFormData] = useState<UserProfile>(profile);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [uploadBlobSuccess, setUploadBlobSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // New condition / allergy inputs
  const [newCondition, setNewCondition] = useState('');
  const [newAllergy, setNewAllergy] = useState('');
  const [newMedName, setNewMedName] = useState('');
  const [newMedDose, setNewMedDose] = useState('');
  const [newMedFreq, setNewMedFreq] = useState('');

  useEffect(() => {
    setFormData(profile);
  }, [profile]);

  // Dynamic BMI Calculation
  const heightM = (formData.heightCm || 160) / 100;
  const computedBmi = Number(((formData.weightKg || 60) / (heightM * heightM)).toFixed(1));

  const getBmiStatus = (bmi: number) => {
    if (bmi < 18.5) return { label: 'Underweight', color: 'text-cyan-600 dark:text-cyan-400 bg-cyan-500/15 border-cyan-500/30' };
    if (bmi <= 24.9) return { label: 'Healthy Range', color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 border-emerald-500/30' };
    if (bmi <= 29.9) return { label: 'Overweight Range', color: 'text-amber-600 dark:text-amber-400 bg-amber-500/15 border-amber-500/30' };
    return { label: 'Obesity Range', color: 'text-rose-600 dark:text-rose-400 bg-rose-500/15 border-rose-500/30' };
  };

  const bmiStatus = getBmiStatus(computedBmi);

  const handleInputChange = (field: keyof UserProfile, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleAddCondition = () => {
    if (!newCondition.trim()) return;
    setFormData((prev) => ({
      ...prev,
      primaryConditions: [...prev.primaryConditions, newCondition.trim()],
    }));
    setNewCondition('');
  };

  const handleRemoveCondition = (idx: number) => {
    setFormData((prev) => ({
      ...prev,
      primaryConditions: prev.primaryConditions.filter((_, i) => i !== idx),
    }));
  };

  const handleAddAllergy = () => {
    if (!newAllergy.trim()) return;
    setFormData((prev) => ({
      ...prev,
      knownAllergies: [...prev.knownAllergies, newAllergy.trim()],
    }));
    setNewAllergy('');
  };

  const handleRemoveAllergy = (idx: number) => {
    setFormData((prev) => ({
      ...prev,
      knownAllergies: prev.knownAllergies.filter((_, i) => i !== idx),
    }));
  };

  const handleAddMedication = () => {
    if (!newMedName.trim()) return;
    setFormData((prev) => ({
      ...prev,
      currentMedications: [
        ...prev.currentMedications,
        {
          name: newMedName.trim(),
          dosage: newMedDose.trim() || '10mg',
          frequency: newMedFreq.trim() || 'Daily',
        },
      ],
    }));
    setNewMedName('');
    setNewMedDose('');
    setNewMedFreq('');
  };

  const handleRemoveMedication = (idx: number) => {
    setFormData((prev) => ({
      ...prev,
      currentMedications: prev.currentMedications.filter((_, i) => i !== idx),
    }));
  };

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (max 8MB)
    if (file.size > 8 * 1024 * 1024) {
      alert('Photo size exceeds 8MB. Please select a smaller image.');
      return;
    }

    setIsUploadingPhoto(true);
    try {
      const formDataObj = new FormData();
      formDataObj.append('file', file);

      const res = await fetch('/api/avatar/upload', {
        method: 'POST',
        body: formDataObj,
      });

      if (res.ok) {
        const data = await res.json();
        const updated: UserProfile = {
          ...formData,
          avatarUrl: data.avatarUrl,
          photoBlobId: data.blobId,
          updatedAt: new Date().toISOString(),
        };
        setFormData(updated);
        await onSaveProfile(updated);
        setUploadBlobSuccess(data.blobId);
        setTimeout(() => setUploadBlobSuccess(null), 5000);
      } else {
        const errJson = await res.json();
        alert(`Upload error: ${errJson.error || 'Failed to store image on Walrus'}`);
      }
    } catch (err) {
      console.error('Failed to upload avatar to Walrus:', err);
      alert('Network error while transmitting avatar to Walrus Protocol.');
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const updated: UserProfile = {
        ...formData,
        computedBmi,
        updatedAt: new Date().toISOString(),
      };
      await onSaveProfile(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err) {
      console.error('Error saving profile:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 space-y-6 max-w-6xl mx-auto">
      {/* Toast Notification */}
      {saveSuccess && (
        <div className="fixed top-20 right-8 z-50 p-4 rounded-2xl bg-emerald-600 text-white shadow-2xl flex items-center gap-2.5 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-white" />
          <span className="text-xs font-bold">
            Health Profile Saved &amp; Synced to Walrus Memory! KIRO context updated.
          </span>
        </div>
      )}

      {/* Walrus Avatar Upload Toast */}
      {uploadBlobSuccess && (
        <div className="fixed top-20 left-8 z-50 p-4 rounded-2xl bg-cyan-600 text-white shadow-2xl flex items-center gap-2.5 animate-in fade-in">
          <Sparkles className="w-5 h-5 text-white" />
          <div>
            <div className="text-xs font-bold">Avatar Certified on Walrus Storage!</div>
            <div className="text-[10px] font-mono opacity-90 truncate max-w-xs">
              Blob: {uploadBlobSuccess}
            </div>
          </div>
        </div>
      )}

      {/* Hidden File Input for Avatar Upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handlePhotoSelect}
        className="hidden"
      />

      {/* Top Banner: Patient Overview & Sui Wallet Status */}
      <div className="p-6 sm:p-7 rounded-3xl bg-gradient-to-r from-purple-900/60 via-[#1B1E2E] to-[#12151E] border border-white/10 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* Left: Avatar + Bio Details */}
          <div className="flex items-center gap-4">
            {/* Interactive Avatar Card with Walrus Badge */}
            <div className="relative group shrink-0">
              <div
                onClick={() => !isUploadingPhoto && fileInputRef.current?.click()}
                className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-rose-500 via-purple-600 to-cyan-500 p-0.5 shadow-xl shadow-purple-500/30 cursor-pointer overflow-hidden transition-transform transform group-hover:scale-105 active:scale-95"
                title="Click to upload profile picture to Walrus"
              >
                <div className="w-full h-full rounded-[22px] bg-[#12151E] overflow-hidden flex items-center justify-center relative">
                  {formData.avatarUrl ? (
                    <img
                      src={formData.avatarUrl}
                      alt={formData.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-10 h-10 text-purple-300" />
                  )}

                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition-opacity">
                    <Camera className="w-5 h-5 text-cyan-300 mb-0.5" />
                    <span className="text-[9px] font-bold tracking-wider uppercase text-cyan-200">
                      Change
                    </span>
                  </div>

                  {/* Loading Spinner */}
                  {isUploadingPhoto && (
                    <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-white z-20">
                      <Loader2 className="w-6 h-6 animate-spin text-cyan-400 mb-1" />
                      <span className="text-[8px] font-bold text-cyan-300">Walrus Sync</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Upload badge indicator */}
              <button
                type="button"
                onClick={() => !isUploadingPhoto && fileInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-cyan-500 hover:bg-cyan-400 text-white shadow-md border-2 border-[#12151E] cursor-pointer transition-colors"
                title="Upload Photo directly to Walrus"
              >
                <Camera className="w-3 h-3" />
              </button>
            </div>

            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  {formData.name || 'Eleanor Vance'}
                </h1>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Age {formData.age}
                </span>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Blood {formData.bloodGroup}
                </span>
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${bmiStatus.color}`}>
                  BMI {computedBmi} • {bmiStatus.label}
                </span>
                {formData.photoBlobId && (
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 font-mono">
                    <Sparkles className="w-3 h-3 text-emerald-400" />
                    <span>Walrus Photo: {formData.photoBlobId.slice(0, 8)}...</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Personalized Clinical Profile • Authenticated via Sui Blockchain &amp; Decentralized Walrus Memory
              </p>
            </div>
          </div>

          {/* Right: Sui Wallet Pill + Ask KIRO Button */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {suiAccount ? (
              <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-md text-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-mono text-slate-200">
                  {suiAccount.address.slice(0, 6)}...{suiAccount.address.slice(-4)}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300">
                  {suiAccount.balanceSui} SUI
                </span>
              </div>
            ) : (
              <button
                onClick={onConnectWallet}
                className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white text-xs font-bold shadow-lg shadow-cyan-500/20 cursor-pointer transition-all"
              >
                <Wallet className="w-4 h-4" />
                <span>Connect Sui Wallet</span>
              </button>
            )}

            <button
              onClick={() => onAskKIRO('Analyze Eleanor’s health profile and summarize recommendations.')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 text-white text-xs font-bold cursor-pointer transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-rose-400" />
              <span>Ask KIRO AI</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Profile Form Grid */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* CARD 1: Core Demographics */}
          <div className="p-5 rounded-3xl bg-white dark:bg-[#141722] border border-slate-200 dark:border-white/10 shadow-lg space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-white/10">
              <User className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Core Demographics</h3>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  Age (Years)
                </label>
                <input
                  type="number"
                  value={formData.age}
                  onChange={(e) => handleInputChange('age', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  Biological Sex
                </label>
                <select
                  value={formData.gender}
                  onChange={(e) => handleInputChange('gender', e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                >
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="other">Other</option>
                  <option value="prefer_not_to_say">Prefer not to say</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                Blood Group
              </label>
              <select
                value={formData.bloodGroup}
                onChange={(e) => handleInputChange('bloodGroup', e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              >
                <option value="A+">A Positive (A+)</option>
                <option value="A-">A Negative (A-)</option>
                <option value="B+">B Positive (B+)</option>
                <option value="B-">B Negative (B-)</option>
                <option value="AB+">AB Positive (AB+)</option>
                <option value="AB-">AB Negative (AB-)</option>
                <option value="O+">O Positive (O+)</option>
                <option value="O-">O Negative (O-)</option>
              </select>
            </div>
          </div>

          {/* CARD 2: Physical Vitals & BMI */}
          <div className="p-5 rounded-3xl bg-white dark:bg-[#141722] border border-slate-200 dark:border-white/10 shadow-lg space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/10">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Live Biometrics</h3>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${bmiStatus.color}`}>
                BMI {computedBmi}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  Height (cm)
                </label>
                <input
                  type="number"
                  value={formData.heightCm}
                  onChange={(e) => handleInputChange('heightCm', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  Weight (kg)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.weightKg}
                  onChange={(e) => handleInputChange('weightKg', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  Blood Pressure (mmHg)
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    placeholder="120"
                    value={formData.systolicBp}
                    onChange={(e) => handleInputChange('systolicBp', parseInt(e.target.value) || 0)}
                    className="w-1/2 px-2.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-center"
                  />
                  <span className="text-slate-400 font-bold">/</span>
                  <input
                    type="number"
                    placeholder="80"
                    value={formData.diastolicBp}
                    onChange={(e) => handleInputChange('diastolicBp', parseInt(e.target.value) || 0)}
                    className="w-1/2 px-2.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-center"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  Pulse (bpm)
                </label>
                <input
                  type="number"
                  value={formData.heartRate}
                  onChange={(e) => handleInputChange('heartRate', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/50"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                Fasting Glucose (mg/dL)
              </label>
              <input
                type="number"
                value={formData.glucose}
                onChange={(e) => handleInputChange('glucose', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              />
            </div>
          </div>

          {/* CARD 3: Drug Allergies & Safety Contraindications */}
          <div className="p-5 rounded-3xl bg-white dark:bg-[#141722] border border-amber-500/40 shadow-lg space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-amber-500/20">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                Allergies &amp; Contraindications
              </h3>
            </div>

            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
              Safety rules enforced by KIRO across all clinical queries and medication suggestions.
            </p>

            <div className="flex flex-wrap gap-1.5 min-h-[48px]">
              {formData.knownAllergies.map((allergy, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs font-bold"
                >
                  <span>{allergy}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveAllergy(idx)}
                    className="hover:text-rose-900 dark:hover:text-white cursor-pointer"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="e.g. NSAIDs (Ibuprofen/Advil)"
                value={newAllergy}
                onChange={(e) => setNewAllergy(e.target.value)}
                className="flex-1 px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAddAllergy}
                className="p-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white cursor-pointer transition-colors"
                title="Add Allergy"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ROW 2: Conditions, Medications, and Care Team */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Conditions & Diagnoses */}
          <div className="p-5 rounded-3xl bg-white dark:bg-[#141722] border border-slate-200 dark:border-white/10 shadow-lg space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-white/10">
              <Heart className="w-4 h-4 text-rose-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Chronic Diagnoses &amp; Health Conditions
              </h3>
            </div>

            <div className="flex flex-wrap gap-1.5 min-h-[48px]">
              {formData.primaryConditions.map((cond, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-700 dark:text-purple-300 text-xs font-bold"
                >
                  <span>{cond}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveCondition(idx)}
                    className="hover:text-purple-900 dark:hover:text-white cursor-pointer"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="e.g. Acute Gastritis, AFib, Hypertension"
                value={newCondition}
                onChange={(e) => setNewCondition(e.target.value)}
                className="flex-1 px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAddCondition}
                className="p-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white cursor-pointer transition-colors"
                title="Add Condition"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Active Medications List */}
          <div className="p-5 rounded-3xl bg-white dark:bg-[#141722] border border-slate-200 dark:border-white/10 shadow-lg space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-white/10">
              <Pill className="w-4 h-4 text-emerald-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Active Medication Regimen
              </h3>
            </div>

            <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
              {formData.currentMedications.map((med, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-black/30 border border-slate-200/80 dark:border-white/5 text-xs"
                >
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white">{med.name}</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 ml-2">
                      {med.dosage} • {med.frequency}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveMedication(idx)}
                    className="text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-2">
              <input
                type="text"
                placeholder="Drug name"
                value={newMedName}
                onChange={(e) => setNewMedName(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
              />
              <input
                type="text"
                placeholder="Dosage (e.g. 10mg)"
                value={newMedDose}
                onChange={(e) => setNewMedDose(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
              />
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  placeholder="Freq (Daily)"
                  value={newMedFreq}
                  onChange={(e) => setNewMedFreq(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                />
                <button
                  type="button"
                  onClick={handleAddMedication}
                  className="p-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shrink-0"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ROW 3: Contacts & Save Button */}
        <div className="p-5 rounded-3xl bg-white dark:bg-[#141722] border border-slate-200 dark:border-white/10 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-2.5 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-white">
                Walrus Decentralized Clinical Sync
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Saving updates profile across sessions and encrypts observations to Walrus on Sui.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700 text-white font-bold text-xs shadow-xl shadow-purple-600/30 cursor-pointer transition-all disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Syncing to Walrus...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save &amp; Sync to Walrus Memory</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
