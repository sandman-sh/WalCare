import { NextRequest, NextResponse } from 'next/server';
import { memoryStore } from '@/lib/memoryStore';
import { consoleStore } from '@/lib/consoleStore';
import { CAREGIVERS } from '@/lib/seedData';
import { evaluateClinicalSafety } from '@/lib/safetyRules';
import { callOpenRouterAI } from '@/lib/openrouter';
import { WalrusMemoryItem } from '@/types/carecircle';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      message,
      authorId = 'daughter_sarah',
      isAmnesiaMode = false,
      model,
      chatHistory = [],
      userProfile,
    } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const caregiver = CAREGIVERS.find((c) => c.id === authorId) || CAREGIVERS[0];

    // 1. Semantic recall from Walrus Memory (bypassed if Amnesia Mode is active)
    let recalledMemories: WalrusMemoryItem[] = [];
    if (!isAmnesiaMode) {
      const recallRes = await memoryStore.recall(message, 5);
      recalledMemories = recallRes.results;
    }

    // 2. Clinical safety contraindication check
    const safetyCheck = !isAmnesiaMode
      ? evaluateClinicalSafety(message, recalledMemories)
      : null;

    // 3. Prepare messages array for OpenRouter
    const formattedHistory = chatHistory.map((m: { sender: string; content: string }) => ({
      role: m.sender === 'user' ? ('user' as const) : ('assistant' as const),
      content: m.content,
    }));
    formattedHistory.push({ role: 'user' as const, content: message });

    // 4. Call OpenRouter AI (KIRO model engine with multi-model fallback)
    const completion = await callOpenRouterAI({
      messages: formattedHistory,
      caregiver,
      userProfile,
      recalledMemories,
      model,
      isAmnesiaMode,
    });

    // 5. Asynchronously persist newly extracted facts, vitals, or memories to Walrus
    const persistedBlobs: string[] = [];
    if (!isAmnesiaMode) {
      if (completion.actionExecuted?.type === 'add_memory' && completion.actionExecuted.details?.text) {
        const saved = await memoryStore.addMemory({
          authorId: caregiver.id,
          category: completion.actionExecuted.details.category || 'general',
          text: completion.actionExecuted.details.text,
          isSafetyCritical: completion.actionExecuted.details.isSafetyCritical || false,
        });
        persistedBlobs.push(saved.blobId);
      } else if (completion.actionExecuted?.type === 'update_vitals' && completion.actionExecuted.details) {
        const v = completion.actionExecuted.details;
        const parts: string[] = [];
        if (v.weightKg) parts.push(`Weight: ${v.weightKg}kg`);
        if (v.heightCm) parts.push(`Height: ${v.heightCm}cm`);
        if (v.systolicBp && v.diastolicBp) parts.push(`BP: ${v.systolicBp}/${v.diastolicBp} mmHg`);
        if (v.heartRate) parts.push(`Pulse: ${v.heartRate} bpm`);
        if (v.glucose) parts.push(`Blood glucose: ${v.glucose} mg/dL`);
        const text = `${userProfile?.name || 'Patient'} updated vitals: ${parts.join(', ')}`;
        const saved = await memoryStore.addMemory({
          authorId: caregiver.id,
          category: 'vitals',
          text,
          isSafetyCritical: (v.heartRate && v.heartRate > 115) || (v.systolicBp && v.systolicBp > 150) || false,
        });
        persistedBlobs.push(saved.blobId);
      } else if (completion.actionExecuted?.type === 'update_profile' && completion.actionExecuted.details) {
        const p = completion.actionExecuted.details;
        const text = `Profile updated for ${p.name || userProfile?.name || 'Patient'}: ${Object.entries(p).map(([k, val]) => `${k}=${JSON.stringify(val)}`).join(', ')}`;
        const saved = await memoryStore.addMemory({
          authorId: caregiver.id,
          category: 'general',
          text,
          isSafetyCritical: !!p.allergies || !!p.conditions,
        });
        persistedBlobs.push(saved.blobId);
      } else if (completion.actionExecuted?.type === 'upload_document' && completion.actionExecuted.details) {
        const d = completion.actionExecuted.details;
        const uploaded = await consoleStore.uploadFile({
          name: d.name || `medical_record_${Date.now()}.txt`,
          content: d.content || d.description || `Clinical record stored by KIRO for ${userProfile?.name || caregiver.name}`,
          mimeType: 'text/plain',
          description: d.description || `Uploaded to Walrus Console via KIRO AI`,
          tags: ['clinical', 'kiro', 'automated'],
          ownerAddress: userProfile?.walletAddress || null,
          isGuest: !userProfile?.walletAddress,
        });
        const saved = await memoryStore.addMemory({
          authorId: caregiver.id,
          category: 'general',
          text: `Stored document "${uploaded.name}" on Walrus Console (Blob: ${uploaded.blobId.slice(0, 16)}...).`,
          isSafetyCritical: false,
        });
        persistedBlobs.push(uploaded.blobId);
        persistedBlobs.push(saved.blobId);
      } else if (completion.extractedFact) {
        const saved = await memoryStore.addMemory({
          authorId: caregiver.id,
          category: completion.extractedFact.category,
          text: completion.extractedFact.text,
          isSafetyCritical: completion.extractedFact.isSafetyCritical,
        });
        persistedBlobs.push(saved.blobId);
      }
    }

    return NextResponse.json({
      reply: completion.reply,
      actionExecuted: completion.actionExecuted,
      recalledMemories,
      safetyAlert: safetyCheck
        ? {
            level: safetyCheck.alertLevel,
            title: safetyCheck.title,
            description: safetyCheck.description,
            recommendation: safetyCheck.recommendation,
            conflictingBlobs: safetyCheck.conflictingBlobs,
          }
        : undefined,
      amnesiaAlternative: safetyCheck?.amnesiaAlternative,
      persistedBlobs,
      modelUsed: completion.modelUsed,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error in /api/chat:', error);
    return NextResponse.json(
      { error: 'Internal server error processing chat' },
      { status: 500 }
    );
  }
}
