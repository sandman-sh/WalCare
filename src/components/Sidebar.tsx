'use client';

import React from 'react';
import {
  LayoutDashboard,
  FileText,
  Calendar,
  MessageSquare,
  Database,
  Settings,
  LogOut,
  Activity,
  UserCheck,
  RotateCcw,
  FolderLock,
  Heart,
  Stethoscope,
  User,
  Wallet,
} from 'lucide-react';
import { Caregiver } from '@/types/carecircle';
import { CAREGIVERS } from '@/lib/seedData';
import { SuiAccount } from './WalletModal';

export type ActiveTab = 'dashboard' | 'profile' | 'reports' | 'calendar' | 'chat' | 'vault' | 'console' | 'diff' | 'handover' | 'settings';

interface SidebarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  activeCaregiver: Caregiver;
  onCaregiverChange: (caregiver: Caregiver) => void;
  totalBlobs: number;
  totalDocs: number;
  onResetMemories: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  suiAccount?: SuiAccount | null;
  onConnectWallet?: () => void;
}

export function Sidebar({
  activeTab,
  onTabChange,
  activeCaregiver,
  onCaregiverChange,
  totalBlobs,
  totalDocs,
  onResetMemories,
  isMobileOpen,
  onCloseMobile,
  suiAccount,
  onConnectWallet,
}: SidebarProps) {
  const navItems = [
    {
      id: 'dashboard' as const,
      label: 'Dashboard',
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      id: 'profile' as const,
      label: 'Health Profile',
      icon: <User className="w-4 h-4" />,
      badge: 'Sui',
      badgeColor: 'bg-purple-500/20 text-purple-300 border border-purple-500/30',
    },
    {
      id: 'chat' as const,
      label: 'KIRO AI Partner',
      icon: <MessageSquare className="w-4 h-4" />,
      badge: 'KIRO',
      badgeColor: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
    },
    {
      id: 'reports' as const,
      label: 'Reports',
      icon: <FileText className="w-4 h-4" />,
      badge: `${totalDocs}`,
    },
    {
      id: 'calendar' as const,
      label: 'Calendar',
      icon: <Calendar className="w-4 h-4" />,
    },
    {
      id: 'vault' as const,
      label: 'Memory Vault',
      icon: <Database className="w-4 h-4" />,
      badge: `${totalBlobs}`,
      badgeColor: 'bg-purple-500/20 text-purple-300 border border-purple-500/30',
    },
    {
      id: 'console' as const,
      label: 'Walrus Console',
      icon: <FolderLock className="w-4 h-4" />,
      badge: 'Mainnet',
      badgeColor: 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30',
    },
    {
      id: 'settings' as const,
      label: 'Settings',
      icon: <Settings className="w-4 h-4" />,
    },
  ];

  const getCaregiverIcon = (id: string) => {
    if (id.includes('nurse')) return <Stethoscope className="w-4 h-4" />;
    if (id.includes('physio')) return <Activity className="w-4 h-4" />;
    return <Heart className="w-4 h-4" />;
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/70 z-40 md:hidden backdrop-blur-sm"
          onClick={onCloseMobile}
        />
      )}

      {/* WalCare Curved Sidebar Container */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-64 max-h-screen bg-[#12151E] dark:bg-[#12151E] text-slate-300 flex flex-col justify-between py-4 pl-4 pr-0 border-r border-white/5 transition-transform duration-300 md:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top: WalCare Healthcare Logo + Nav */}
        <div className="flex-1 min-h-0 flex flex-col">
          <div className="flex items-center gap-3 px-3 mb-4 cursor-pointer shrink-0" onClick={() => onTabChange('dashboard')}>
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-rose-500 via-purple-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-purple-500/30 ring-1 ring-white/20 p-1.5 shrink-0">
              <svg viewBox="0 0 40 40" className="w-6 h-6" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Translucent Medical Cross */}
                <rect x="17" y="5" width="6" height="30" rx="3" fill="white" fillOpacity="0.45" />
                <rect x="5" y="17" width="30" height="6" rx="3" fill="white" fillOpacity="0.45" />
                {/* Sharp Dynamic ECG Pulse Path */}
                <path
                  d="M 6 20 L 13 20 L 16 12 L 20 28 L 24 9 L 28 25 L 31 20 L 35 20"
                  stroke="#FFFFFF"
                  strokeWidth="2.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* High-Tech Pulse Marker Dot */}
                <circle cx="24" cy="9" r="2" fill="#38BDF8" stroke="#FFFFFF" strokeWidth="1" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-black tracking-tight text-white">WalCare</span>
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 uppercase tracking-wider">
                  Health AI
                </span>
              </div>
              <p className="text-[10px] font-medium text-slate-400">Clinical Memory &amp; Biometrics</p>
            </div>
          </div>

          {/* Navigation Links with Curved Tab Cutout */}
          <nav className="space-y-1 pr-1 overflow-y-auto min-h-0 flex-1 scrollbar-none">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onTabChange(item.id);
                    onCloseMobile();
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-semibold transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'vita-tab-active font-bold shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-white/5 rounded-xl'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={isActive ? 'text-rose-400' : 'text-slate-400'}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </div>

                  {item.badge && (
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full mr-2 ${
                        item.badgeColor || 'bg-white/10 text-slate-300'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section: Caregiver Switcher + Wallet Connect + Logout */}
        <div className="space-y-2.5 px-3 pr-4 shrink-0 pt-2 border-t border-white/5">
          {/* Caregiver Persona Switcher */}
          <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium mb-1.5">
              <span className="flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5 text-purple-400" />
                Persona: <strong className="text-purple-300 ml-0.5">{activeCaregiver.role}</strong>
              </span>
              <button
                onClick={onResetMemories}
                className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer transition-colors"
                title="Re-seed 30 Walrus Certified Memories"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-1">
              {CAREGIVERS.map((cg) => {
                const isSelected = activeCaregiver.id === cg.id;
                return (
                  <button
                    key={cg.id}
                    onClick={() => onCaregiverChange(cg)}
                    title={`${cg.name} (${cg.role})`}
                    className={`p-1.5 rounded-lg text-center text-xs transition-all cursor-pointer flex flex-col items-center justify-center ${
                      isSelected
                        ? 'bg-purple-600/80 text-white font-bold ring-1 ring-purple-300 shadow-sm'
                        : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <div className="text-purple-300 text-xs mb-0.5">{getCaregiverIcon(cg.id)}</div>
                    <div className="text-[10px] truncate max-w-full font-medium">{cg.name.split(' ')[0]}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sui Wallet Connect Card */}
          {suiAccount ? (
            <button
              onClick={onConnectWallet}
              className="w-full flex items-center justify-between p-2 rounded-xl bg-purple-500/15 border border-purple-500/30 text-xs text-purple-200 hover:bg-purple-500/25 transition-all cursor-pointer"
              title="Manage Sui Wallet & Walrus Storage"
            >
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-mono font-bold text-[11px] text-white">
                  {suiAccount.address.slice(0, 6)}...{suiAccount.address.slice(-4)}
                </span>
              </div>
              <span className="text-[10px] font-bold text-cyan-300 px-1.5 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/30">
                {suiAccount.balanceSui} SUI
              </span>
            </button>
          ) : (
            <button
              onClick={onConnectWallet}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold text-xs shadow-md shadow-cyan-600/20 transition-all cursor-pointer"
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>Connect Sui Wallet</span>
            </button>
          )}

          {/* Bottom Logout Button */}
          <button
            onClick={() => {
              if (confirm('Logout from WalCare session?')) {
                window.location.reload();
              }
            }}
            className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-400/20 via-rose-400/20 to-purple-400/20 hover:from-emerald-400/30 hover:to-purple-400/30 border border-white/10 text-xs font-bold text-white transition-all cursor-pointer shadow-sm"
          >
            <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-emerald-300 to-rose-300 text-black text-[10px] font-black tracking-wide">
              Logout
            </span>
            <LogOut className="w-3.5 h-3.5 text-slate-300" />
          </button>
        </div>
      </aside>
    </>
  );
}
