'use client';

import { useMemo, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction } from '@solana/web3.js';
import { reclaimPrizeIx } from '@/lib/anchor';
import { useVaultTelemetry } from '@/lib/useVaultTelemetry';

function parsePubkey(value: string): PublicKey | null {
  try {
    return new PublicKey(value.trim());
  } catch {
    return null;
  }
}

export default function CancelPage() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();

  const [vaultInput, setVaultInput] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  const vaultKey = useMemo(() => parsePubkey(vaultInput), [vaultInput]);
  const { vault } = useVaultTelemetry(vaultKey ?? undefined);

  async function reclaim() {
    if (!publicKey) {
      setStatus('NO WALLET CONNECTED.');
      return;
    }
    if (!vaultKey || !vault) {
      setStatus('VAULT DATA NOT READY.');
      return;
    }

    setBusy(true);
    setStatus('RECLAIMING CREATOR FUNDS...');
    try {
      const ix = await reclaimPrizeIx({
        creator: publicKey,
        vault: vaultKey,
        feeMint: vault.feeMint,
      });
      const sig = await sendTransaction(new Transaction().add(ix), connection);
      await connection.confirmTransaction(sig, 'confirmed');
      setStatus(`RECLAIM COMPLETE: ${sig}`);
    } catch {
      setStatus('RECLAIM FAILED (vault may not be expired, already settled, or wrong creator).');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-matrix-dim">
        MODULE: <span className="text-matrix">CANCEL</span>
      </div>

      <div className="border border-matrix-dim/30 bg-black/30 p-3 text-xs text-matrix-dim">
        Creator reclaim path. Only valid for expired vaults without winner.
      </div>

      <div className="border border-matrix-dim/30 bg-black/30 p-3 text-sm">
        <div className="text-xs tracking-widest text-matrix-dim">[ VAULT ]</div>
        <input
          className="mt-2 w-full border border-matrix-dim/30 bg-black/40 px-3 py-2 font-mono text-matrix outline-none"
          placeholder="Vault PDA"
          value={vaultInput}
          onChange={(e) => setVaultInput(e.target.value.trim())}
        />
      </div>

      <div className="border border-matrix-dim/30 bg-black/30 p-3 text-xs text-matrix-dim">
        STATE: <span className="text-matrix">{vault ? (vault.status === 1 ? 'LIVE' : 'SEALED') : '-'}</span>
        <br />
        ATTEMPTS: <span className="text-matrix">{vault ? Number(vault.attemptCount).toLocaleString() : 0}</span>
      </div>

      <button className="btn-bracket" type="button" onClick={reclaim} disabled={busy}>
        {busy ? 'PROCESSING...' : 'CONFIRM RECLAIM'}
      </button>

      {status ? <div className="border border-matrix-dim/30 bg-black/30 px-3 py-2 text-xs text-matrix">{status}</div> : null}
    </div>
  );
}

