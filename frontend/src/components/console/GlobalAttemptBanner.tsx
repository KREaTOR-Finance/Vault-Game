'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useConnection } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { VAULT_GAME_PROGRAM_ID } from '@/lib/playerProfile';

type AttemptItem = {
  sig: string;
  player?: string;
  vault?: string;
  ts: number;
};

function shortKey(k: string) {
  return k.slice(0, 4) + '…' + k.slice(-4);
}

export default function GlobalAttemptBanner() {
  const { connection } = useConnection();
  const [items, setItems] = useState<AttemptItem[]>([]);
  const seen = useRef<Set<string>>(new Set());

  const text = useMemo(() => {
    if (!items.length) return ':: AWAITING TRAFFIC ::';
    // Render newest-first but scroll in a loop.
    const parts = items
      .slice(0, 12)
      .map((it) => {
        const who = it.player ? shortKey(it.player) : shortKey(it.sig);
        const where = it.vault ? ` → ${shortKey(it.vault)}` : '';
        return `[TRY] ${who}${where}`;
      });
    // Repeat so it loops seamlessly.
    return parts.concat(parts).join('   ·   ');
  }, [items]);

  useEffect(() => {
    let cancelled = false;

    async function enrichFromTx(sig: string) {
      try {
        const tx = await connection.getTransaction(sig, {
          commitment: 'confirmed',
          maxSupportedTransactionVersion: 0,
        });
        if (!tx) return;

        type MsgLike = {
          getAccountKeys?: () => { staticAccountKeys: PublicKey[] };
          accountKeys?: PublicKey[];
          instructions?: Array<{ programIdIndex: number; accounts?: number[] }>;
        };

        const msg = tx.transaction.message as unknown as MsgLike;
        // Legacy + v0 message support (best-effort typing)
        const accountKeys: PublicKey[] = msg?.getAccountKeys?.().staticAccountKeys ?? msg?.accountKeys ?? [];
        const instructions = msg?.instructions ?? [];

        for (const ix of instructions) {
          const programId = accountKeys[ix.programIdIndex];
          if (!programId?.equals(VAULT_GAME_PROGRAM_ID)) continue;

          // Best-effort mapping based on our known account ordering.
          // make_guess_sol: [vault, mega_vault, player_profile, player, system_program]
          // make_guess_spl: [vault, mega_vault, player_profile, player, fee_mint, ...]
          const acctIdxs: number[] = ix.accounts || [];
          const vault = acctIdxs[0] != null ? accountKeys[acctIdxs[0]] : undefined;
          const player = acctIdxs[3] != null ? accountKeys[acctIdxs[3]] : undefined;

          setItems((prev) => {
            const next = [{ sig, player: player?.toBase58(), vault: vault?.toBase58(), ts: Date.now() }, ...prev];
            // de-dupe + cap
            const out: AttemptItem[] = [];
            const s = new Set<string>();
            for (const it of next) {
              if (s.has(it.sig)) continue;
              s.add(it.sig);
              out.push(it);
              if (out.length >= 24) break;
            }
            return out;
          });
          return;
        }
      } catch {
        // ignore
      }
    }

    // Live subscription: whenever program logs happen, fetch tx and extract signer + vault.
    const subId = connection.onLogs(
      VAULT_GAME_PROGRAM_ID,
      (ev) => {
        if (cancelled) return;
        const sig = ev.signature;
        if (!sig || seen.current.has(sig)) return;
        seen.current.add(sig);
        // Only attempt-ish: best-effort filter. (Anchor logs include "Instruction: MakeGuess" lines)
        const joined = (ev.logs || []).join('\n').toLowerCase();
        if (!(joined.includes('makeguess') || joined.includes('make_guess'))) return;
        enrichFromTx(sig);
      },
      'confirmed'
    );

    // Backfill: grab a few recent signatures for the program and enrich.
    (async () => {
      try {
        const sigs = await connection.getSignaturesForAddress(VAULT_GAME_PROGRAM_ID, { limit: 10 }, 'confirmed');
        if (cancelled) return;
        for (const s of sigs) {
          if (seen.current.has(s.signature)) continue;
          seen.current.add(s.signature);
          // don’t await sequentially too hard; still keep it tame
          // eslint-disable-next-line no-await-in-loop
          await enrichFromTx(s.signature);
        }
      } catch {
        // ignore
      }
    })();

    return () => {
      cancelled = true;
      connection.removeOnLogsListener(subId).catch(() => {});
    };
  }, [connection]);

  return (
    <div className="border border-matrix-dim/25 bg-black/25 px-3 py-2">
      <div className="overflow-hidden whitespace-nowrap text-[11px] tracking-widest text-matrix-dim">
        <div className="inline-block min-w-full animate-marquee">{text}</div>
      </div>
    </div>
  );
}
