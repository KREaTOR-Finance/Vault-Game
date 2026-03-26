'use client';

import { useEffect, useState } from 'react';
import { useConnection } from '@solana/wallet-adapter-react';
import { VAULT_GAME_PROGRAM_ID } from '@/lib/playerProfile';

type Row = {
  sig: string;
  time: string;
  line: string;
};

function shortSig(sig: string) {
  return `${sig.slice(0, 6)}...${sig.slice(-6)}`;
}

export default function LogsPage() {
  const { connection } = useConnection();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      setLoading(true);
      try {
        const sigs = await connection.getSignaturesForAddress(VAULT_GAME_PROGRAM_ID, { limit: 20 }, 'confirmed');
        const txs = await Promise.all(
          sigs.map((s) =>
            connection.getTransaction(s.signature, {
              commitment: 'confirmed',
              maxSupportedTransactionVersion: 0,
            })
          )
        );

        if (cancelled) return;

        const next: Row[] = txs.flatMap((tx, i) => {
          const sig = sigs[i]?.signature;
          if (!tx || !sig) return [];

          const t = tx.blockTime ? new Date(tx.blockTime * 1000).toLocaleTimeString() : '--:--:--';
          const logs = tx.meta?.logMessages ?? [];
          const ixLine = logs.find((l) => l.includes('Instruction:')) ?? 'Instruction: unknown';
          const line = ixLine.replace('Program log: ', '').replace('Instruction: ', '');

          return [{ sig, time: t, line }];
        });

        setRows(next);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    refresh().catch(() => {});
    const timer = window.setInterval(() => refresh().catch(() => {}), 15000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [connection]);

  return (
    <div className="space-y-3">
      <div className="text-sm text-matrix-dim">
        MODULE: <span className="text-matrix">LOGS</span>
      </div>

      <div className="border border-matrix-dim/30 bg-black/30 p-3 text-xs text-matrix-dim">
        {rows.map((r) => (
          <div key={r.sig} className="py-1">
            <span className="text-matrix">[{r.time}]</span> {r.line}
            <span className="ml-2 text-matrix-dim">{shortSig(r.sig)}</span>
          </div>
        ))}

        {!loading && rows.length === 0 ? <div>No events found yet.</div> : null}
        {loading ? <div className="text-matrix-dim">Refreshing logs...</div> : null}
      </div>
    </div>
  );
}

