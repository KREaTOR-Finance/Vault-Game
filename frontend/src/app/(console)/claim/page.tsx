'use client';

import { useEffect, useMemo, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction } from '@solana/web3.js';
import { claimPrizeIx, claimWinIx } from '@/lib/anchor';
import { useVaultTelemetry } from '@/lib/useVaultTelemetry';

function parsePubkey(value: string): PublicKey | null {
  try {
    return new PublicKey(value.trim());
  } catch {
    return null;
  }
}

export default function ClaimPage() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();

  const [vaultInput, setVaultInput] = useState('');
  const [secret, setSecret] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (vaultInput.trim().length > 0) return;
    try {
      const v = localStorage.getItem('vault_game:last_created_vault');
      if (v) setVaultInput(v);
    } catch {
      // ignore
    }
  }, [vaultInput]);

  const vaultKey = useMemo(() => parsePubkey(vaultInput), [vaultInput]);
  const { vault } = useVaultTelemetry(vaultKey ?? undefined);

  async function verifySecret() {
    if (!publicKey) {
      setStatus('NO WALLET CONNECTED.');
      return;
    }
    if (!vaultKey) {
      setStatus('INVALID VAULT ADDRESS.');
      return;
    }
    if (!secret.trim()) {
      setStatus('ENTER SECRET / PIN FIRST.');
      return;
    }

    setBusy(true);
    setStatus('VERIFYING SECRET...');
    try {
      const ix = await claimWinIx({
        player: publicKey,
        vault: vaultKey,
        secret: secret.trim(),
      });
      const sig = await sendTransaction(new Transaction().add(ix), connection);
      await connection.confirmTransaction(sig, 'confirmed');
      setStatus(`SECRET VERIFIED: ${sig}`);
    } catch {
      setStatus('VERIFY FAILED.');
    } finally {
      setBusy(false);
    }
  }

  async function claimPayout() {
    if (!publicKey) {
      setStatus('NO WALLET CONNECTED.');
      return;
    }
    if (!vaultKey || !vault) {
      setStatus('VAULT DATA NOT READY.');
      return;
    }

    setBusy(true);
    setStatus('CLAIMING PAYOUT...');
    try {
      const ix = await claimPrizeIx({
        winner: publicKey,
        vault: vaultKey,
        feeMint: vault.feeMint,
      });
      const sig = await sendTransaction(new Transaction().add(ix), connection);
      await connection.confirmTransaction(sig, 'confirmed');
      setStatus(`PAYOUT CLAIMED: ${sig}`);
    } catch {
      setStatus('CLAIM FAILED (vault may not be expired or you are not winner).');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-matrix-dim">
        MODULE: <span className="text-matrix">CLAIM</span>
      </div>

      <div className="border border-matrix-dim/30 bg-black/30 p-3 text-sm">
        <div className="text-xs tracking-widest text-matrix-dim">[ TARGET VAULT ]</div>
        <input
          className="mt-2 w-full border border-matrix-dim/30 bg-black/40 px-3 py-2 font-mono text-matrix outline-none"
          placeholder="Vault PDA"
          value={vaultInput}
          onChange={(e) => setVaultInput(e.target.value.trim())}
        />
        <input
          className="mt-2 w-full border border-matrix-dim/30 bg-black/40 px-3 py-2 font-mono text-matrix outline-none"
          placeholder="Secret / PIN"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
        />
      </div>

      <div className="border border-matrix-dim/30 bg-black/30 p-3 text-xs text-matrix-dim">
        STATE: <span className="text-matrix">{vault ? (vault.status === 1 ? 'LIVE' : 'SEALED') : '-'}</span>
        <br />
        PRIZE: <span className="text-matrix">{vault ? Number(vault.prizeAmount).toLocaleString() : 0}</span>
        <br />
        WINNER POOL: <span className="text-matrix">{vault ? Number(vault.winnerFeePool).toLocaleString() : 0}</span>
      </div>

      <div className="flex flex-wrap gap-2">
        <button className="btn-bracket" type="button" onClick={verifySecret} disabled={busy}>
          VERIFY SECRET
        </button>
        <button className="btn-bracket" type="button" onClick={claimPayout} disabled={busy}>
          CLAIM PAYOUT
        </button>
      </div>

      {status ? <div className="border border-matrix-dim/30 bg-black/30 px-3 py-2 text-xs text-matrix">{status}</div> : null}
    </div>
  );
}

