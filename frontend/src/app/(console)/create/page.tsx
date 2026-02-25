'use client';

import { useMemo, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Transaction } from '@solana/web3.js';
import { advanceTutorial } from '@/components/console/TutorialOverlay';
import { createVaultIx, globalStatePda, vaultPdaFromCount } from '@/lib/anchor';
import { decodeGlobalState } from '@/lib/globalState';

function clampPinLen(n: number) {
  // v1: 3-6 for standard vaults. Mega vault uses 8.
  if (n === 8) return 8;
  return Math.max(3, Math.min(6, n));
}

export default function CreatePage() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();

  const [deposit, setDeposit] = useState(1000);
  const [durationHours, setDurationHours] = useState(24);
  const [baseFee, setBaseFee] = useState(1);
  const [pinLen, setPinLen] = useState(6);
  const [pin, setPin] = useState('');
  const [status, setStatus] = useState('');

  const startFee = useMemo(() => {
    const b = Math.max(0, Math.floor(baseFee));
    if (b === 0) return 0;
    const len = clampPinLen(pinLen);
    const mult = len === 3 ? 100 : len === 4 ? 25 : len === 5 ? 10 : len === 8 ? 1 : 10;
    return b * mult;
  }, [baseFee, pinLen]);

  async function broadcast() {
    const len = clampPinLen(pinLen);
    if (deposit < 1000) {
      setStatus('DEPOSIT TOO SMALL - minimum is 1000 SKR');
      return;
    }
    if (pin.length !== len) {
      setStatus(`PIN LENGTH MISMATCH - expected ${len} digits`);
      return;
    }
    if (!publicKey) {
      setStatus('NO WALLET - connect at the gate');
      return;
    }

    try {
      setStatus('CALIBRATING - reading global state…');
      const gsInfo = await connection.getAccountInfo(globalStatePda(), 'confirmed');
      if (!gsInfo?.data) {
        setStatus('GLOBAL STATE MISSING - program not initialized');
        return;
      }
      const gs = decodeGlobalState(Buffer.from(gsInfo.data));

      // secret_hash = sha256(pinBytes)
      setStatus('SEALING SECRET - hashing PIN…');
      const preimage = new TextEncoder().encode(pin);
      const hash = await crypto.subtle.digest('SHA-256', preimage);
      const secretHash = Buffer.from(hash);

      // Derive the vault PDA from the current vault_count BEFORE create.
      const vaultPda = vaultPdaFromCount(gs.vaultCount);

      setStatus('BROADCASTING VAULT - sign + send…');
      const ix = await createVaultIx({
        creator: publicKey,
        skrMint: gs.skrMint,
        vaultCount: gs.vaultCount,
        endTs: BigInt(Math.floor(Date.now() / 1000) + Math.max(1, durationHours) * 3600),
        secretHash,
        prizeAmount: BigInt(Math.max(0, Math.floor(deposit))),
        baseFeeAmount: BigInt(Math.max(0, Math.floor(baseFee))),
        pinLen: len,
      });

      const tx = new Transaction().add(ix);
      const sig = await sendTransaction(tx, connection);
      await connection.confirmTransaction(sig, 'confirmed');

      const url = `${window.location.origin}/vault/${vaultPda.toBase58()}`;
      try {
        await navigator.clipboard.writeText(url);
        setStatus(`VAULT CREATED - LINK COPIED: ${url}`);
      } catch {
        setStatus(`VAULT CREATED - SHARE LINK: ${url}`);
      }

      localStorage.setItem('vault_game:last_created_vault', vaultPda.toBase58());
      if (len === 8) {
        localStorage.setItem('vault_game:mega_vault', vaultPda.toBase58());
      }
      advanceTutorial('done');
    } catch {
      setStatus('BROADCAST FAILED - try again');
    }
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-matrix-dim">
        MODULE: <span className="text-matrix">CREATE</span>
      </div>

      <div className="border border-matrix-dim/30 bg-black/30 p-3">
        <div className="text-xs tracking-widest text-matrix-dim">[ PARAMETERS ]</div>

        <div className="mt-3 grid grid-cols-1 gap-3 text-sm">
          <label className="space-y-1">
            <div className="text-xs text-matrix-dim">DEPOSIT (SKR, min 1000)</div>
            <input
              className="w-full border border-matrix-dim/30 bg-black/40 px-3 py-2 font-mono text-matrix outline-none"
              inputMode="numeric"
              value={deposit}
              onChange={(e) => setDeposit(Number(e.target.value.replace(/\D/g, '') || '0'))}
            />
          </label>

          <label className="space-y-1">
            <div className="text-xs text-matrix-dim">DURATION (HOURS)</div>
            <input
              className="w-full border border-matrix-dim/30 bg-black/40 px-3 py-2 font-mono text-matrix outline-none"
              inputMode="numeric"
              value={durationHours}
              onChange={(e) => setDurationHours(Number(e.target.value.replace(/\D/g, '') || '0'))}
            />
          </label>

          <label className="space-y-1">
            <div className="text-xs text-matrix-dim">BASE FEE (0 = FREE)</div>
            <input
              className="w-full border border-matrix-dim/30 bg-black/40 px-3 py-2 font-mono text-matrix outline-none"
              inputMode="numeric"
              value={baseFee}
              onChange={(e) => setBaseFee(Number(e.target.value.replace(/\D/g, '') || '0'))}
            />
          </label>

          <label className="space-y-1">
            <div className="text-xs text-matrix-dim">PIN LENGTH (3-6, mega = 8)</div>
            <input
              className="w-full border border-matrix-dim/30 bg-black/40 px-3 py-2 font-mono text-matrix outline-none"
              inputMode="numeric"
              value={pinLen}
              onChange={(e) => setPinLen(Number(e.target.value.replace(/\D/g, '') || '0'))}
            />
          </label>

          <label className="space-y-1">
            <div className="text-xs text-matrix-dim">PIN ({clampPinLen(pinLen)} digits)</div>
            <input
              className="w-full border border-matrix-dim/30 bg-black/40 px-3 py-2 font-mono text-matrix outline-none"
              inputMode="numeric"
              value={pin}
              onChange={(e) => {
                const next = e.target.value.replace(/\D/g, '').slice(0, clampPinLen(pinLen));
                setPin(next);
              }}
            />
          </label>
        </div>

        <div className="mt-4 text-xs text-matrix-dim/90">
          STARTING ATTEMPT COST:{' '}
          <span className="text-matrix-hot">{startFee} SKR</span>
          <div className="mt-1">(Attempts escalate 1.2× each try.)</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button className="btn-bracket" type="button" onClick={broadcast}>
          BROADCAST VAULT
        </button>
      </div>

      {status ? (
        <div className="border border-matrix-dim/30 bg-black/30 px-3 py-2 text-xs text-matrix">{status}</div>
      ) : null}

      <div className="text-xs text-matrix-dim/70">
        You must remember your PIN to claim. The chain stores only the hash.
      </div>
    </div>
  );
}
