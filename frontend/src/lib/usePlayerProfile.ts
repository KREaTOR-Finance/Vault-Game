'use client';

import { useEffect, useMemo, useState } from 'react';
import { useConnection } from '@solana/wallet-adapter-react';
import { useWallet } from '@solana/wallet-adapter-react';
import { decodePlayerProfile, playerProfilePda, type PlayerProfile } from '@/lib/playerProfile';

export function usePlayerProfile() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [loading, setLoading] = useState(false);

  const pda = useMemo(() => (publicKey ? playerProfilePda(publicKey) : null), [publicKey]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!publicKey || !pda) {
        setProfile(null);
        return;
      }

      setLoading(true);
      try {
        const info = await connection.getAccountInfo(pda);
        if (cancelled) return;
        if (!info?.data) {
          setProfile(null);
          return;
        }
        setProfile(decodePlayerProfile(Buffer.from(info.data)));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    // Refresh on an interval (cheap single-account fetch).
    const id = setInterval(run, 10_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [connection, publicKey, pda]);

  return { profile, loading, pda };
}
