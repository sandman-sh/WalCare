'use client';

import React, { useState } from 'react';
import {
  X,
  ShieldAlert,
  ShieldCheck,
  ZapOff,
  Zap,
  SplitSquareVertical,
  Sparkles,
} from 'lucide-react';

interface AmnesiaDiffModalProps {
  isOpen: boolean;
  onClose: () => void;
  customPrompt?: string;
  customMemoryReply?: string;
  customAmnesiaReply?: string;
}

export function AmnesiaDiffModal({
  isOpen,
  onClose,
  customPrompt,
  customMemoryReply,
  customAmnesiaReply,
}: AmnesiaDiffModalProps) {
  const scenarios = [
    {
      id: 'ibuprofen',
      title: 'Scenario 1: Ibuprofen & GI Bleed Conflict',
      badge: 'Life-Safety Critical',
      prompt: 'Mom has a bad headache this afternoon. Can I give her 400mg Ibuprofen (Advil)?',
      amnesiaReply:
        'Yes, Ibuprofen 400mg is a common over-the-counter dosage for tension headaches in adults. Take it every 4 to 6 hours as needed with a meal or full glass of water. If the headache persists for more than 48 hours, consult a physician.',
      amnesiaVerdict: 'DANGEROUS FAILURE',
      amnesiaAnalysis:
        'The goldfish AI treats the patient as an average adult with no medical history. It fails to detect that NSAIDs in a patient with active gastritis and dark tarry stool can precipitate massive gastrointestinal hemorrhage.',
      memoryReply: `[SAFETY WARNING] CRITICAL CONTRAINDICATION: DO NOT ADMINISTER IBUPROFEN

Cross-referencing Eleanor's Walrus records across the care team:
• Daughter Sarah (Oct 3 | Blob 0x9928...): Observed dark tarry specks in stool during morning commode visit.
• Nurse Elena, RN (Oct 4 | Blob 0xccbb...): Confirmed epigastric tenderness and issued an explicit clinical prohibition against all NSAIDs (Ibuprofen, Naproxen, Aspirin).
• Postural Vitals Drop: Standing BP plunged to 102/64 mmHg with acute dizziness.

Recommendation:
Ibuprofen is strictly contraindicated. Suggest Acetaminophen (Tylenol) 500mg instead if authorized by Dr. Adams. Keep patient rested and notify the care team immediately.`,
      memoryVerdict: 'LIFE-SAVING INTERVENTION',
      memoryAnalysis:
        'Walrus Memory synthesizes observations between Daughter Sarah and Nurse Elena across different days, immediately catching the drug-condition contraindication.',
    },
    {
      id: 'dizziness',
      title: 'Scenario 2: Orthostatic Dizziness & Fall Hazard',
      badge: 'Fall Prevention',
      prompt: 'Can Mom walk unassisted to the backyard garden today? She seems energized.',
      amnesiaReply:
        'Walking in the garden is great exercise and fresh air for seniors. Encourage her to walk at her own pace and enjoy the sunshine for 20-30 minutes.',
      amnesiaVerdict: 'HIGH FALL HAZARD',
      amnesiaAnalysis:
        'The amnesic bot encourages unassisted mobility, completely unaware of recent orthostatic blood pressure drops and elevated fall risk baselines.',
      memoryReply: `[FALL CAUTION] Unassisted ambulation is NOT advised today.

Walrus Memory context recalled:
• Oct 4 (Sarah | Blob 0x3344...): Eleanor experienced severe dizziness upon standing and required physical arm support to prevent falling.
• Oct 4 (Sarah | Blob 0x5566...): Standing BP plunged to 102/64 mmHg (orthostatic postural drop).
• Oct 2 (David, DPT | Blob 0x33cc...): Baseline TUG score was 14.8 seconds (elevated fall risk).

Protocol:
Enforce mandatory 60-second seated bed-edge pause before standing. Ambulation permitted ONLY with quad-cane and stand-by caregiver supervision.`,
      memoryVerdict: 'FALL RISK MITIGATED',
      memoryAnalysis:
        'The remembering agent enforces the physical therapist’s transfer protocol based on the daughter’s morning blood pressure drop.',
    },
    {
      id: 'wound',
      title: 'Scenario 3: Midday Wound Handover',
      badge: 'Continuity of Care',
      prompt: 'What did Nurse Elena note about Mom\'s arm dressing during her visit?',
      amnesiaReply:
        'I do not have any records of Nurse Elena or any arm dressings for your mother. Please provide details about what happened during the visit.',
      amnesiaVerdict: 'ZERO CONTINUITY',
      amnesiaAnalysis:
        'The amnesic bot resets context to zero, forcing the daughter to repeatedly re-explain clinical dressings every single shift.',
      memoryReply: `Nurse Elena documented Eleanor's wound dressing in Walrus Memory (Blob 0x4433... on Oct 2):
• Location: Right distal forearm skin tear.
• Assessment: Wound bed was pink and healthy with clean margins. Zero purulent discharge or signs of infection.
• Intervention: Hydrogel dressing applied with non-adherent silicone border. Scheduled for routine re-inspection.`,
      memoryVerdict: 'PERFECT CONTINUITY',
      memoryAnalysis:
        'Immediate retrieval of the exact clinical assessment, saving family members from anxious guesswork.',
    },
  ];

  const [selectedScenarioIndex, setSelectedScenarioIndex] = useState(0);
  const current = scenarios[selectedScenarioIndex];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3 sm:p-6 backdrop-blur-md">
      <div className="bg-[#141722] border border-white/15 max-w-5xl w-full max-h-[92vh] flex flex-col rounded-3xl shadow-2xl overflow-hidden text-white">
        {/* Header */}
        <div className="p-5 bg-[#171A24] border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-purple-500/20 border border-purple-500/30 text-purple-300">
              <SplitSquareVertical className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black tracking-tight text-white">
                Amnesia Mode vs. Walrus Memory Mode (Counterfactual Diff)
              </h3>
              <p className="text-xs text-slate-400">
                Empirical clinical proof: demonstrating why persistent memory is essential.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scenario Switcher Tabs */}
        <div className="px-5 py-3 bg-[#11131B] border-b border-white/5 flex items-center gap-2 overflow-x-auto scrollbar-none">
          {scenarios.map((sc, idx) => (
            <button
              key={sc.id}
              onClick={() => setSelectedScenarioIndex(idx)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all cursor-pointer ${
                selectedScenarioIndex === idx
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30 ring-1 ring-white/30'
                  : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white'
              }`}
            >
              {sc.title}
            </button>
          ))}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          {/* Prompt Banner */}
          <div className="p-4 rounded-2xl bg-[#191D2B] border border-white/10 shadow-sm">
            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 inline-block mb-1.5">
              Caregiver Clinical Query
            </span>
            <p className="font-bold text-base text-white">
              &ldquo;{customPrompt || current.prompt}&rdquo;
            </p>
          </div>

          {/* Side by Side Diff Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* LEFT: Amnesia Mode (Goldfish Bot) */}
            <div className="p-4 sm:p-5 rounded-3xl bg-rose-950/30 border border-rose-500/30 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-bold text-xs text-rose-300 flex items-center gap-1.5">
                    <ZapOff className="w-4 h-4 text-rose-400" />
                    Amnesia Mode (Zero Memory)
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 uppercase">
                    {current.amnesiaVerdict}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 text-xs sm:text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
                  {customAmnesiaReply || current.amnesiaReply}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-rose-500/20 text-xs text-rose-200">
                <strong className="text-rose-300 font-bold">Failure Analysis:</strong>{' '}
                {current.amnesiaAnalysis}
              </div>
            </div>

            {/* RIGHT: Walrus Memory Mode (WalCare) */}
            <div className="p-4 sm:p-5 rounded-3xl bg-emerald-950/30 border border-emerald-500/30 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-bold text-xs text-emerald-300 flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-emerald-400 fill-emerald-400" />
                    WalCare (Walrus Memory Active)
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 uppercase">
                    {current.memoryVerdict}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 text-xs sm:text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">
                  {customMemoryReply || current.memoryReply}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-emerald-500/20 text-xs text-emerald-200">
                <strong className="text-emerald-300 font-bold">Memory Impact:</strong>{' '}
                {current.memoryAnalysis}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#171A24] border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
          <span>Decentralized Walrus Protocol proof on Sui Mainnet</span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            Close Diff Lab
          </button>
        </div>
      </div>
    </div>
  );
}
