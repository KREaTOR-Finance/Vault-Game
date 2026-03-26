'use client';

import { useCallback, useEffect, useState } from 'react';
import { useConnection } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { decodeVault, type VaultState } from '@/lib/vault';
import { VAULT_GAME_PROGRAM_ID } from '@/lib/playerProfile';

export type VaultListItem = {
  pubkey: PublicKey;
  vault: VaultState;
};

function safeDecode(pubkey: PublicKey, data: Buffer): VaultListItem | null {
  try {
    return { pubkey, vault: decodeVault(data) };
  } catch {
    return null;
  }
}

export function useVaultList() {
  const { connection } = useConnection();
  const [vaults, setVaults] = useState<VaultListItem[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await connection.getProgramAccounts(VAULT_GAME_PROGRAM_ID, {
        commitment: 'confirmed',
      });

      const decoded = rows
        .map((row) => safeDecode(row.pubkey, Buffer.from(row.account.data)))
        .filter((v): v is VaultListItem => !!v);

      decoded.sort((a, b) => {
        const aAttempts = Number(a.vault.attemptCount);
        const bAttempts = Number(b.vault.attemptCount);
        if (bAttempts !== aAttempts) return bAttempts - aAttempts;

        const aValue = Number(a.vault.prizeAmount) + Number(a.vault.winnerFeePool);
        const bValue = Number(b.vault.prizeAmount) + Number(b.vault.winnerFeePool);
        return bValue - aValue;
      });

      setVaults(decoded);
    } finally {
      setLoading(false);
    }
  }, [connection]);

  useEffect(() => {
    let cancelled = false;
    let timer: number | null = null;

    const schedule = () => {
      if (timer != null) window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (!cancelled) refresh().catch(() => {});
      }, 500);
    };

    refresh().catch(() => {});

    const subId = connection.onLogs(
      VAULT_GAME_PROGRAM_ID,
      () => {
        if (cancelled) return;
        schedule();
      },
      'confirmed'
    );

    const pollId = window.setInterval(() => {
      if (!cancelled) refresh().catch(() => {});
    }, 20_000);

    return () => {
      cancelled = true;
      if (timer != null) window.clearTimeout(timer);
      window.clearInterval(pollId);
      connection.removeOnLogsListener(subId).catch(() => {});
    };
  }, [connection, refresh]);

  return { vaults, loading, refresh };
}

