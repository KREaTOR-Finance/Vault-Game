import { NextResponse } from 'next/server';

/**
 * VaultCrack directory endpoint.
 *
 * This reads from Supabase PostgREST using a server-side key.
 * Keep the service role key ONLY in Vercel env vars.
 *
 * Env:
 *  - SUPABASE_URL
 *  - SUPABASE_SERVICE_ROLE_KEY
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const cluster = searchParams.get('cluster') ?? 'devnet';

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' },
      { status: 500 },
    );
  }

  if (cluster !== 'devnet' && cluster !== 'mainnet') {
    return NextResponse.json({ error: 'cluster must be devnet or mainnet' }, { status: 400 });
  }

  const url = `${SUPABASE_URL}/rest/v1/vaults?cluster=eq.${cluster}&select=*`;

  const r = await fetch(url, {
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
    // avoid caching stale directory results
    cache: 'no-store',
  });

  if (!r.ok) {
    const text = await r.text().catch(() => '');
    return NextResponse.json(
      { error: 'Supabase query failed', status: r.status, details: text },
      { status: 502 },
    );
  }

  const vaults = await r.json();
  return NextResponse.json({ vaults }, { status: 200 });
}
