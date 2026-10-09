'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  AlertTriangle,
  Database,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  SplitSquareVertical,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  FileText,
  Pill,
  Activity,
  Footprints,
  Utensils,
  Check,
} from 'lucide-react';
import { Caregiver, ChatMessage, MemoryCategory, UserProfile } from '@/types/carecircle';
import { CAREGIVERS } from '@/lib/seedData';
import { MascotHero } from './MascotHero';
import { SuiAccount } from './WalletModal';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (text: string, category?: MemoryCategory) => Promise<void>;
  isLoading: boolean;
  activeCaregiver: Caregiver;
  onCaregiverChange?: (cg: Caregiver) => void;
  isAmnesiaMode: boolean;
  onOpenDiffModal: (userPrompt: string, memoryReply: string, amnesiaReply: string) => void;
  userProfile?: UserProfile | null;
  suiAccount?: SuiAccount | null;
  isGuestMode?: boolean;
  onSwitchToGuest?: () => void;
}

function parseInlineMarkdown(text: string): React.ReactNode {
  const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      return (
        <strong key={idx} className="font-bold text-slate-900 dark:text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      return (
        <code
          key={idx}
          className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/10 font-mono text-xs text-purple-600 dark:text-purple-300"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

function renderCleanFormattedMessage(content: string): React.ReactNode {
  if (!content) return null;

  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];

  lines.forEach((line, idx) => {
    let trimmed = line.trim();
    if (!trimmed) {
      elements.push(<div key={`spacer-${idx}`} className="h-1.5" />);
      return;
    }

    // Clean stray markers like "### *" or "###" or "##"
    const isOriginalHeading = /^#{1,4}\s+/.test(trimmed) || /^###\s*\*/.test(trimmed);
    trimmed = trimmed
      .replace(/^###\s*\*\s*/, '')
      .replace(/^#{1,4}\s+/, '')
      .trim();

    // Check if it's a bullet item
    const isBullet = /^[\*\-\•]\s+/.test(line.trim()) || /^###\s*\*/.test(line.trim());
    // Check if it's a numbered list
    const isNumbered = /^\d+\.\s+/.test(line.trim());

    if (isOriginalHeading) {
      elements.push(
        <div
          key={`head-${idx}`}
          className="font-bold text-sm sm:text-base text-slate-900 dark:text-white mt-3 mb-1.5 flex items-center gap-2"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
          <span>{parseInlineMarkdown(trimmed)}</span>
        </div>
      );
    } else if (isBullet) {
      const cleanBulletText = trimmed.replace(/^[\*\-\•]\s+/, '');
      elements.push(
        <div
          key={`bullet-${idx}`}
          className="flex items-start gap-2.5 my-1 text-slate-800 dark:text-slate-200"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-2 shrink-0 opacity-80" />
          <span className="flex-1 leading-relaxed">{parseInlineMarkdown(cleanBulletText)}</span>
        </div>
      );
    } else if (isNumbered) {
      const match = trimmed.match(/^(\d+)\.\s+(.*)/);
      const num = match ? match[1] : '';
      const text = match ? match[2] : trimmed;
      elements.push(
        <div
          key={`num-${idx}`}
          className="flex items-start gap-2.5 my-1 text-slate-800 dark:text-slate-200"
        >
          <span className="px-1.5 py-0.5 rounded-md bg-purple-500/15 text-purple-600 dark:text-purple-300 font-bold text-[10px] mt-0.5 shrink-0">
            {num}
          </span>
          <span className="flex-1 leading-relaxed">{parseInlineMarkdown(text)}</span>
        </div>
      );
    } else {
      elements.push(
        <p key={`p-${idx}`} className="leading-relaxed text-slate-800 dark:text-slate-200 my-1">
          {parseInlineMarkdown(trimmed)}
        </p>
      );
    }
  });

  return elements;
}

export function ChatInterface({
  messages,
  onSendMessage,
  isLoading,
  activeCaregiver,
  onCaregiverChange,
  isAmnesiaMode,
  onOpenDiffModal,
  userProfile,
  suiAccount,
  isGuestMode = false,
  onSwitchToGuest,
}: ChatInterfaceProps) {
  const [inputText, setInputText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<MemoryCategory>('general');
  const [expandedMemoryId, setExpandedMemoryId] = useState<string | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Strictly scroll inside the messages viewport, never pushing window or top header out of view
    if (messagesContainerRef.current && (messages.length > 0 || isLoading)) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages.length, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;

    const text = inputText;
    setInputText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    await onSendMessage(text, selectedCategory);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleInputResize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`;
  };

  const categoryOptions: Array<{ id: MemoryCategory; label: string; icon: React.ReactNode }> = [
    { id: 'general', label: 'General', icon: <FileText className="w-3.5 h-3.5" /> },
    { id: 'medication', label: 'Medication', icon: <Pill className="w-3.5 h-3.5" /> },
    { id: 'vitals', label: 'Vitals', icon: <Activity className="w-3.5 h-3.5" /> },
    { id: 'symptom', label: 'Symptom', icon: <AlertTriangle className="w-3.5 h-3.5" /> },
    { id: 'diet', label: 'Diet', icon: <Utensils className="w-3.5 h-3.5" /> },
    { id: 'mobility', label: 'Mobility', icon: <Footprints className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="flex-1 min-h-0 flex flex-col w-full h-full bg-slate-50 dark:bg-[#0B0D14] overflow-hidden relative transition-colors duration-300">
      {/* Ambient Radial Highlights */}
      <div className="absolute top-10 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-1/4 w-80 h-80 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Scrollable Messages Viewport */}
      <div
        ref={messagesContainerRef}
        className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-8 py-6 space-y-6 relative z-10 scroll-smooth"
      >
        {messages.length === 0 ? (
          <MascotHero
            activeCaregiverName={activeCaregiver.name}
            userProfile={userProfile}
            isGuestMode={isGuestMode}
            onSelectPrompt={(prompt) => {
              setInputText(prompt);
              if (textareaRef.current) {
                textareaRef.current.focus();
              }
            }}
          />
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${
                msg.sender === 'user' ? 'items-end' : 'items-start'
              } max-w-4xl mx-auto`}
            >
              {/* Message Header Pill */}
              <div className="flex items-center gap-2 mb-1.5 px-1 text-xs">
                {msg.sender === 'user' ? (
                  <>
                    <span className="px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30 font-semibold text-[10px]">
                      {msg.authorRole?.toUpperCase() || 'CAREGIVER'}
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {msg.authorName || activeCaregiver.name}
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-1.5 font-bold text-transparent bg-clip-text bg-gradient-to-r from-rose-500 via-pink-500 to-purple-600 dark:from-rose-400 dark:to-purple-400">
                      <Sparkles className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />
                      KIRO Health AI
                    </div>
                    {isAmnesiaMode && (
                      <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-600 dark:text-rose-300 border border-rose-500/30 text-[10px] font-bold">
                        Amnesia Baseline
                      </span>
                    )}
                    <span className="text-[11px] text-slate-500 font-mono">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </>
                )}
              </div>

              {/* Message Bubble Card */}
              <div
                className={`p-5 rounded-3xl text-sm sm:text-[15px] leading-relaxed transition-all shadow-xl ${
                  msg.sender === 'user'
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-tr-sm max-w-xl font-medium shadow-purple-950/20'
                    : 'bg-white dark:bg-[#141722] text-slate-900 dark:text-slate-100 rounded-tl-sm border border-slate-200 dark:border-white/10 max-w-3xl w-full shadow-slate-200/50 dark:shadow-black/20'
                }`}
              >
                {/* 1. Clinical Contraindication Alert */}
                {msg.safetyAlert && (
                  <div className="mb-4 p-4 rounded-2xl bg-rose-500/10 dark:bg-rose-950/70 border border-rose-500/40 text-rose-900 dark:text-rose-100 shadow-md">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-600 dark:text-rose-300 shrink-0 mt-0.5">
                        <AlertTriangle className="w-5 h-5 animate-pulse text-rose-600 dark:text-rose-400" />
                      </div>
                      <div>
                        <h4 className="font-black text-sm tracking-wide text-rose-700 dark:text-rose-300 uppercase">
                          {msg.safetyAlert.title}
                        </h4>
                        <p className="text-xs sm:text-sm mt-1 font-semibold text-rose-950 dark:text-rose-100 leading-normal">
                          {msg.safetyAlert.description}
                        </p>
                        <div className="mt-2.5 p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-900 dark:text-amber-200 font-bold text-xs flex items-center gap-1.5">
                          <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                          <span>Recommendation: {msg.safetyAlert.recommendation}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. Message Body */}
                <div className="font-normal leading-relaxed text-slate-800 dark:text-slate-200">
                  {msg.sender === 'user' ? (
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  ) : (
                    renderCleanFormattedMessage(msg.content)
                  )}
                </div>

                {/* 2.5 Natural Language Action Execution Card */}
                {msg.actionExecuted && (
                  <div className="mt-3.5 p-3.5 rounded-2xl bg-emerald-500/10 dark:bg-emerald-950/40 border border-emerald-500/30 text-emerald-950 dark:text-emerald-200 text-xs shadow-xs">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span className="font-bold">{msg.actionExecuted.label}</span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                        Sync Complete
                      </span>
                    </div>
                    <div className="text-[11px] font-mono text-emerald-800 dark:text-emerald-300/90 mt-1.5 pl-6 flex flex-wrap gap-x-3 gap-y-1">
                      {Object.entries(msg.actionExecuted.details).map(([k, v]) => (
                        <span key={k}>
                          <span className="opacity-75">{k}:</span> <span className="font-bold">{String(v)}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. Recalled Walrus Memories Expander */}
                {msg.recalledMemories && msg.recalledMemories.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/10">
                    <button
                      onClick={() =>
                        setExpandedMemoryId(expandedMemoryId === msg.id ? null : msg.id)
                      }
                      className="flex items-center justify-between w-full p-2.5 rounded-xl bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Database className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                        <span>Recalled {msg.recalledMemories.length} Walrus On-Chain Blobs</span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-[10px] font-mono font-bold">
                          Sui Mainnet
                        </span>
                      </div>
                      {expandedMemoryId === msg.id ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </button>

                    {/* Expanded Memory Cards */}
                    {expandedMemoryId === msg.id && (
                      <div className="mt-3 space-y-2.5">
                        {msg.recalledMemories.map((mem) => (
                          <div
                            key={mem.id}
                            className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#1A1E2B] border border-slate-200 dark:border-white/10 shadow-xs text-xs"
                          >
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="font-bold text-purple-700 dark:text-purple-300">
                                {mem.authorName} ({mem.authorRole.toUpperCase()})
                              </span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-yellow-300 border border-amber-500/30">
                                Similarity: {Math.round((mem.similarity || 0.85) * 100)}%
                              </span>
                            </div>
                            <p className="font-medium text-slate-700 dark:text-slate-300 italic my-1 leading-snug">
                              &ldquo;{mem.text}&rdquo;
                            </p>
                            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200 dark:border-white/5 text-[10px] font-mono text-slate-500 dark:text-slate-400">
                              <span className="truncate max-w-[200px]">Blob: {mem.blobId}</span>
                              <a
                                href={`https://walruscan.com/mainnet/blob/${mem.blobId}`}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-1 font-semibold text-purple-600 dark:text-purple-400 hover:underline"
                              >
                                Walruscan <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 4. Newly Persisted Memory Receipt */}
                {msg.persistedBlobs && msg.persistedBlobs.length > 0 && (
                  <div className="mt-3 flex items-center gap-2 p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-200 text-xs font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>Observation written to Walrus:</span>
                    <span className="font-mono text-[11px] truncate max-w-[220px] bg-black/10 dark:bg-black/40 px-2 py-0.5 rounded text-emerald-700 dark:text-emerald-300">
                      {msg.persistedBlobs[0]}
                    </span>
                  </div>
                )}

                {/* 5. Amnesia Diff Action */}
                {msg.sender === 'assistant' && msg.amnesiaAlternative && (
                  <div className="mt-3 pt-2 flex items-center justify-end">
                    <button
                      onClick={() =>
                        onOpenDiffModal(
                          messages.find((m) => m.id !== msg.id)?.content || 'Clinical Query',
                          msg.content,
                          msg.amnesiaAlternative || ''
                        )
                      }
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-700 dark:text-purple-300 text-xs font-bold transition-colors cursor-pointer"
                    >
                      <SplitSquareVertical className="w-3.5 h-3.5" />
                      <span>Compare with Amnesia Mode</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex items-center gap-3 max-w-4xl mx-auto p-4 rounded-2xl bg-white dark:bg-[#141722] border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 shadow-md">
            <div className="w-5 h-5 rounded-full border-2 border-purple-600 dark:border-purple-400 border-t-transparent animate-spin" />
            <span className="text-xs font-semibold">
              Consulting Walrus Memory Protocol & KIRO Intelligence...
            </span>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 sm:p-6 bg-white/90 dark:bg-[#12151E]/90 backdrop-blur-xl border-t border-slate-200 dark:border-white/5 relative z-20 transition-colors">
        <div className="max-w-4xl mx-auto space-y-2.5">
          {/* Active Speaker Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-none border-b border-slate-200/80 dark:border-white/5">
            {!isGuestMode && suiAccount ? (
              /* Wallet Authenticated Speaker */
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 shrink-0">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Speaking As:</span>
                  </span>
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-cyan-600 to-purple-600 text-white shadow-sm shrink-0">
                    <span>{userProfile?.name || `Sui User (${suiAccount.address.slice(0, 6)}...)`}</span>
                    <span className="text-[9px] opacity-80 font-normal">(Account Owner)</span>
                  </div>
                </div>

                {onSwitchToGuest && (
                  <button
                    type="button"
                    onClick={onSwitchToGuest}
                    className="text-[11px] text-amber-500 hover:text-amber-400 font-semibold cursor-pointer shrink-0 transition-colors"
                  >
                    Test Demo Personas
                  </button>
                )}
              </div>
            ) : (
              /* Guest Mode Caregiver Personas */
              <>
                <span className="text-[11px] font-bold text-purple-700 dark:text-purple-300 flex items-center gap-1.5 mr-1 shrink-0">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Speaking As:</span>
                </span>
                {CAREGIVERS.map((cg) => {
                  const isSelected = activeCaregiver.id === cg.id;
                  return (
                    <button
                      key={cg.id}
                      type="button"
                      onClick={() => onCaregiverChange?.(cg)}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold shrink-0 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/30 ring-1 ring-white/30'
                          : 'bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/5'
                      }`}
                      title={`Switch active speaker to ${cg.name} (${cg.role})`}
                    >
                      <span>{cg.name}</span>
                      <span className="text-[9px] opacity-75 font-normal">({cg.badge || cg.role})</span>
                    </button>
                  );
                })}
              </>
            )}
          </div>

          {/* Category Chips Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mr-1 shrink-0">
              Context Category:
            </span>
            {categoryOptions.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold shrink-0 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30 ring-1 ring-white/30'
                      : 'bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/5'
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          {/* Form & Textarea */}
          <form onSubmit={handleSubmit} className="flex items-end gap-2.5">
            <div className="flex-1 relative rounded-2xl bg-slate-100 dark:bg-[#171A24] border border-slate-300 dark:border-white/10 focus-within:border-purple-600 dark:focus-within:border-purple-500/60 focus-within:ring-2 focus-within:ring-purple-500/30 transition-all">
              <textarea
                ref={textareaRef}
                value={inputText}
                onChange={handleInputResize}
                onKeyDown={handleKeyDown}
                rows={1}
                placeholder={
                  !isGuestMode && suiAccount
                    ? `Ask KIRO AI or log observations for ${userProfile?.name || 'your profile'}...`
                    : `Ask WalCare AI or log an observation for Eleanor Vance (${activeCaregiver.name})...`
                }
                className="w-full py-3 pl-4 pr-10 text-sm text-slate-900 dark:text-white placeholder-slate-400 bg-transparent resize-none focus:outline-none max-h-36"
              />
            </div>

            <button
              type="submit"
              disabled={!inputText.trim() || isLoading}
              className={`p-3 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
                inputText.trim() && !isLoading
                  ? 'bg-gradient-to-r from-rose-500 to-purple-600 text-white shadow-lg shadow-purple-900/30 hover:scale-105 active:scale-95'
                  : 'bg-slate-200 dark:bg-white/5 text-slate-400 dark:text-slate-500 cursor-not-allowed'
              }`}
              title="Send Observation"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
