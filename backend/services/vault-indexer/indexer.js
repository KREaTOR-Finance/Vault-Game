import { Connection, PublicKey } from '@solana/web3.js';
import { createClient } from '@supabase/supabase-js';
import { decodeVaultAccount } from './decodeVault.js';

const PROGRAM_ID = process.env.PROGRAM_ID;
const RPC_URL = process.env.RPC_URL || 'https://api.devnet.solana.com';
const CLUSTER = process.env.CLUSTER || 'devnet';
const POLL_MS = Number(process.env.POLL_MS || 5000);

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!PROGRAM_ID) throw new Error('Missing PROGRAM_ID');
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');

const conn = new Connection(RPC_URL, 'confirmed');
const programId = new PublicKey(PROGRAM_ID);
const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

async function getCursorKey() {
  return `program:${PROGRAM_ID}:${CLUSTER}`;
}

async function loadCursor() {
  // optional helper table: indexer_state(key text primary key, value text)
  const key = await getCursorKey();
  const { data, error } = await sb.from('indexer_state').select('value').eq('key', key).maybeSingle();
  if (error) return null;
  return data?.value || null;
}

async function saveCursor(value) {
  const key = await getCursorKey();
  await sb.from('indexer_state').upsert({ key, value }, { onConflict: 'key' });
}

function hasCreateVaultLog(logs = []) {
  return logs.some((l) => l.includes('Instruction: CreateVault'));
}

function extractVaultFromInstruction(tx) {
  // Find the program instruction and take the 3rd account in CreateVault context:
  // [global_state, mega_vault, vault, ...]
  const msg = tx.transaction.message;
  const accountKeys = msg.accountKeys.map((k) => (typeof k === 'string' ? k : k.pubkey?.toBase58?.() || k.toBase58()));

  const ix = msg.instructions.find((ix) => {
    const pid = accountKeys[ix.programIdIndex];
    return pid === PROGRAM_ID;
  });
  if (!ix) return null;

  const accounts = ix.accounts.map((i) => accountKeys[i]);
  return accounts[2] || null;
}

async function upsertVault(vaultPubkey) {
  const info = await conn.getAccountInfo(new PublicKey(vaultPubkey), 'confirmed');
  if (!info?.data) return;

  const decoded = decodeVaultAccount(Buffer.from(info.data));

  const row = {
    vault_pubkey: vaultPubkey,
    cluster: CLUSTER,
    vault_id: decoded.vault_id ? BigInt(decoded.vault_id) : null,
    creator_pubkey: decoded.creator_pubkey,
    pin_len: decoded.pin_len,
    created_at: decoded.created_at_unix ? new Date(decoded.created_at_unix * 1000).toISOString() : null,
    end_ts: decoded.end_ts_unix ? new Date(decoded.end_ts_unix * 1000).toISOString() : null,
    base_fee: decoded.base_fee,
    fee_step: decoded.fee_step,
    current_fee: decoded.current_fee,
    attempt_count: decoded.attempt_count ? BigInt(decoded.attempt_count) : null,
    prize_amount: decoded.prize_amount,
    status: decoded.status,
    winner_pubkey: decoded.winner_pubkey,
    paid_out: decoded.paid_out,
  };

  await sb.from('vaults').upsert(row, { onConflict: 'vault_pubkey' });
}

async function loop() {
  console.log('vault-indexer starting', { PROGRAM_ID, RPC_URL, CLUSTER, POLL_MS });
  let before = await loadCursor();

  // If indexer_state table isn't set up yet, just run without cursor persistence.
  if (before) console.log('Loaded cursor', before);

  while (true) {
    try {
      const opts = { limit: 50 };
      if (before) opts.before = before;

      const sigs = await conn.getSignaturesForAddress(programId, opts, 'confirmed');
      if (sigs.length === 0) {
        await new Promise((r) => setTimeout(r, POLL_MS));
        continue;
      }

      // Process oldest -> newest so cursor ends at newest processed
      const ordered = sigs.slice().reverse();

      for (const s of ordered) {
        const sig = s.signature;
        const tx = await conn.getTransaction(sig, { commitment: 'confirmed', maxSupportedTransactionVersion: 0 });
        if (!tx) {
          before = sig;
          continue;
        }

        const logs = tx.meta?.logMessages || [];
        if (hasCreateVaultLog(logs)) {
          const vault = extractVaultFromInstruction(tx);
          if (vault) {
            console.log('create_vault', { sig, vault });
            await upsertVault(vault);
          }
        }

        before = sig;
        try { await saveCursor(before); } catch { /* ignore if table missing */ }
      }
    } catch (e) {
      console.error('indexer error', e);
      await new Promise((r) => setTimeout(r, POLL_MS));
    }
  }
}

loop();
