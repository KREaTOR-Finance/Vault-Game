import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';

const PORT = process.env.PORT || 3000;

function supabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  return createClient(url, key, { auth: { persistSession: false } });
}

const app = express();
app.use(cors());

app.get('/health', (_req, res) => res.json({ ok: true }));

// GET /api/v1/vaults?cluster=devnet|mainnet
app.get('/api/v1/vaults', async (req, res) => {
  try {
    const cluster = (req.query.cluster || 'devnet').toString();
    if (!['devnet', 'mainnet'].includes(cluster)) {
      return res.status(400).json({ error: 'cluster must be devnet or mainnet' });
    }

    const limit = Math.min(Number(req.query.limit || 200) || 200, 500);

    const sb = supabase();
    const { data, error } = await sb
      .from('vaults')
      .select('*')
      .eq('cluster', cluster)
      .order('end_ts', { ascending: true, nullsFirst: false })
      .limit(limit);

    if (error) {
      return res.status(502).json({ error: 'supabase_error', details: error.message });
    }

    return res.json({ vaults: data || [] });
  } catch (e) {
    return res.status(500).json({ error: e?.message || 'unknown_error' });
  }
});

app.listen(PORT, () => {
  console.log(`vault-api listening on :${PORT}`);
});
