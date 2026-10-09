'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Sidebar, ActiveTab } from '@/components/Sidebar';
import { TopHeader } from '@/components/TopHeader';
import { DashboardView } from '@/components/DashboardView';
import { ChatInterface } from '@/components/ChatInterface';
import { MemoryVault } from '@/components/MemoryVault';
import { ConsoleVault } from '@/components/ConsoleVault';
import { HandoverView } from '@/components/HandoverView';
import { SettingsView } from '@/components/SettingsView';
import { ProfileView } from '@/components/ProfileView';
import { WalletModal, SuiAccount } from '@/components/WalletModal';
import { AmnesiaDiffModal } from '@/components/AmnesiaDiffModal';
import { Plus, Trash2, Calendar as CalendarIcon, CheckCircle2, Clock } from 'lucide-react';
import { CAREGIVERS, PATIENT_PROFILE } from '@/lib/seedData';
import { Caregiver, ChatMessage, MemoryCategory, UserProfile } from '@/types/carecircle';

export interface CalendarEvent {
  id: string;
  title: string;
  subtitle: string;
  time: string;
  type: 'shift' | 'appointment';
  status: 'Completed' | 'Upcoming' | 'Confirmed';
}

const DEFAULT_CALENDAR_ITEMS: CalendarEvent[] = [
  {
    id: 'cal_1',
    title: '08:00 AM — Morning Vitals & Breakfast',
    subtitle: 'Sarah (Daughter) • BP & Pulse check',
    time: '08:00 AM',
    type: 'shift',
    status: 'Completed',
  },
  {
    id: 'cal_2',
    title: '12:30 PM — Wound Dressing & Telemetry Check',
    subtitle: 'Elena Rostova (RN) • Forearm dressing, No NSAIDs!',
    time: '12:30 PM',
    type: 'shift',
    status: 'Completed',
  },
  {
    id: 'cal_3',
    title: '04:00 PM — Physical Therapy Gait Session',
    subtitle: 'David Chen (DPT) • Quad-strengthening, TUG 12.4s',
    time: '04:00 PM',
    type: 'shift',
    status: 'Upcoming',
  },
  {
    id: 'cal_4',
    title: 'Dr. Rachel Greene (Cardiology)',
    subtitle: 'June 4, 10:00 AM • Telehealth Holter Review',
    time: 'June 4, 10:00 AM',
    type: 'appointment',
    status: 'Confirmed',
  },
  {
    id: 'cal_5',
    title: 'Dr. Ben Affleck (Orthopaedic Surgeon)',
    subtitle: 'June 8, 02:00 PM • Right Knee Joint Evaluation',
    time: 'June 8, 02:00 PM',
    type: 'appointment',
    status: 'Confirmed',
  },
];

// Demo profile shown to guest users who haven't connected a wallet
const DEMO_USER_PROFILE: UserProfile = {
  walletAddress: '0x7a8b9cf4e2193f12',
  name: 'Eleanor Vance',
  age: 88,
  gender: 'female',
  dateOfBirth: '1936-04-12',
  bloodGroup: 'O+',
  heightCm: 162,
  weightKg: 64,
  computedBmi: 24.4,
  systolicBp: 138,
  diastolicBp: 85,
  heartRate: 110,
  glucose: 104,
  primaryConditions: ['Acute Gastritis (Melena)', 'Atrial Fibrillation (AFib)', 'Mild Cognitive Impairment'],
  knownAllergies: ['NSAIDs (Ibuprofen / Advil / Naproxen)', 'Penicillin'],
  currentMedications: [
    { name: 'Meloxicam', dosage: '7.5mg', frequency: 'DISCONTINUED (GI Bleed)' },
    { name: 'Lisinopril', dosage: '10mg', frequency: 'Daily Morning' },
    { name: 'Donepezil', dosage: '5mg', frequency: 'Nightly' },
  ],
  emergencyContact: {
    name: 'Sarah Miller',
    phone: '+1-555-0192',
    relation: 'Daughter (Primary Caregiver)',
  },
  physician: 'Dr. Robert Adams, MD (Geriatric Specialist)',
  walrusNamespace: 'walcare-patient-active',
  updatedAt: new Date().toISOString(),
};

/**
 * Creates a fresh blank profile for a newly connected wallet user.
 * The user fills in their own health data — no mocked data.
 */
const createBlankProfile = (walletAddress: string): UserProfile => ({
  walletAddress,
  name: '',
  age: 0,
  gender: 'prefer_not_to_say',
  dateOfBirth: '',
  bloodGroup: 'Unknown',
  heightCm: 0,
  weightKg: 0,
  computedBmi: 0,
  systolicBp: 0,
  diastolicBp: 0,
  heartRate: 0,
  glucose: 0,
  primaryConditions: [],
  knownAllergies: [],
  currentMedications: [],
  emergencyContact: {
    name: '',
    phone: '',
    relation: '',
  },
  physician: '',
  walrusNamespace: `walcare-${walletAddress.slice(0, 10)}`,
  updatedAt: new Date().toISOString(),
});

/** Load a wallet-keyed profile from localStorage, or return null if none exists */
const loadWalletProfile = (walletAddress: string): UserProfile | null => {
  try {
    const saved = localStorage.getItem(`walcare_profile_${walletAddress}`);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.warn('Could not load wallet profile:', e);
  }
  return null;
};

/** Persist a profile keyed by wallet address */
const saveWalletProfile = (profile: UserProfile) => {
  try {
    localStorage.setItem(`walcare_profile_${profile.walletAddress}`, JSON.stringify(profile));
    // Also keep the generic key for backward compat
    localStorage.setItem('walcare_user_profile', JSON.stringify(profile));
  } catch (e) {
    console.warn('Could not save wallet profile:', e);
  }
};

export default function CareCirclePage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [activeCaregiver, setActiveCaregiver] = useState<Caregiver>(CAREGIVERS[0]);
  const [isAmnesiaMode, setIsAmnesiaMode] = useState<boolean>(false);
  const [isMobileOpen, setIsMobileOpen] = useState<boolean>(false);
  const [totalBlobs, setTotalBlobs] = useState<number>(30);
  const [totalDocs, setTotalDocs] = useState<number>(5);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Sui Wallet & User Profile State
  const [suiAccount, setSuiAccount] = useState<SuiAccount | null>(null);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState<boolean>(false);
  const [isGuestMode, setIsGuestMode] = useState<boolean>(true);
  const [userProfile, setUserProfile] = useState<UserProfile>(DEMO_USER_PROFILE);

  // Active Caregiver Actor: personal authenticated user if wallet connected, otherwise demo caregiver
  const currentUserCaregiver: Caregiver = useMemo(() => {
    if (!isGuestMode && suiAccount) {
      return {
        id: suiAccount.address,
        name: userProfile.name || `Sui User (${suiAccount.address.slice(0, 6)}...)`,
        role: 'patient',
        title: 'Authenticated Patient / Account Owner',
        badge: 'Sui Verified',
        avatar: userProfile.avatarUrl || '👤',
        color: 'from-cyan-500 to-purple-600',
        shiftHours: '24/7 Personal Access',
        responsibilities: ['Self-care monitoring', 'Clinical record owner', 'Decentralized consent manager'],
      };
    }
    return activeCaregiver;
  }, [isGuestMode, suiAccount, userProfile, activeCaregiver]);

  const handleToggleGuestMode = () => {
    setIsGuestMode((prev) => {
      const next = !prev;
      if (next) {
        setUserProfile(DEMO_USER_PROFILE);
      } else if (suiAccount) {
        const prof = loadWalletProfile(suiAccount.address) || createBlankProfile(suiAccount.address);
        setUserProfile(prof);
      }
      return next;
    });
  };

  // Chat message stream state
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Amnesia Diff Modal state
  const [diffModal, setDiffModal] = useState<{
    isOpen: boolean;
    prompt: string;
    memoryReply: string;
    amnesiaReply: string;
  }>({
    isOpen: false,
    prompt: '',
    memoryReply: '',
    amnesiaReply: '',
  });

  // Interactive Calendar state
  const [calendarItems, setCalendarItems] = useState<CalendarEvent[]>(DEFAULT_CALENDAR_ITEMS);
  const [showNewEventModal, setShowNewEventModal] = useState<boolean>(false);
  const [newEventTitle, setNewEventTitle] = useState<string>('');
  const [newEventSubtitle, setNewEventSubtitle] = useState<string>('');
  const [newEventTime, setNewEventTime] = useState<string>('');
  const [newEventType, setNewEventType] = useState<'shift' | 'appointment'>('shift');

  const fetchVaultStats = async () => {
    try {
      const res = await fetch('/api/memory');
      if (res.ok) {
        const data = await res.json();
        if (data.stats?.total) {
          setTotalBlobs(data.stats.total);
        }
      }
    } catch (err) {
      console.warn('Could not fetch vault stats:', err);
    }
  };

  const fetchConsoleStats = useCallback(async (address?: string, guest?: boolean) => {
    try {
      const isGuest = guest !== undefined ? guest : isGuestMode;
      const targetAddress = address !== undefined ? address : suiAccount?.address;
      const params = new URLSearchParams();
      if (targetAddress) params.append('walletAddress', targetAddress);
      params.append('isGuest', isGuest ? 'true' : 'false');

      const res = await fetch(`/api/console?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.files) {
          setTotalDocs(data.files.length);
        }
      }
    } catch (err) {
      console.warn('Could not fetch console stats:', err);
    }
  }, [isGuestMode, suiAccount?.address]);

  useEffect(() => {
    fetchVaultStats();

    // Restore saved wallet & wallet-keyed profile from localStorage
    try {
      const savedWallet = localStorage.getItem('walcare_sui_account');
      if (savedWallet) {
        const parsedWallet = JSON.parse(savedWallet);
        setSuiAccount(parsedWallet);
        setIsGuestMode(false);

        // Load this wallet's profile (wallet-keyed), or create blank if first time
        const walletProfile = loadWalletProfile(parsedWallet.address);
        if (walletProfile) {
          setUserProfile(walletProfile);
        } else {
          // First login with this wallet — start with blank profile
          const blank = createBlankProfile(parsedWallet.address);
          saveWalletProfile(blank);
          setUserProfile(blank);
        }
        fetchConsoleStats(parsedWallet.address, false);
      } else {
        // No wallet connected — start in guest mode with demo profile
        setIsGuestMode(true);
        setUserProfile(DEMO_USER_PROFILE);
        fetchConsoleStats(undefined, true);
      }
      const savedCal = localStorage.getItem('walcare_calendar_items');
      if (savedCal) {
        setCalendarItems(JSON.parse(savedCal));
      }
    } catch (e) {
      console.warn('Could not restore local storage items:', e);
    }
  }, []);

  const handleAddCalendarEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventTitle.trim()) return;
    const item: CalendarEvent = {
      id: `cal_${Date.now()}`,
      title: newEventTitle.trim(),
      subtitle: newEventSubtitle.trim() || (newEventType === 'shift' ? 'Caregiver shift' : 'Clinical visit'),
      time: newEventTime.trim() || 'Scheduled',
      type: newEventType,
      status: 'Upcoming',
    };
    const updated = [item, ...calendarItems];
    setCalendarItems(updated);
    localStorage.setItem('walcare_calendar_items', JSON.stringify(updated));
    setShowNewEventModal(false);
    setNewEventTitle('');
    setNewEventSubtitle('');
    setNewEventTime('');
  };

  const handleDeleteCalendarEvent = (id: string) => {
    const updated = calendarItems.filter((i) => i.id !== id);
    setCalendarItems(updated);
    localStorage.setItem('walcare_calendar_items', JSON.stringify(updated));
  };

  const handleToggleCalendarStatus = (id: string) => {
    const updated = calendarItems.map((i) => {
      if (i.id === id) {
        return {
          ...i,
          status: (i.status === 'Completed' ? 'Upcoming' : 'Completed') as CalendarEvent['status'],
        };
      }
      return i;
    });
    setCalendarItems(updated);
    localStorage.setItem('walcare_calendar_items', JSON.stringify(updated));
  };

  const handleSaveProfile = async (updated: UserProfile) => {
    setUserProfile(updated);
    saveWalletProfile(updated);

    // Also persist observation to live Walrus Memory
    try {
      await fetch('/api/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `Patient Profile Synced: ${updated.name} (Age ${updated.age}, Blood ${updated.bloodGroup}). BP ${updated.systolicBp}/${updated.diastolicBp} mmHg, Pulse ${updated.heartRate} bpm, Weight ${updated.weightKg}kg, BMI ${updated.computedBmi}. Conditions: ${updated.primaryConditions.join(', ')}. Drug Contraindications: ${updated.knownAllergies.join(', ')}.`,
          authorId: activeCaregiver.id,
          category: 'vitals',
          isSafetyCritical: updated.knownAllergies.length > 0,
        }),
      });
      await fetchVaultStats();
    } catch (err) {
      console.warn('Failed to sync profile to Walrus Memory:', err);
    }
  };

  const handleSendMessage = async (text: string, category?: MemoryCategory) => {
    const userMsgId = `user_${Date.now()}`;
    const newMsg: ChatMessage = {
      id: userMsgId,
      sender: 'user',
      authorId: currentUserCaregiver.id,
      authorName: currentUserCaregiver.name,
      authorRole: currentUserCaregiver.role,
      content: text,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, newMsg]);
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          authorId: currentUserCaregiver.id,
          caregiver: currentUserCaregiver,
          isAmnesiaMode,
          chatHistory: messages.slice(-4),
          userProfile: isGuestMode ? DEMO_USER_PROFILE : userProfile,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const aiMsg: ChatMessage = {
          id: `ai_${Date.now()}`,
          sender: 'assistant',
          content: data.reply,
          timestamp: data.timestamp || new Date().toISOString(),
          recalledMemories: data.recalledMemories,
          safetyAlert: data.safetyAlert,
          amnesiaAlternative: data.amnesiaAlternative,
          persistedBlobs: data.persistedBlobs,
          actionExecuted: data.actionExecuted,
        };
        setMessages((prev) => [...prev, aiMsg]);

        // Process natural language bot actions on client state
        if (data.actionExecuted) {
          if (data.actionExecuted.type === 'update_vitals' && data.actionExecuted.details) {
            setUserProfile((prev) => {
              const next = { ...prev, ...data.actionExecuted.details };
              if (data.actionExecuted.details.heightCm || data.actionExecuted.details.weightKg) {
                const h = (next.heightCm || 160) / 100;
                next.computedBmi = Number((next.weightKg / (h * h)).toFixed(1));
              }
              saveWalletProfile(next);
              return next;
            });
          } else if (data.actionExecuted.type === 'update_profile' && data.actionExecuted.details) {
            setUserProfile((prev) => {
              const next = { ...prev, ...data.actionExecuted.details };
              if (data.actionExecuted.details.newAllergy) {
                next.knownAllergies = Array.from(new Set([...next.knownAllergies, data.actionExecuted.details.newAllergy]));
              }
              saveWalletProfile(next);
              return next;
            });
          }
        }

        await fetchVaultStats();
      } else {
        const errorMsg: ChatMessage = {
          id: `err_${Date.now()}`,
          sender: 'assistant',
          content: 'Error: Unable to connect to KIRO AI or Walrus Relayer. Please check settings.',
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      }
    } catch (err) {
      console.error('Chat error:', err);
      const errorMsg: ChatMessage = {
        id: `err_${Date.now()}`,
        sender: 'assistant',
        content: 'Network connection error while communicating with KIRO health engine.',
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetMemories = async () => {
    if (confirm('Reset Walrus memory repository back to 30 baseline certified memories?')) {
      try {
        const res = await fetch('/api/memory', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'reset' }),
        });
        if (res.ok) {
          await fetchVaultStats();
          setMessages([]);
          alert('Successfully re-seeded 30 Walrus memories across all caregivers.');
        }
      } catch (err) {
        console.error('Failed to reset memory:', err);
      }
    }
  };

  const getTabTitle = () => {
    switch (activeTab) {
      case 'dashboard':
        return 'WalCare Healthcare';
      case 'profile':
        return 'Personal Health Profile • Sui Identity & Biometrics';
      case 'reports':
        return 'Clinical Reports & Handover Records';
      case 'calendar':
        return 'Caregiver Schedule & Medication Timetable';
      case 'chat':
        return 'KIRO AI Health Partner (Walrus Memory)';
      case 'vault':
        return 'Walrus Decentralized Memory Vault';
      case 'console':
        return 'Walrus Console (Decentralized Storage & SEAL)';
      case 'diff':
        return 'Amnesia Diff Lab (Proof of Memory)';
      case 'handover':
        return 'Shift Handover Briefing';
      case 'settings':
        return 'Protocol Settings & Sui Relayer';
      default:
        return 'WalCare Healthcare';
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#F4F6FA] dark:bg-[#0B0D14] text-slate-900 dark:text-white font-sans antialiased">
      {/* WalCare Curved Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={(tab) => {
          if (tab === 'diff') {
            setDiffModal({
              isOpen: true,
              prompt: '',
              memoryReply: '',
              amnesiaReply: '',
            });
          } else {
            setActiveTab(tab);
          }
        }}
        activeCaregiver={currentUserCaregiver}
        onCaregiverChange={setActiveCaregiver}
        totalBlobs={totalBlobs}
        totalDocs={totalDocs}
        onResetMemories={handleResetMemories}
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
        suiAccount={suiAccount}
        onConnectWallet={() => setIsWalletModalOpen(true)}
        userProfile={userProfile}
        isGuestMode={isGuestMode}
        onToggleGuestMode={handleToggleGuestMode}
      />

      {/* Main Content View Container */}
      <main className="flex-1 min-h-0 flex flex-col h-full overflow-hidden bg-[#F4F6FA] dark:bg-[#0B0D14] relative">
        {/* Top Header */}
        <TopHeader
          title={getTabTitle()}
          activeCaregiver={currentUserCaregiver}
          isAmnesiaMode={isAmnesiaMode}
          onToggleAmnesia={() => setIsAmnesiaMode((prev) => !prev)}
          onNewChat={() => {
            setMessages([]);
            setActiveTab('chat');
          }}
          onClearChat={() => setMessages([])}
          onOpenMobileMenu={() => setIsMobileOpen(true)}
          suiAccount={suiAccount}
          onConnectWallet={() => setIsWalletModalOpen(true)}
          userProfile={userProfile}
          onOpenProfile={() => setActiveTab('profile')}
          isGuestMode={isGuestMode}
        />

        {/* View Switcher */}
        {activeTab === 'dashboard' && (
          <DashboardView
            activeCaregiver={currentUserCaregiver}
            onNavigateToTab={(tab) => setActiveTab(tab)}
            onQuickAskAI={(prompt) => {
              handleSendMessage(prompt);
            }}
            totalBlobs={totalBlobs}
            totalDocs={totalDocs}
            userProfile={userProfile}
            suiAccount={suiAccount}
            isGuestMode={isGuestMode}
            onSaveUserProfile={handleSaveProfile}
          />
        )}

        {activeTab === 'profile' && (
          <ProfileView
            profile={userProfile}
            onSaveProfile={handleSaveProfile}
            suiAccount={suiAccount}
            onConnectWallet={() => setIsWalletModalOpen(true)}
            onAskKIRO={(prompt) => {
              handleSendMessage(prompt);
              setActiveTab('chat');
            }}
          />
        )}

        {activeTab === 'chat' && (
          <div className="flex-1 min-h-0 flex flex-col h-full overflow-hidden">
            <ChatInterface
              messages={messages}
              onSendMessage={handleSendMessage}
              isLoading={isLoading}
              activeCaregiver={currentUserCaregiver}
              onCaregiverChange={setActiveCaregiver}
              isAmnesiaMode={isAmnesiaMode}
              onOpenDiffModal={(userPrompt, memoryReply, amnesiaReply) => {
                setDiffModal({
                  isOpen: true,
                  prompt: userPrompt,
                  memoryReply,
                  amnesiaReply,
                });
              }}
              userProfile={userProfile}
              suiAccount={suiAccount}
              isGuestMode={isGuestMode}
              onSwitchToGuest={() => {
                setIsGuestMode(true);
                setUserProfile(DEMO_USER_PROFILE);
                fetchConsoleStats(undefined, true);
              }}
            />
          </div>
        )}

        {activeTab === 'reports' && (
          <ConsoleVault
            suiAccount={suiAccount}
            isGuestMode={isGuestMode}
            userProfile={userProfile}
            onStatsUpdated={(count) => setTotalDocs(count)}
            onOpenWalletModal={() => setIsWalletModalOpen(true)}
          />
        )}

        {activeTab === 'calendar' && (
          <div className="flex-1 p-6 sm:p-8 overflow-y-auto max-w-5xl mx-auto space-y-6">
            <div className="p-6 rounded-3xl bg-gradient-to-r from-purple-900/60 via-purple-950 to-[#12151E] border border-white/10 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[11px] font-bold">
                  Caregiver Schedule
                </span>
                <h2 className="text-2xl font-black text-white mt-1">
                  {userProfile.name || (isGuestMode ? 'Eleanor Vance' : 'Personal')} • Care Calendar
                </h2>
                <p className="text-xs text-slate-300 mt-1">
                  Scheduled shifts, telehealth visits, physical therapy, and medication times.
                </p>
              </div>

              <button
                onClick={() => setShowNewEventModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-bold text-xs shadow-lg shadow-purple-950/40 cursor-pointer transition-all self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                <span>Schedule Event</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Daily Caregiver Shifts & Visits */}
              <div className="p-5 rounded-3xl bg-white dark:bg-[#141722] border border-slate-200 dark:border-white/10 shadow-lg space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    Today&apos;s Shifts & Visits
                  </h3>
                  <span className="text-[11px] font-semibold text-slate-400">
                    {calendarItems.filter((i) => i.type === 'shift').length} Shifts
                  </span>
                </div>

                <div className="space-y-2.5 text-xs">
                  {calendarItems.filter((i) => i.type === 'shift').length === 0 ? (
                    <div className="p-6 text-center text-slate-400 text-xs">No caregiver shifts scheduled.</div>
                  ) : (
                    calendarItems
                      .filter((i) => i.type === 'shift')
                      .map((item) => (
                        <div
                          key={item.id}
                          className="p-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/5 flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-slate-900 dark:text-white truncate">
                              {item.title}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                              {item.subtitle}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => handleToggleCalendarStatus(item.id)}
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition-colors ${
                                item.status === 'Completed'
                                  ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300'
                                  : 'bg-amber-500/20 text-amber-600 dark:text-yellow-300'
                              }`}
                            >
                              {item.status}
                            </button>
                            <button
                              onClick={() => handleDeleteCalendarEvent(item.id)}
                              className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                              title="Delete Event"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>

              {/* Clinical Appointments */}
              <div className="p-5 rounded-3xl bg-white dark:bg-[#141722] border border-slate-200 dark:border-white/10 shadow-lg space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-500" />
                    Clinical Appointments
                  </h3>
                  <span className="text-[11px] font-semibold text-slate-400">
                    {calendarItems.filter((i) => i.type === 'appointment').length} Appointments
                  </span>
                </div>

                <div className="space-y-2.5 text-xs">
                  {calendarItems.filter((i) => i.type === 'appointment').length === 0 ? (
                    <div className="p-6 text-center text-slate-400 text-xs">No clinical appointments scheduled.</div>
                  ) : (
                    calendarItems
                      .filter((i) => i.type === 'appointment')
                      .map((item) => (
                        <div
                          key={item.id}
                          className="p-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/5 flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-slate-900 dark:text-white truncate">
                              {item.title}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                              {item.subtitle}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-600 dark:text-cyan-300 text-[10px] font-bold">
                              {item.status}
                            </span>
                            <button
                              onClick={() => handleDeleteCalendarEvent(item.id)}
                              className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                              title="Delete Event"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>
            </div>

            {/* Schedule New Event Modal */}
            {showNewEventModal && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
                onClick={() => setShowNewEventModal(false)}
              >
                <div
                  className="w-full max-w-md p-6 rounded-3xl bg-[#171A24] border border-white/20 shadow-2xl text-white space-y-4"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between pb-3 border-b border-white/10">
                    <h3 className="text-lg font-bold">Schedule Shift or Appointment</h3>
                    <button
                      onClick={() => setShowNewEventModal(false)}
                      className="text-slate-400 hover:text-white text-xs cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>

                  <form onSubmit={handleAddCalendarEvent} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Category Type
                      </label>
                      <select
                        value={newEventType}
                        onChange={(e) => setNewEventType(e.target.value as 'shift' | 'appointment')}
                        className="w-full p-2.5 rounded-xl bg-[#141722] border border-white/10 text-xs text-white focus:outline-none"
                      >
                        <option value="shift">Caregiver Shift / Daily Visit</option>
                        <option value="appointment">Clinical / Telehealth Appointment</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Title / Activity
                      </label>
                      <input
                        type="text"
                        value={newEventTitle}
                        onChange={(e) => setNewEventTitle(e.target.value)}
                        placeholder={newEventType === 'shift' ? 'e.g. 06:00 PM — Evening Medication Check' : 'e.g. Dr. Adams — Neurological Follow-up'}
                        className="w-full p-2.5 rounded-xl bg-[#141722] border border-white/10 text-xs text-white focus:outline-none"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Caregiver / Clinician & Details
                      </label>
                      <input
                        type="text"
                        value={newEventSubtitle}
                        onChange={(e) => setNewEventSubtitle(e.target.value)}
                        placeholder="e.g. Sarah Miller • BP monitoring and dinner"
                        className="w-full p-2.5 rounded-xl bg-[#141722] border border-white/10 text-xs text-white focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Scheduled Time / Date
                      </label>
                      <input
                        type="text"
                        value={newEventTime}
                        onChange={(e) => setNewEventTime(e.target.value)}
                        placeholder="e.g. June 10, 04:30 PM"
                        className="w-full p-2.5 rounded-xl bg-[#141722] border border-white/10 text-xs text-white focus:outline-none"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowNewEventModal(false)}
                        className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-xs font-bold shadow-md cursor-pointer"
                      >
                        Save to Calendar
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'vault' && <MemoryVault onRefreshMemories={fetchVaultStats} />}

        {activeTab === 'console' && (
          <ConsoleVault
            suiAccount={suiAccount}
            isGuestMode={isGuestMode}
            userProfile={userProfile}
            onStatsUpdated={(count) => setTotalDocs(count)}
            onOpenWalletModal={() => setIsWalletModalOpen(true)}
          />
        )}

        {activeTab === 'handover' && (
          <HandoverView
            suiAccount={suiAccount}
            isGuestMode={isGuestMode}
            userProfile={userProfile}
          />
        )}

        {activeTab === 'settings' && <SettingsView />}
      </main>

      {/* Sui Wallet Connect Modal */}
      <WalletModal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
        account={suiAccount}
        onConnect={(acc) => {
          setSuiAccount(acc);
          setIsGuestMode(false);
          localStorage.setItem('walcare_sui_account', JSON.stringify(acc));

          // Load existing profile for this wallet, or create a fresh blank one
          const existingProfile = loadWalletProfile(acc.address);
          if (existingProfile) {
            setUserProfile(existingProfile);
          } else {
            const blank = createBlankProfile(acc.address);
            saveWalletProfile(blank);
            setUserProfile(blank);
          }

          fetchConsoleStats(acc.address, false);
          setIsWalletModalOpen(false);
          // Navigate to profile so user can fill in their health data
          setActiveTab('profile');
        }}
        onDisconnect={() => {
          setSuiAccount(null);
          setIsGuestMode(true);
          localStorage.removeItem('walcare_sui_account');
          // Revert to demo profile for guest experience
          setUserProfile(DEMO_USER_PROFILE);
          fetchConsoleStats(undefined, true);
        }}
        onContinueGuest={() => {
          setIsGuestMode(true);
          setIsWalletModalOpen(false);
          fetchConsoleStats(undefined, true);
        }}
        onOpenProfile={() => setActiveTab('profile')}
      />

      {/* Counterfactual Amnesia Diff Lab Modal */}
      <AmnesiaDiffModal
        isOpen={diffModal.isOpen}
        onClose={() => setDiffModal((prev) => ({ ...prev, isOpen: false }))}
        customPrompt={diffModal.prompt}
        customMemoryReply={diffModal.memoryReply}
        customAmnesiaReply={diffModal.amnesiaReply}
      />
    </div>
  );
}
