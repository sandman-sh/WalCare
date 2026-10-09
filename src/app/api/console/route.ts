import { NextRequest, NextResponse } from 'next/server';
import { consoleStore, DEFAULT_BUCKET_ID, DEFAULT_SPACE_ID } from '@/lib/consoleStore';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');
    const bucketId = searchParams.get('bucketId') || DEFAULT_BUCKET_ID;
    const fileId = searchParams.get('fileId') || searchParams.get('id');
    const walletAddress = searchParams.get('walletAddress') || undefined;
    const isGuest = searchParams.get('isGuest') === 'true' || !walletAddress;
    const walrusNamespace = searchParams.get('walrusNamespace') || undefined;

    // Handle decrypted document download
    if (action === 'download' && fileId) {
      try {
        const downloaded = await consoleStore.downloadFile(fileId, bucketId, walletAddress, isGuest);
        return new NextResponse(downloaded.content, {
          status: 200,
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Content-Disposition': `attachment; filename="${downloaded.name}"`,
          },
        });
      } catch (dlErr: any) {
        if (dlErr?.message === 'ACCESS_DENIED_WALLET_MISMATCH') {
          return new NextResponse('Access Denied: This medical record is SEAL-encrypted and private to another wallet owner. Unauthorized download prohibited.', {
            status: 403,
            headers: {
              'Content-Type': 'text/plain; charset=utf-8',
            },
          });
        }
        console.error('Download error via Seal:', dlErr);
        return new NextResponse(`Error decrypting document: ${dlErr?.message || 'Decryption key unavailable for this Walrus Console object'}. Please ensure local SEAL private key is configured.`, {
          status: 500,
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
          },
        });
      }
    }

    const [files, buckets, storageUsage] = await Promise.all([
      consoleStore.getFiles(bucketId, walletAddress, isGuest),
      consoleStore.getBuckets(DEFAULT_SPACE_ID, walletAddress, isGuest, walrusNamespace),
      consoleStore.getStorageUsage(walletAddress, isGuest),
    ]);

    return NextResponse.json({
      success: true,
      files,
      buckets,
      storageUsage,
      endpoint: 'https://api.console.walrus.xyz',
      walletAddress: walletAddress || null,
      isGuest,
    });
  } catch (err) {
    console.error('Error fetching Walrus Console data:', err);
    return NextResponse.json({ error: 'Failed to retrieve Walrus Console data' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, file, id, bucketId, walletAddress, isGuest } = body;
    const isGuestUser = isGuest === true || (!walletAddress && isGuest !== false);

    if (action === 'delete' && id) {
      try {
        const deleted = await consoleStore.deleteFile(id, bucketId || DEFAULT_BUCKET_ID, walletAddress, isGuestUser);
        return NextResponse.json({ success: deleted });
      } catch (delErr: any) {
        if (delErr?.message === 'ACCESS_DENIED_WALLET_MISMATCH') {
          return NextResponse.json({ error: 'Access denied: Cannot delete document owned by another wallet.' }, { status: 403 });
        }
        throw delErr;
      }
    }

    if (action === 'upload' && file) {
      const created = await consoleStore.uploadFile({
        name: file.name,
        content: file.content || 'Medical record content',
        mimeType: file.mimeType || 'text/plain',
        description: file.description,
        tags: file.tags,
        bucketId: file.bucketId || DEFAULT_BUCKET_ID,
        ownerAddress: walletAddress,
        isGuest: isGuestUser,
      });
      return NextResponse.json({ success: true, file: created });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    if (err?.message === 'ACCESS_DENIED_WALLET_MISMATCH') {
      return NextResponse.json({ error: 'Access denied: Unauthorized wallet.' }, { status: 403 });
    }
    console.error('Error processing Walrus Console action:', err);
    return NextResponse.json({ error: 'Internal Console error' }, { status: 500 });
  }
}
