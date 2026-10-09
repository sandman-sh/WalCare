import { NextResponse } from 'next/server';
import { walrusService } from '@/lib/walrusClient';
import { memoryStore } from '@/lib/memoryStore';

export async function GET() {
  const walrusHealth = await walrusService.checkHealth();
  const walrusStatus = walrusService.getStatus();
  const allMemories = memoryStore.getAll();

  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const hasLiveOpenRouter =
    Boolean(openRouterKey) &&
    openRouterKey!.startsWith('sk-or-v1-') &&
    !openRouterKey!.includes('replace-with-your-key');

  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    openrouter: {
      isConfigured: hasLiveOpenRouter,
      model: process.env.OPENROUTER_MODEL || 'qwen/qwen-2.5-72b-instruct',
      status: hasLiveOpenRouter ? 'Ready (Live Key)' : 'Using Fallback Protocol (Key Needed)',
    },
    walrus: {
      ...walrusStatus,
      relayerPing: walrusHealth,
      storedBlobCount: allMemories.length,
      network: 'Sui Mainnet',
    },
  });
}
