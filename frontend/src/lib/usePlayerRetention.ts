'use client';

import { useEffect, useMemo, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import {
  decodePlayerRetention,
  playerRetentionPda,
  type PlayerRetention,
} from '@/lib/playerRetention';

export function usePlayerRetention() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [retention, setRetention] = useState<PlayerRetention | null>(null);
  const [loading, setLoading] = useState(false);

  const pda = useMemo(() => (publicKey ? playerRetentionPda(publicKey) : null), [publicKey]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!pda) {
        setRetention(null);
        return;
      }

      setLoading(true);
      try {
        const info = await connection.getAccountInfo(pda, 'confirmed');
        if (cancelled) return;
        if (!info?.data) {
          setRetention(null);
          return;
        }
        setRetention(decodePlayerRetention(Buffer.from(info.data)));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run().catch(() => {});

    let subId: number | null = null;
    if (pda) {
      subId = connection.onAccountChange(
        pda,
        (acc) => {
          if (cancelled) return;
          setRetention(decodePlayerRetention(Buffer.from(acc.data)));
        },
        'confirmed'
      );
    }

    const interval = window.setInterval(() => run().catch(() => {}), 15_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      if (subId != null) connection.removeAccountChangeListener(subId).catch(() => {});
    };
  }, [connection, pda]);

  return { retention, loading, pda };
}

