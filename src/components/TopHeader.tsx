'use client';

import React from 'react';
import {
  Menu,
  Plus,
  Trash2,
  Zap,
  Sun,
  Moon,
  ShieldAlert,
  Sparkles,
  Wallet,
} from 'lucide-react';
import { Caregiver, UserProfile } from '@/types/carecircle';
import { useTheme } from './ThemeProvider';
import { SuiAccount } from './WalletModal';

interface TopHeaderProps {
  title: string;
  activeCaregiver: Caregiver;
  isAmnesiaMode: boolean;
  onToggleAmnesia: () => void;
  onNewChat: () => void;
  onClearChat: () => void;
  onOpenMobileMenu: () => void;
  suiAccount?: SuiAccount | null;
  onConnectWallet?: () => void;
  userProfile?: UserProfile;
  onOpenProfile?: () => void;
}

export function TopHeader({
  title,
  activeCaregiver,
  isAmnesiaMode,
  onToggleAmnesia,
  onNewChat,
  onClearChat,
  onOpenMobileMenu,
  suiAccount,
  onConnectWallet,
  userProfile,
  onOpenProfile,
}: TopHeaderProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="h-16 px-4 sm:px-8 bg-white/80 dark:bg-[#12151E]/80 backdrop-blur-xl border-b border-slate-200/80 dark:border-white/5 flex items-center justify-between sticky top-0 z-20 transition-colors">
      {/* Left: Mobile Toggle + Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 md:hidden cursor-pointer transition-colors"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
            {title}
          </h2>

          {/* Patient Walrus Avatar Tag */}
          {userProfile && (
            <button
              onClick={onOpenProfile}
              className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 transition-colors cursor-pointer"
              title="Click to view & edit patient profile"
            >
              <div className="w-5 h-5 rounded-full overflow-hidden bg-purple-600 flex items-center justify-center shrink-0">
                {userProfile.avatarUrl ? (
                  <img src={userProfile.avatarUrl} alt={userProfile.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[10px] font-bold text-white">E</span>
                )}
              </div>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{userProfile.name}</span>
            </button>
          )}

          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-500/10 dark:bg-white/5 border border-purple-500/20 dark:border-white/10">
            <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">Persona:</span>
            <span className="text-xs font-bold text-purple-700 dark:text-purple-300">{activeCaregiver.name}</span>
          </div>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Sui Wallet Connect Button */}
        {suiAccount ? (
          <button
            onClick={onConnectWallet}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-xs font-semibold hover:bg-purple-500/25 transition-all cursor-pointer"
            title="Sui Mainnet Connected"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 hidden sm:inline">
              {suiAccount.address.slice(0, 6)}...{suiAccount.address.slice(-4)}
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-700 dark:text-cyan-300">
              {suiAccount.balanceSui} SUI
            </span>
          </button>
        ) : (
          <button
            onClick={onConnectWallet}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white text-xs font-bold shadow-md shadow-cyan-500/20 cursor-pointer transition-all"
          >
            <Wallet className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Connect Sui</span>
            <span className="sm:hidden">Sui</span>
          </button>
        )}
        {/* Amnesia Mode Toggle */}
        <button
          onClick={onToggleAmnesia}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold tracking-wide cursor-pointer transition-all ${
            isAmnesiaMode
              ? 'bg-rose-500/20 text-rose-600 dark:text-rose-300 border border-rose-500/40 ring-2 ring-rose-500/30 animate-pulse'
              : 'bg-purple-500/15 hover:bg-purple-500/25 text-purple-700 dark:text-purple-300 border border-purple-500/30'
          }`}
          title="Toggle Amnesia Mode (simulates an AI with zero memory)"
        >
          {isAmnesiaMode ? (
            <>
              <ShieldAlert className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />
              <span>Amnesia Active (No Memory)</span>
            </>
          ) : (
            <>
              <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500 dark:text-yellow-400 dark:fill-yellow-400" />
              <span className="hidden sm:inline">Walrus Memory Active</span>
              <span className="sm:hidden">Memory ON</span>
            </>
          )}
        </button>

        {/* New Chat Button */}
        <button
          onClick={onNewChat}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-xs font-bold shadow-md shadow-emerald-950/20 cursor-pointer transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">New Session</span>
        </button>

        {/* Clear Chat Button */}
        <button
          onClick={onClearChat}
          className="p-2 rounded-full bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
          title="Clear current conversation"
        >
          <Trash2 className="w-4 h-4" />
        </button>

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-800 dark:text-slate-200 transition-all cursor-pointer border border-slate-300/80 dark:border-white/10 font-bold text-xs shadow-xs"
          title="Toggle Light / Dark mode"
        >
          {theme === 'dark' ? (
            <>
              <Sun className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline text-amber-300">Light</span>
            </>
          ) : (
            <>
              <Moon className="w-4 h-4 text-purple-600" />
              <span className="hidden sm:inline text-purple-700">Dark</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
}
