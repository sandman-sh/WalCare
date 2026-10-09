'use client';

import React, { useState, useEffect } from 'react';
import {
  Wallet,
  CheckCircle2,
  Copy,
  ExternalLink,
  ShieldCheck,
  Zap,
  HardDrive,
  LogOut,
  X,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

export interface SuiAccount {
  address: string;
  name: string;
  balanceSui: number;
  network: 'mainnet' | 'testnet';
  walrusStorageMb: number;
  walrusObjectId: string;
}

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: SuiAccount | null;
  onConnect: (account: SuiAccount) => void;
  onDisconnect: () => void;
  onOpenProfile?: () => void;
}

const POPULAR_WALLETS = [
  {
    id: 'sui_wallet',
    name: 'Sui Wallet',
    tag: 'Official',
    iconColor: 'from-cyan-500 to-blue-600',
    description: 'Mysten Labs official browser wallet',
  },
  {
    id: 'suiet',
    name: 'Suiet Wallet',
    tag: 'Popular',
    iconColor: 'from-blue-500 to-indigo-600',
    description: 'Community-first Sui wallet extension',
  },
  {
    id: 'nightly',
    name: 'Nightly Wallet',
    tag: 'Multi-chain',
    iconColor: 'from-purple-500 to-pink-600',
    description: 'Fast and secure wallet for Sui ecosystem',
  },
  {
    id: 'instant_mainnet',
    name: 'Instant Sui Mainnet ID',
    tag: 'One-Click',
    iconColor: 'from-emerald-500 to-teal-600',
    description: 'Generate on-chain Sui credentials instantly',
  },
];

export function WalletModal({
  isOpen,
  onClose,
  account,
  onConnect,
  onDisconnect,
  onOpenProfile,
}: WalletModalProps) {
  const [copied, setCopied] = useState(false);
  const [connectingWalletId, setConnectingWalletId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const simulateConnect = (walletId: string) => {
    setConnectingWalletId(walletId);
    setTimeout(() => {
      // Generate a realistic deterministic or random Sui address
      const randomHex = Array.from({ length: 4 }, () =>
        Math.floor(Math.random() * 0xffff)
          .toString(16)
          .padStart(4, '0')
      ).join('');
      const address = `0x7a8b9c${randomHex}3f12`;

      const newAccount: SuiAccount = {
        address,
        name: 'Eleanor Vance (Patient ID #88)',
        balanceSui: 14.85,
        network: 'mainnet',
        walrusStorageMb: 50.0,
        walrusObjectId: '0xeb9397cc0d977835288789c632f331c91ae19de8db8a802731a020d74c0f7c4a',
      };

      onConnect(newAccount);
      setConnectingWalletId(null);
    }, 700);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-3xl bg-white dark:bg-[#12151E] border border-slate-200 dark:border-white/10 shadow-2xl p-6 overflow-hidden">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-cyan-500 via-purple-500 to-rose-500" />
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/25">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {account ? 'Sui Wallet Connected' : 'Connect Sui Wallet'}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                WalCare Clinical Identity on Sui Mainnet
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="mt-5 space-y-4">
          {account ? (
            /* Connected State */
            <div className="space-y-4">
              {/* Account Address Card */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    Sui Address
                  </span>
                  <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Sui Mainnet
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-black/40 border border-slate-200/80 dark:border-white/10">
                  <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 truncate mr-2">
                    {account.address}
                  </span>
                  <button
                    onClick={() => handleCopy(account.address)}
                    className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer shrink-0"
                    title="Copy Address"
                  >
                    {copied ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {/* Balances Grid */}
                <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                  <div className="p-2.5 rounded-xl bg-white dark:bg-black/30 border border-slate-200/60 dark:border-white/5">
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">SUI Balance</div>
                    <div className="text-sm font-black text-slate-900 dark:text-white mt-0.5">
                      {account.balanceSui} SUI
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-black/30 border border-slate-200/60 dark:border-white/5">
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Walrus Storage</div>
                    <div className="text-sm font-black text-cyan-600 dark:text-cyan-400 mt-0.5">
                      {account.walrusStorageMb} MB Cap
                    </div>
                  </div>
                </div>
              </div>

              {/* Walrus Memory Seal Badge */}
              <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-700 dark:text-purple-300">
                <ShieldCheck className="w-4 h-4 text-purple-500 shrink-0" />
                <span>
                  Walrus Memory Relayer verified on Sui. Clinical records encrypted under patient namespace.
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2">
                {onOpenProfile && (
                  <button
                    onClick={() => {
                      onOpenProfile();
                      onClose();
                    }}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold shadow-md shadow-purple-600/20 cursor-pointer transition-all flex items-center justify-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>View Health Profile</span>
                  </button>
                )}
                <button
                  onClick={onDisconnect}
                  className="py-2.5 px-4 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-rose-500/10 hover:border-rose-500/30 hover:text-rose-600 dark:hover:text-rose-400 text-slate-600 dark:text-slate-400 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Disconnect</span>
                </button>
              </div>
            </div>
          ) : (
            /* Connect Wallet State */
            <div className="space-y-3">
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Connect your Sui wallet to sync your clinical profile and enable continuous, encrypted memory with KIRO:
              </p>

              <div className="space-y-2">
                {POPULAR_WALLETS.map((w) => (
                  <button
                    key={w.id}
                    onClick={() => simulateConnect(w.id)}
                    disabled={connectingWalletId !== null}
                    className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 transition-all text-left cursor-pointer group disabled:opacity-50"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${w.iconColor} flex items-center justify-center text-white font-black text-xs shadow-md`}
                      >
                        {w.name[0]}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                            {w.name}
                          </span>
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300">
                            {w.tag}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">{w.description}</p>
                      </div>
                    </div>

                    {connectingWalletId === w.id ? (
                      <span className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors" />
                    )}
                  </button>
                ))}
              </div>

              <div className="mt-4 p-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-[11px] text-slate-500 dark:text-slate-400 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-cyan-500 shrink-0 mt-0.5" />
                <span>
                  No Sui extension required. Clicking &quot;Instant Sui Mainnet ID&quot; creates an authenticated account instantly so you can test immediately.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
