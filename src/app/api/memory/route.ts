import { NextRequest, NextResponse } from 'next/server';
import { memoryStore } from '@/lib/memoryStore';
import { CAREGIVERS } from '@/lib/seedData';
import { MemoryCategory } from '@/types/carecircle';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const author = searchParams.get('author');
    const category = searchParams.get('category');
    const query = searchParams.get('q');
    const walletAddress = searchParams.get('walletAddress') || undefined;
    const isGuest = searchParams.get('isGuest') === 'true' || !walletAddress;

    let memories = memoryStore.getAll(walletAddress, isGuest);

    if (query) {
      const recallRes = await memoryStore.recall(query, 10, walletAddress, isGuest);
      memories = recallRes.results;
    } else {
      if (author) {
        memories = memories.filter((m) => m.authorId === author);
      }
      if (category) {
        memories = memories.filter((m) => m.category === category);
      }
    }

    const all = memoryStore.getAll(walletAddress, isGuest);

    const stats = isGuest
      ? {
          total: all.length,
          byCaregiver: {
            daughter_sarah: all.filter((m) => m.authorId === 'daughter_sarah').length,
            nurse_elena: all.filter((m) => m.authorId === 'nurse_elena').length,
            physio_david: all.filter((m) => m.authorId === 'physio_david').length,
            dr_adams: all.filter((m) => m.authorId === 'dr_adams').length,
          },
          namespace: 'carecircle-eleanor-88',
          suiObjectId: '0xd7ec125eb467c0cce65b219ff7ddeea217c16709077c2c48c183e47e80704287',
          relayerUrl: process.env.WALRUS_RELAYER_URL || 'https://relayer.memory.walrus.xyz',
        }
      : {
          total: all.length,
          byCaregiver: {
            user: all.length,
          },
          namespace: `walcare-${walletAddress?.slice(2, 10) || 'vault'}`,
          suiObjectId: walletAddress ? `0x${walletAddress.slice(2)}` : '0x0',
          relayerUrl: process.env.WALRUS_RELAYER_URL || 'https://relayer.memory.walrus.xyz',
        };

    return NextResponse.json({ memories, stats, isGuest, walletAddress: walletAddress || null });
  } catch (err) {
    console.error('Error in /api/memory GET:', err);
    return NextResponse.json({ error: 'Failed to retrieve memories' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      action,
      text,
      authorId,
      authorName,
      authorRole,
      category = 'general',
      isSafetyCritical = false,
      walletAddress,
      isGuest,
    } = body;

    if (action === 'reset') {
      memoryStore.resetToSeed();
      return NextResponse.json({ success: true, message: 'Reset to 30 certified memories' });
    }

    if (!text || !authorId) {
      return NextResponse.json({ error: 'Missing text or authorId' }, { status: 400 });
    }

    const saved = await memoryStore.addMemory({
      authorId,
      authorName,
      authorRole,
      category: category as MemoryCategory,
      text,
      isSafetyCritical,
      walletAddress,
      isGuest,
    });

    return NextResponse.json({ success: true, memory: saved });
  } catch (err) {
    console.error('Error in /api/memory POST:', err);
    return NextResponse.json({ error: 'Failed to write memory' }, { status: 500 });
  }
}
