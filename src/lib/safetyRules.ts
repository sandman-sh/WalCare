import { WalrusMemoryItem } from '@/types/carecircle';

export interface SafetyCheckResult {
  hasAlert: boolean;
  alertLevel: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  recommendation: string;
  conflictingBlobs: string[];
  amnesiaAlternative: string;
}

export function evaluateClinicalSafety(
  query: string,
  memories: WalrusMemoryItem[]
): SafetyCheckResult | null {
  const q = query.toLowerCase();

  // 1. NSAID / GI Bleed check
  const isNsaidQuery =
    q.includes('ibuprofen') ||
    q.includes('advil') ||
    q.includes('motrin') ||
    q.includes('naproxen') ||
    q.includes('aleve') ||
    q.includes('aspirin');

  if (isNsaidQuery) {
    const giMemories = memories.filter(
      (m) =>
        m.text.toLowerCase().includes('dark') ||
        m.text.toLowerCase().includes('stool') ||
        m.text.toLowerCase().includes('gastritis') ||
        m.text.toLowerCase().includes('nsaid') ||
        m.text.toLowerCase().includes('bleeding') ||
        m.text.toLowerCase().includes('burning')
    );

    if (giMemories.length > 0) {
      return {
        hasAlert: true,
        alertLevel: 'critical',
        title: 'CRITICAL CONTRAINDICATION: NSAID Administration Blocked',
        description:
          'Patient Eleanor Miller has recorded gastrointestinal warning signs across previous caregiver sessions. On Oct 3, Daughter (Sarah) documented dark specks in stool, and Nurse Elena noted epigastric tenderness with an explicit NSAID prohibition.',
        recommendation:
          'DO NOT administer Ibuprofen or other NSAIDs. High risk of precipitating acute gastrointestinal hemorrhage. Consider non-NSAID alternatives (e.g. Acetaminophen / Tylenol 500mg, if authorized by Dr. Adams). Contact the care team immediately.',
        conflictingBlobs: giMemories.map((m) => m.blobId),
        amnesiaAlternative:
          'Standard adult dosage for Ibuprofen is 400mg every 4 to 6 hours with food. Ensure patient drinks a full glass of water. If headache persists beyond 24 hours, consult a physician.',
      };
    }
  }

  // 2. Orthostatic hypotension / Sudden ambulation check
  const isAmbulationQuery =
    q.includes('walk') ||
    q.includes('stairs') ||
    q.includes('stand up') ||
    q.includes('exercise') ||
    q.includes('dizzy') ||
    q.includes('fall');

  if (isAmbulationQuery) {
    const orthostaticMems = memories.filter(
      (m) =>
        m.text.toLowerCase().includes('dizz') ||
        m.text.toLowerCase().includes('orthostatic') ||
        m.text.toLowerCase().includes('102/64') ||
        m.text.toLowerCase().includes('tug')
    );

    if (orthostaticMems.length > 0) {
      return {
        hasAlert: true,
        alertLevel: 'warning',
        title: 'FALL HAZARD ALERT: Recent Postural Drop & Dizziness',
        description:
          'Daughter Sarah and Nurse Elena recorded postural dizziness and standing BP drops to 102/64 mmHg. Therapist David noted elevated TUG fall risk baseline.',
        recommendation:
          'Enforce supervised transfers only. Implement a 60-second seated pause on the edge of the bed before standing. Use quad-cane for all ambulation.',
        conflictingBlobs: orthostaticMems.map((m) => m.blobId),
        amnesiaAlternative:
          'Encourage the patient to do 20 minutes of brisk hallway walking to maintain stamina and cardiovascular health.',
      };
    }
  }

  return null;
}
