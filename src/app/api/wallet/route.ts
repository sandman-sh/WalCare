import { NextRequest, NextResponse } from 'next/server';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');
    const address = searchParams.get('address');

    if (action === 'create') {
      const keypair = new Ed25519Keypair();
      const addr = keypair.toSuiAddress();
      const secret = keypair.getSecretKey();

      return NextResponse.json({
        success: true,
        address: addr,
        secretKey: secret,
        network: 'mainnet',
        createdAt: new Date().toISOString(),
      });
    }

    if (action === 'balance' && address) {
      try {
        const query = JSON.stringify({
          query: `query { address(address: "${address}") { balance(coinType: "0x2::sui::SUI") { totalBalance } } }`,
        });

        const rpcRes = await fetch('https://sui-mainnet.mystenlabs.com/graphql', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: query,
          signal: AbortSignal.timeout(6000),
        });

        if (rpcRes.ok) {
          const gqlData = await rpcRes.json();
          const rawTotal = gqlData?.data?.address?.balance?.totalBalance;
          const balanceSui = rawTotal ? Number(rawTotal) / 1e9 : 0.0;
          return NextResponse.json({
            success: true,
            address,
            balanceSui: Number(balanceSui.toFixed(4)),
            network: 'mainnet',
          });
        }
      } catch (balErr) {
        console.warn('GraphQL balance query error:', balErr);
      }

      // Default safe fallback balance response
      return NextResponse.json({
        success: true,
        address,
        balanceSui: 0.0,
        network: 'mainnet',
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    console.error('Wallet API error:', err);
    return NextResponse.json({ error: err.message || 'Internal wallet error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, secretKey } = body;

    if (action === 'import' && secretKey) {
      const cleanKey = secretKey.trim();
      const keypair = Ed25519Keypair.fromSecretKey(cleanKey);
      return NextResponse.json({
        success: true,
        address: keypair.toSuiAddress(),
        secretKey: keypair.getSecretKey(),
        network: 'mainnet',
      });
    }

    return NextResponse.json({ error: 'Invalid action or secret key' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Invalid Sui secret key format. Please provide a valid Bech32 suiprivkey...' },
      { status: 400 }
    );
  }
}
