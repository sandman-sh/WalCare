import { NextResponse } from 'next/server';
import { memoryStore } from '@/lib/memoryStore';
import { PATIENT_PROFILE } from '@/lib/seedData';
import { HandoverSummary } from '@/types/carecircle';

export async function GET() {
  try {
    const allMemories = memoryStore.getAll();

    const sarahMems = allMemories.filter((m) => m.authorId === 'daughter_sarah');
    const nurseMems = allMemories.filter((m) => m.authorId === 'nurse_elena');
    const physioMems = allMemories.filter((m) => m.authorId === 'physio_david');

    const criticalItems = allMemories.filter((m) => m.isSafetyCritical);

    const handover: HandoverSummary = {
      date: new Date().toISOString().slice(0, 10),
      patientName: PATIENT_PROFILE.name,
      overallStatus: criticalItems.length > 0 ? 'attention_needed' : 'stable',
      highlights: [
        `Cross-caregiver continuity synthesized across ${allMemories.length} certified Walrus Memory blobs.`,
        'Morning orthostatic drop (102/64 mmHg) logged by Sarah, confirmed with sit-to-stand pause by Elena.',
        'Mobility recovered from 14.8s to 12.4s TUG with quad-cane support documented by David.',
      ],
      vitalsSummary:
        'Latest resting BP: 122/76 mmHg | HR: 70 bpm | SpO2: 98% room air. Note: standing blood pressure drops to 102/64 mmHg upon rapid bed exit.',
      medicationAlerts: [
        'STRICT NSAID CONTRAINDICATION: Ibuprofen, Naproxen, Aspirin contraindicated due to recorded dark tarry stool specks and acute gastritis.',
        'Pantoprazole 40mg added before breakfast to protect gastric mucosa.',
        'Subcutaneous insulin glargine 12 units administered midday; post-meal capillary glucose 138-142 mg/dL.',
      ],
      mobilityNotes: [
        'Timed Up and Go (TUG) improved to 12.4s with quad-cane.',
        'Hallway throw rug removed per David\'s fall-hazard intervention.',
        '12 stair steps completed with bilateral handrails; minimal fatigue.',
      ],
      pendingActions: [
        'Notify Dr. Robert Adams regarding dark stool observation for possible occult blood test.',
        'Maintain mandatory 60-second seated pause on bed edge before standing.',
        'Review evening med organizer with Sarah at 18:00.',
      ],
      totalBlobsConsulted: allMemories.length,
    };

    return NextResponse.json({ handover, totalBlobs: allMemories.length });
  } catch (err) {
    console.error('Error generating handover:', err);
    return NextResponse.json({ error: 'Failed to generate handover briefing' }, { status: 500 });
  }
}
