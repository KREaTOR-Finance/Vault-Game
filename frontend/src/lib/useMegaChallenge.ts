'use client';

import { useEffect, useMemo, useState } from 'react';
import { useConnection } from '@solana/wallet-adapter-react';
import { decodeMegaChallenge, megaChallengePda, type MegaChallenge } from '@/lib/megaChallenge';

export function useMegaChallenge() {
  const { connection } = useConnection();
  const [state, setState] = useState<MegaChallenge | null>(null);
  const [loading, setLoading] = useState(false);

  const pda = useMemo(() => megaChallengePda(), []);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      try {
        const info = await connection.getAccountInfo(pda, 'confirmed');
        if (cancelled) return;
        if (!info?.data) {
          setState(null);
          return;
        }
        setState(decodeMegaChallenge(Buffer.from(info.data)));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [connection, pda]);

  return { state, loading, pda };
}
