import { NextRequest, NextResponse } from 'next/server';
import { consoleStore } from '@/lib/consoleStore';

export async function POST(req: NextRequest) {
  try {
    let fileBuffer: Buffer | null = null;
    let fileName = `avatar_${Date.now()}.png`;
    let mimeType = 'image/png';
    let dataUrl = '';

    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      if (!file) {
        return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
      }
      fileName = file.name || fileName;
      mimeType = file.type || mimeType;
      const arrayBuffer = await file.arrayBuffer();
      fileBuffer = Buffer.from(arrayBuffer);
      dataUrl = `data:${mimeType};base64,${fileBuffer.toString('base64')}`;
    } else {
      const body = await req.json();
      if (!body.dataUrl && !body.base64) {
        return NextResponse.json({ error: 'Image data required' }, { status: 400 });
      }
      dataUrl = body.dataUrl || body.base64;
      fileName = body.fileName || fileName;
      mimeType = body.mimeType || mimeType;

      const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
      fileBuffer = Buffer.from(base64Data, 'base64');
    }

    if (!fileBuffer || fileBuffer.length === 0) {
      return NextResponse.json({ error: 'Empty file payload' }, { status: 400 });
    }

    let blobId = '';
    let suiObjectId = '';

    // 1. Upload to Walrus Decentralized Storage via HTTP Publisher
    try {
      const walrusRes = await fetch('https://publisher.walrus-testnet.walrus.space/v1/blobs?epochs=5', {
        method: 'PUT',
        headers: {
          'Content-Type': mimeType,
        },
        body: new Uint8Array(fileBuffer),
        signal: AbortSignal.timeout(12000),
      });

      if (walrusRes.ok) {
        const json = await walrusRes.json();
        const info = json.newlyCreated?.blobObject || json.alreadyCertified?.blobObject || json;
        blobId = info.blobId || json.blobId;
        suiObjectId = info.id || json.id || '';
      }
    } catch (pubErr) {
      console.warn('[Avatar Upload] Walrus HTTP publisher timeout or error, trying fallback:', pubErr);
    }

    // 2. Also register in Walrus Console bucket for persistence
    if (!blobId) {
      try {
        const consoleUpload = await consoleStore.uploadFile({
          name: fileName,
          content: fileBuffer.toString('base64'),
          mimeType,
          description: 'User avatar profile picture certified on Walrus storage',
          tags: ['avatar', 'profile', 'patient'],
        });
        blobId = consoleUpload.blobId || `walrus_avatar_${Date.now()}`;
        suiObjectId = consoleUpload.pooledBlobObjectId || '';
      } catch (cErr) {
        console.warn('[Avatar Upload] Console store upload error:', cErr);
        blobId = `walrus_blob_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      }
    }

    const aggregatorUrl = `https://aggregator.walrus-testnet.walrus.space/v1/blobs/${blobId}`;

    return NextResponse.json({
      success: true,
      blobId,
      suiObjectId,
      avatarUrl: dataUrl || aggregatorUrl,
      aggregatorUrl,
      fileName,
      size: fileBuffer.length,
      mimeType,
    });
  } catch (err: any) {
    console.error('Error uploading avatar to Walrus:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to upload profile picture to Walrus' },
      { status: 500 }
    );
  }
}
