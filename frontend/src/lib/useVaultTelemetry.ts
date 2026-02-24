'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useConnection } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { decodeVault, type VaultState } from '@/lib/vault';

export function useVaultTelemetry(vaultKey: PublicKey) {
  const { connection } = useConnection();
  const [vault, setVault] = useState<VaultState | null>(null);
  const [loading, setLoading] = useState(false);
  const feeHistory = useRef<number[]>([]);

  const vaultPda = useMemo(() => vaultKey, [vaultKey]);

  useEffect(() => {
    let cancelled = false;
    let subId: number | null = null;

    async function fetchOnce() {
      setLoading(true);
      try {
        const info = await connection.getAccountInfo(vaultPda, 'confirmed');
        if (cancelled) return;
        if (!info?.data) {
          setVault(null);
          return;
        }
        const v = decodeVault(Buffer.from(info.data));
        setVault(v);

        const fee = Number(v.currentFeeAmount);
        if (Number.isFinite(fee)) {
          const h = feeHistory.current;
          h.push(fee);
          if (h.length > 30) h.splice(0, h.length - 30);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchOnce();

    // Near-realtime: subscribe to account changes.
    subId = connection.onAccountChange(
      vaultPda,
      (acc) => {
        if (cancelled) return;
        const v = decodeVault(Buffer.from(acc.data));
        setVault(v);
        const fee = Number(v.currentFeeAmount);
        if (Number.isFinite(fee)) {
          const h = feeHistory.current;
          h.push(fee);
          if (h.length > 30) h.splice(0, h.length - 30);
        }
      },
      'confirmed'
    );

    return () => {
      cancelled = true;
      if (subId != null) connection.removeAccountChangeListener(subId).catch(() => {});
    };
  }, [connection, vaultPda]);

  return { vault, loading, vaultPda, feeHistory: feeHistory.current };
}
