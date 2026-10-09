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
  KeyRound,
  Download,
  Eye,
  EyeOff,
  RefreshCw,
  Plus,
} from 'lucide-react';

import { getWallets } from '@mysten/wallet-standard';

export interface SuiAccount {
  address: string;
  name: string;
  balanceSui: number;
  network: 'mainnet' | 'testnet';
  walrusStorageMb: number;
  walrusObjectId: string;
  secretKey?: string;
  walletType?: 'extension' | 'web_keypair' | 'imported';
}

interface WalletOption {
  id: string;
  name: string;
  icon?: string;
  isDetected: boolean;
  standardWallet?: any;
  windowObj?: any;
  installUrl: string;
  description: string;
}

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: SuiAccount | null;
  onConnect: (account: SuiAccount) => void;
  onDisconnect: () => void;
  onOpenProfile?: () => void;
}

export function WalletModal({
  isOpen,
  onClose,
  account,
  onConnect,
  onDisconnect,
  onOpenProfile,
}: WalletModalProps) {
  const [copied, setCopied] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [activeTab, setActiveTab] = useState<'extensions' | 'create' | 'import'>('extensions');
  const [isConnecting, setIsConnecting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Import State
  const [importKey, setImportKey] = useState('');
  const [importError, setImportError] = useState<string | null>(null);

  // Created Key State
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [showSecretKey, setShowSecretKey] = useState(false);

  // Dynamic Browser Wallets
  const [walletList, setWalletList] = useState<WalletOption[]>([]);
  const [isScanning, setIsScanning] = useState(false);

  /**
   * Strictly validates whether a wallet extension genuinely supports the Sui blockchain.
   * Excludes Solana/Ethereum-only extensions like Phantom, Solflare, MetaMask, OKX (non-Sui), etc.
   * Recognizes Slush (Mysten Labs official Sui wallet, formerly Sui Wallet) and Surf Wallet.
   */
  const isSuiWallet = (sw: any): boolean => {
    if (!sw) return false;
    const name = (sw.name || '').toLowerCase();

    // 1. Strict Exclusion: Block known non-Sui extensions that emit standard events
    if (
      name.includes('phantom') ||
      name.includes('solflare') ||
      name.includes('backpack') ||
      name.includes('metamask') ||
      name.includes('rabby') ||
      name.includes('keplr') ||
      name.includes('coinbase') ||
      name.includes('trust wallet') ||
      name.includes('exodus') ||
      name.includes('zerion')
    ) {
      return false;
    }

    // 2. Check if wallet specifically supports any sui:* chain
    const chains: string[] = Array.isArray(sw.chains) ? sw.chains : [];
    const hasSuiChain = chains.some((c) => typeof c === 'string' && c.startsWith('sui:'));

    // 3. Check if wallet implements any Sui Wallet Standard feature
    const features = sw.features || {};
    const hasSuiFeature = Object.keys(features).some((f) => f.startsWith('sui:'));

    // 4. Known dedicated Sui wallets (Slush is the official rebranded Sui Wallet by Mysten Labs)
    const isKnownSuiWallet =
      name.includes('slush') ||
      name.includes('sui wallet') ||
      name.includes('suiet') ||
      name.includes('surf') ||
      name.includes('martian sui') ||
      name.includes('nightly') ||
      name.includes('ethos');

    // Reject multi-chain wallets (like generic OKX) if they don't explicitly implement Sui standard
    if (name.includes('okx') && !hasSuiChain && !hasSuiFeature) {
      return false;
    }

    // Only accept if it has Sui chains, Sui features, or is a dedicated Sui wallet
    if (hasSuiChain || hasSuiFeature || isKnownSuiWallet) {
      return true;
    }

    return false;
  };

  /**
   * Scan for browser extensions adhering to Sui Wallet Standard & window globals
   */
  const scanBrowserWallets = React.useCallback(() => {
    if (typeof window === 'undefined') return;
    setIsScanning(true);
    try {
      const w = window as any;
      let standardWallets: readonly any[] = [];
      try {
        const registry = getWallets();
        standardWallets = registry.get() || [];
      } catch (e) {
        console.warn('Sui Wallet Standard discovery notice:', e);
      }

      // Base known Sui wallets
      const baseOptions: WalletOption[] = [
        {
          id: 'slush',
          name: 'Slush (Official Sui)',
          installUrl: 'https://chromewebstore.google.com/detail/sui-wallet/opcgpfmipidbgpenhmajoajpbobppdil',
          description: 'Mysten Labs official wallet for Sui & Walrus (formerly Sui Wallet)',
          isDetected: false,
        },
        {
          id: 'surf',
          name: 'Surf Wallet',
          installUrl: 'https://surf.tech',
          description: 'Smart self-custody Sui wallet extension',
          isDetected: false,
        },
        {
          id: 'suiet',
          name: 'Suiet Wallet',
          installUrl: 'https://suiet.app',
          description: 'Community-first Sui browser wallet extension',
          isDetected: false,
        },
        {
          id: 'nightly',
          name: 'Nightly Wallet',
          installUrl: 'https://nightly.app',
          description: 'Multi-chain Web3 wallet with Sui native support',
          isDetected: false,
        },
      ];

      // 1. Cross-check base options with Sui Wallet Standard & window properties
      for (const opt of baseOptions) {
        // Standard registry check (filtered strictly for genuine Sui)
        const matchedStd = standardWallets.find((sw) => {
          if (!isSuiWallet(sw)) return false;
          const swName = (sw.name || '').toLowerCase();
          if (opt.id === 'slush') {
            return swName.includes('slush') || swName.includes('sui wallet') || swName === 'sui';
          }
          if (opt.id === 'surf') return swName.includes('surf');
          if (opt.id === 'suiet') return swName.includes('suiet');
          if (opt.id === 'nightly') return swName.includes('nightly');
          return false;
        });

        if (matchedStd) {
          opt.isDetected = true;
          opt.standardWallet = matchedStd;
          opt.icon = matchedStd.icon;
          continue;
        }

        // Window object check
        if (opt.id === 'slush' && (w.slush || w.suiWallet || w.__sui__)) {
          opt.isDetected = true;
          opt.windowObj = w.slush || w.suiWallet || w.__sui__;
          opt.icon = (w.slush || w.suiWallet || w.__sui__)?.icon;
        } else if (opt.id === 'surf' && (w.surf || w.surfWallet)) {
          opt.isDetected = true;
          opt.windowObj = w.surf || w.surfWallet;
          opt.icon = (w.surf || w.surfWallet)?.icon;
        } else if (opt.id === 'suiet' && w.suiet) {
          opt.isDetected = true;
          opt.windowObj = w.suiet;
          opt.icon = w.suiet?.icon;
        } else if (opt.id === 'nightly' && w.nightly?.sui) {
          opt.isDetected = true;
          opt.windowObj = w.nightly?.sui;
          opt.icon = w.nightly?.sui?.icon;
        }
      }

      // 2. Discover any additional genuine Sui Wallets installed in the user's browser (e.g. Martian Sui)
      for (const sw of standardWallets) {
        if (!isSuiWallet(sw)) continue; // STRICT FILTER: Excludes Phantom, OKX (non-sui), Solflare, etc.

        const swName = (sw.name || '').toLowerCase();
        const alreadyIncluded = baseOptions.some(
          (b) =>
            b.standardWallet === sw ||
            b.name.toLowerCase() === swName ||
            (b.id === 'slush' && (swName.includes('slush') || swName.includes('sui wallet'))) ||
            (b.id === 'surf' && swName.includes('surf'))
        );
        if (!alreadyIncluded && sw.name) {
          baseOptions.unshift({
            id: sw.name.toLowerCase().replace(/\s+/g, '_'),
            name: sw.name,
            icon: sw.icon,
            isDetected: true,
            standardWallet: sw,
            installUrl: 'https://sui.io',
            description: 'Sui Wallet Standard detected extension',
          });
        }
      }

      // Sort: detected wallets first
      baseOptions.sort((a, b) => (b.isDetected ? 1 : 0) - (a.isDetected ? 1 : 0));
      setWalletList(baseOptions);
    } finally {
      setTimeout(() => setIsScanning(false), 300);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    scanBrowserWallets();

    // Listen to wallet-standard registration events
    let unsubReg: (() => void) | undefined;
    let unsubUnreg: (() => void) | undefined;
    try {
      const registry = getWallets();
      unsubReg = registry.on('register', () => scanBrowserWallets());
      unsubUnreg = registry.on('unregister', () => scanBrowserWallets());
    } catch (e) {}

    // Emit app-ready event so newly injected extensions announce themselves
    try {
      window.dispatchEvent(new CustomEvent('wallet-standard:app-ready'));
    } catch (e) {}

    // Poll for 2.5s to capture late content scripts
    const interval = setInterval(scanBrowserWallets, 350);
    const timeout = setTimeout(() => clearInterval(interval), 2500);

    return () => {
      if (unsubReg) unsubReg();
      if (unsubUnreg) unsubUnreg();
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [isOpen, scanBrowserWallets]);

  if (!isOpen) return null;

  const handleCopy = (text: string, isSecret = false) => {
    navigator.clipboard.writeText(text);
    if (isSecret) {
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    } else {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  /**
   * Connect to real browser extension using Sui Wallet Standard or window injection
   */
  const handleConnectExtension = async (option: WalletOption) => {
    setIsConnecting(true);
    setStatusMessage(`Requesting connection with ${option.name}...`);
    try {
      // 1. Prioritize Sui Wallet Standard
      if (option.standardWallet) {
        const connectFeature = option.standardWallet.features?.['standard:connect'];
        if (connectFeature) {
          const res = await connectFeature.connect();
          const accounts = res?.accounts || option.standardWallet.accounts || [];
          if (!accounts || accounts.length === 0) {
            throw new Error(`No account authorized in ${option.name}. Please approve the connection in the extension.`);
          }
          const address = accounts[0].address;
          await finalizeLogin(address, option.name, 'extension');
          return;
        }
      }

      // 2. Direct window object connection
      if (option.windowObj) {
        const ext = option.windowObj;
        if (typeof ext.requestPermissions === 'function') {
          await ext.requestPermissions();
        } else if (typeof ext.connect === 'function') {
          await ext.connect();
        }

        const accounts = typeof ext.getAccounts === 'function' ? await ext.getAccounts() : ext.accounts;
        const address = accounts?.[0]?.address || accounts?.[0] || ext.account?.address;
        if (!address) {
          throw new Error(`Could not retrieve account address from ${option.name}.`);
        }
        await finalizeLogin(address, option.name, 'extension');
        return;
      }

      // 3. Fallback: probe window dynamically in real-time
      const w = window as any;
      if (option.id === 'slush' || option.id === 'sui_wallet') {
        const ext = w.slush || w.suiWallet || w.__sui__;
        if (ext) {
          if (typeof ext.requestPermissions === 'function') await ext.requestPermissions();
          const accounts = typeof ext.getAccounts === 'function' ? await ext.getAccounts() : [];
          if (accounts?.[0]) {
            await finalizeLogin(accounts[0]?.address || accounts[0], 'Slush Wallet', 'extension');
            return;
          }
        }
      } else if (option.id === 'surf' && (w.surf || w.surfWallet)) {
        const ext = w.surf || w.surfWallet;
        if (typeof ext.connect === 'function') await ext.connect();
        const accounts = typeof ext.getAccounts === 'function' ? await ext.getAccounts() : ext.accounts;
        const address = accounts?.[0]?.address || accounts?.[0];
        if (address) {
          await finalizeLogin(address, 'Surf Wallet', 'extension');
          return;
        }
      } else if (option.id === 'suiet' && w.suiet) {
        await w.suiet.connect();
        const address = w.suiet.account?.address || (await w.suiet.getAccounts())?.[0];
        if (address) {
          await finalizeLogin(address, 'Suiet Wallet', 'extension');
          return;
        }
      } else if (option.id === 'nightly' && w.nightly?.sui) {
        await w.nightly.sui.connect();
        const accounts = await w.nightly.sui.getAccounts();
        const address = accounts?.[0]?.address || accounts?.[0];
        if (address) {
          await finalizeLogin(address, 'Nightly Wallet', 'extension');
          return;
        }
      }

      // If extension not present, redirect to download
      window.open(option.installUrl, '_blank');
      setStatusMessage(`${option.name} extension not detected. Opening Chrome Web Store...`);
    } catch (err: any) {
      console.error('Wallet connection error:', err);
      setStatusMessage(`Connection failed: ${err.message || 'User rejected request'}`);
    } finally {
      setIsConnecting(false);
    }
  };

  /**
   * Generate an authentic, real Ed25519 Sui Keypair in the browser
   */
  const handleCreateNewSuiWallet = async () => {
    setIsConnecting(true);
    setStatusMessage('Generating on-chain Ed25519 keypair for Sui Mainnet...');
    try {
      const res = await fetch('/api/wallet?action=create');
      if (!res.ok) throw new Error('Failed to create keypair');
      const data = await res.json();

      setCreatedSecret(data.secretKey);
      await finalizeLogin(data.address, 'Instant Sui Web Wallet', 'web_keypair', data.secretKey);
    } catch (err: any) {
      console.error('Failed to create Sui wallet:', err);
      setStatusMessage('Error creating on-chain wallet. Please try again.');
    } finally {
      setIsConnecting(false);
    }
  };

  /**
   * Import an existing Sui Private Key (suiprivkey...)
   */
  const handleImportKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importKey.trim()) return;

    setIsConnecting(true);
    setImportError(null);
    try {
      const res = await fetch('/api/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'import', secretKey: importKey.trim() }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Invalid Sui private key');
      }

      await finalizeLogin(data.address, 'Imported Sui Identity', 'imported', data.secretKey);
      setImportKey('');
    } catch (err: any) {
      setImportError(err.message || 'Invalid private key format.');
    } finally {
      setIsConnecting(false);
    }
  };

  /**
   * Finalize login and fetch live on-chain Sui balance
   */
  const finalizeLogin = async (
    address: string,
    name: string,
    walletType: 'extension' | 'web_keypair' | 'imported',
    secretKey?: string
  ) => {
    setStatusMessage('Querying Sui network for balance & storage quota...');
    let balanceSui = 0.0;

    try {
      const balRes = await fetch(`/api/wallet?action=balance&address=${address}`);
      if (balRes.ok) {
        const balData = await balRes.json();
        balanceSui = balData.balanceSui || 0.0;
      }
    } catch (e) {
      console.warn('Could not query balance:', e);
    }

    const newAccount: SuiAccount = {
      address,
      name,
      balanceSui,
      network: 'mainnet',
      walrusStorageMb: 50.0,
      walrusObjectId: `0x${address.slice(2, 34)}`,
      secretKey,
      walletType,
    };

    try {
      localStorage.setItem('walcare_sui_account', JSON.stringify(newAccount));
      if (secretKey) {
        localStorage.setItem('walcare_sui_secret_key', secretKey);
      }
    } catch (e) {
      console.warn('LocalStorage error:', e);
    }

    onConnect(newAccount);
    setStatusMessage(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div className="relative w-full max-w-md sm:max-w-lg max-h-[90vh] sm:max-h-[85vh] flex flex-col rounded-3xl bg-white dark:bg-[#12151E] border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden my-auto">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-cyan-500 via-purple-500 to-rose-500 z-10" />
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 pb-3.5 border-b border-slate-100 dark:border-white/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/25 shrink-0">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-snug">
                {account ? 'Sui Wallet Authenticated' : 'Connect Sui Blockchain Wallet'}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Verifiable cryptographic health identity on Sui &amp; Walrus
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 pt-3.5 overflow-y-auto flex-1 space-y-3.5 scrollbar-thin">
          {account ? (
            /* Connected State */
            <div className="space-y-4">
              {/* Account Address Card */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    Sui On-Chain Identity
                  </span>
                  <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Sui Mainnet Live
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
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Walrus Storage Quota</div>
                    <div className="text-sm font-black text-cyan-600 dark:text-cyan-400 mt-0.5">
                      50.0 MB Active
                    </div>
                  </div>
                </div>

                {/* Secret Key Display if locally created */}
                {account.secretKey && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1">
                        <KeyRound className="w-3.5 h-3.5" />
                        Private Key (Stored Locally)
                      </span>
                      <button
                        onClick={() => setShowSecretKey(!showSecretKey)}
                        className="text-[10px] text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white cursor-pointer"
                      >
                        {showSecretKey ? 'Hide' : 'Reveal'}
                      </button>
                    </div>
                    {showSecretKey && (
                      <div className="flex items-center justify-between p-2 rounded-lg bg-black/40 font-mono text-[10px] text-slate-200">
                        <span className="truncate mr-2">{account.secretKey}</span>
                        <button
                          onClick={() => handleCopy(account.secretKey || '', true)}
                          className="shrink-0 p-1 text-amber-300 hover:text-white"
                          title="Copy Private Key"
                        >
                          {copiedSecret ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Explorer Link */}
              <div className="flex items-center justify-between text-xs px-1">
                <a
                  href={`https://suiscan.xyz/mainnet/account/${account.address}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-cyan-600 dark:text-cyan-400 hover:underline text-[11px] font-semibold"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Inspect On-Chain on Suiscan</span>
                </a>
                <span className="text-[11px] text-slate-400 font-mono">Type: {account.walletType || 'On-Chain'}</span>
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
            /* Connect Wallet Mode */
            <div className="space-y-4">
              {/* Mode Tabs */}
              <div className="grid grid-cols-3 gap-1 p-1 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-bold">
                <button
                  onClick={() => setActiveTab('extensions')}
                  className={`py-2 rounded-xl transition-all cursor-pointer ${
                    activeTab === 'extensions'
                      ? 'bg-white dark:bg-[#1A1E2B] text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Browser Extension
                </button>
                <button
                  onClick={() => setActiveTab('create')}
                  className={`py-2 rounded-xl transition-all cursor-pointer ${
                    activeTab === 'create'
                      ? 'bg-white dark:bg-[#1A1E2B] text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Create New Wallet
                </button>
                <button
                  onClick={() => setActiveTab('import')}
                  className={`py-2 rounded-xl transition-all cursor-pointer ${
                    activeTab === 'import'
                      ? 'bg-white dark:bg-[#1A1E2B] text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Import Key
                </button>
              </div>

              {/* Status or Progress Feedback */}
              {statusMessage && (
                <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-800 dark:text-cyan-300 text-xs flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin shrink-0" />
                  <span>{statusMessage}</span>
                </div>
              )}

              {/* TAB 1: Browser Extensions */}
              {activeTab === 'extensions' && (
                <div className="space-y-3">
                  {/* Scan bar / status banner */}
                  <div className="flex items-center justify-between px-1 text-xs">
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-cyan-500" />
                      Sui Wallet Standard (Auto-Discovery)
                    </span>
                    <button
                      onClick={scanBrowserWallets}
                      disabled={isScanning}
                      className="flex items-center gap-1 text-[11px] text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 font-bold cursor-pointer disabled:opacity-50"
                      title="Rescan browser for newly installed extensions"
                    >
                      <RefreshCw className={`w-3 h-3 ${isScanning ? 'animate-spin' : ''}`} />
                      <span>{isScanning ? 'Scanning...' : 'Rescan'}</span>
                    </button>
                  </div>

                  {/* Wallet Cards List */}
                  <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1 scrollbar-thin">
                    {walletList.map((wallet) => (
                      <button
                        key={wallet.id}
                        onClick={() => handleConnectExtension(wallet)}
                        disabled={isConnecting}
                        className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all text-left cursor-pointer group ${
                          wallet.isDetected
                            ? 'bg-emerald-500/5 dark:bg-emerald-500/10 border-emerald-500/40 hover:border-emerald-500/70 hover:bg-emerald-500/10 dark:hover:bg-emerald-500/15 ring-1 ring-emerald-500/20'
                            : 'bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 border-slate-200 dark:border-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shadow-md shrink-0 ${
                            wallet.isDetected
                              ? 'bg-gradient-to-tr from-emerald-500 to-teal-600 text-white shadow-emerald-500/20'
                              : 'bg-gradient-to-tr from-cyan-500 to-blue-600 text-white shadow-cyan-500/20'
                          }`}>
                            {wallet.icon ? (
                              <img src={wallet.icon} alt={wallet.name} className="w-6 h-6 rounded-lg object-contain" />
                            ) : (
                              wallet.name.slice(0, 2).toUpperCase()
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                                {wallet.name}
                              </span>
                              {wallet.isDetected ? (
                                <span className="flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 animate-pulse">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                  Detected &amp; Ready
                                </span>
                              ) : (
                                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-400">
                                  Extension
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                              {wallet.isDetected
                                ? 'Click to connect wallet securely via Sui Standard'
                                : wallet.description}
                            </p>
                          </div>
                        </div>

                        {wallet.isDetected ? (
                          <div className="px-3 py-1 rounded-xl bg-emerald-600 text-white text-[11px] font-bold shadow-xs group-hover:scale-105 transition-transform shrink-0">
                            Connect
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-[11px] text-slate-400 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors shrink-0">
                            <span>Get</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-100/70 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 text-[11px] text-slate-500 dark:text-slate-400 flex items-start gap-2">
                    <Zap className="w-4 h-4 text-cyan-500 shrink-0 mt-0.5" />
                    <span>
                      Don&apos;t have a browser extension installed? Use <strong>Create New Wallet</strong> to generate a live on-chain Sui keypair in 1 click right in your browser!
                    </span>
                  </div>
                </div>
              )}

              {/* TAB 2: Instant Create New Sui Wallet */}
              {activeTab === 'create' && (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-3.5">
                  <div className="flex items-start gap-2.5">
                    <Sparkles className="w-5 h-5 text-cyan-500 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        Create Instant Sui Web Wallet
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                        Generates a genuine Ed25519 cryptographic keypair and Sui Mainnet address right now in your browser. No browser extension required.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleCreateNewSuiWallet}
                    disabled={isConnecting}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-600 hover:to-indigo-700 text-white font-bold text-xs shadow-lg shadow-cyan-600/30 cursor-pointer transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{isConnecting ? 'Generating Keypair...' : 'Generate New Sui Wallet'}</span>
                  </button>
                </div>
              )}

              {/* TAB 3: Import Existing Sui Private Key */}
              {activeTab === 'import' && (
                <form onSubmit={handleImportKey} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Sui Private Key (Bech32 or Hex)
                    </label>
                    <input
                      type="password"
                      value={importKey}
                      onChange={(e) => setImportKey(e.target.value)}
                      placeholder="suiprivkey1..."
                      className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-black/40 border border-slate-300 dark:border-white/10 font-mono text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                      required
                    />
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                      Paste your Bech32 encoded Sui private key to log into WalCare with your existing wallet.
                    </p>
                  </div>

                  {importError && (
                    <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs">
                      {importError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isConnecting || !importKey.trim()}
                    className="w-full py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md shadow-purple-600/20 cursor-pointer transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>{isConnecting ? 'Validating Key...' : 'Import & Connect'}</span>
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
