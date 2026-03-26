'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction } from '@solana/web3.js';
import { triggerWinFanfare } from '@/components/console/WinFanfareOverlay';
import { dailyFreeTryIx, guessAndVerifySolIx, guessAndVerifySplIx } from '@/lib/anchor';
import { formatDurationSeconds } from '@/lib/time';
import { useMegaChallenge } from '@/lib/useMegaChallenge';
import { usePlayerRetention } from '@/lib/usePlayerRetention';
import { decodeVault } from '@/lib/vault';
import { useVaultTelemetry } from '@/lib/useVaultTelemetry';

function maskPin(pin: string) {
  return pin.replace(/./g, '#');
}

function shortKey(k: string) {
  return `${k.slice(0, 4)}...${k.slice(-4)}`;
}

function parsePubkey(value: string): PublicKey | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    return new PublicKey(trimmed);
  } catch {
    return null;
  }
}

function clampDigits(value: string, maxLen: number) {
  return value.replace(/\D/g, '').slice(0, maxLen);
}

function isUserRejected(err: unknown) {
  const msg = String(err || '').toLowerCase();
  return msg.includes('rejected') || msg.includes('declined') || msg.includes('cancelled') || msg.includes('canceled');
}

function formatError(err: unknown) {
  if (err instanceof Error && err.message) {
    return err.message.split('\n')[0].slice(0, 180);
  }
  return 'Unknown error';
}

function dayIndex(nowSec: number) {
  return Math.floor(nowSec / 86_400);
}

function streakMultiplier(streakDays: number) {
  const extra = Math.min(75, Math.max(0, streakDays - 1) * 5);
  return (100 + extra) / 100;
}

function nextResetInSec(nowSec: number) {
  const next = (Math.floor(nowSec / 86_400) + 1) * 86_400;
  return Math.max(0, next - nowSec);
}

export default function CrackPage() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const { state: megaChallenge } = useMegaChallenge();
  const { retention } = usePlayerRetention();

  const [pin, setPin] = useState('');
  const [vaultInput, setVaultInput] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [useFreeTry, setUseFreeTry] = useState(true);
  const [nowSec, setNowSec] = useState(() => Math.floor(Date.now() / 1000));

  const maxLen = 8;

  useEffect(() => {
    const timer = window.setInterval(() => setNowSec(Math.floor(Date.now() / 1000)), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (vaultInput.trim().length > 0) return;
    const mega = megaChallenge?.vault?.toBase58();
    if (!mega || mega === '11111111111111111111111111111111') return;
    setVaultInput(mega);
  }, [megaChallenge, vaultInput]);

  const targetVault = useMemo(() => parsePubkey(vaultInput), [vaultInput]);
  const { vault } = useVaultTelemetry(targetVault ?? undefined);

  const today = dayIndex(nowSec);
  const rawStreak = retention ? retention.streakDays : 0;
  const lastPlayDay = retention ? Number(retention.lastPlayDay) : -1;
  const streakDays = lastPlayDay === today || lastPlayDay === today - 1 ? rawStreak : 0;
  const multiplier = streakMultiplier(streakDays);
  const freeTryAvailable = retention ? Number(retention.freeTryDay) !== today : true;
  const xp = retention ? Number(retention.xp) : 0;
  const plays = retention ? Number(retention.plays) : 0;

  useEffect(() => {
    if (!freeTryAvailable) setUseFreeTry(false);
  }, [freeTryAvailable]);

  const jackpot = useMemo(() => {
    if (!vault) return 0;
    return Number(vault.prizeAmount) + Number(vault.winnerFeePool);
  }, [vault]);

  const sealedFor = useMemo(() => {
    if (!vault) return '-';
    const createdAt = Number(vault.createdAt);
    if (!Number.isFinite(createdAt) || createdAt <= 0) return '-';
    return formatDurationSeconds(Math.max(0, nowSec - createdAt));
  }, [vault, nowSec]);

  const hint = useMemo(() => {
    if (!pin.length) return 'ENTER 3-8 DIGITS';
    return `${pin.length}/${maxLen}`;
  }, [pin.length]);

  function pushDigit(d: string) {
    setPin((prev) => (prev.length >= maxLen ? prev : prev + d));
  }

  function backspace() {
    setPin((prev) => prev.slice(0, -1));
  }

  function clear() {
    setPin('');
  }

  async function submit() {
    if (!publicKey) {
      setStatus('NO WALLET: connect first.');
      return;
    }
    if (!targetVault) {
      setStatus('INVALID VAULT ADDRESS.');
      return;
    }
    if (!vault) {
      setStatus('VAULT DATA NOT LOADED.');
      return;
    }
    if (vault.status !== 1) {
      setStatus('VAULT NOT ACTIVE.');
      return;
    }
    if (pin.length < 3 || pin.length > maxLen) {
      setStatus('PIN LENGTH MUST BE 3-8 DIGITS.');
      return;
    }

    const consumeFreeTry = useFreeTry && freeTryAvailable;
    setBusy(true);
    setStatus(consumeFreeTry ? 'USING ON-CHAIN DAILY FREE TRY...' : 'SENDING PAID ATTEMPT + VERIFY...');

    try {
      if (consumeFreeTry) {
        const freeIx = await dailyFreeTryIx({
          player: publicKey,
          vault: targetVault,
          secret: pin,
        });
        const freeTx = new Transaction().add(freeIx);
        const sig = await sendTransaction(freeTx, connection);
        await connection.confirmTransaction(sig, 'confirmed');

        try {
          localStorage.setItem('vault_game:did_attempt', '1');
        } catch {
          // ignore
        }

        const info = await connection.getAccountInfo(targetVault, 'confirmed');
        let won = false;
        if (info?.data) {
          const latest = decodeVault(Buffer.from(info.data));
          won = !!latest.winner?.equals(publicKey);
        }

        if (won) {
          triggerWinFanfare({
            vault: targetVault.toBase58(),
            amount: `${jackpot} ${vault.isSolFee ? 'SOL' : 'VC'}`,
            sig,
          });
          setStatus(`FREE TRY HIT: ${sig.slice(0, 12)}... Go to CLAIM after expiry.`);
          setPin('');
        } else {
          setStatus(`FREE TRY USED: ${sig.slice(0, 12)}... no match.`);
        }
      } else {
        const paidIx = vault.isSolFee
          ? await guessAndVerifySolIx({ player: publicKey, vault: targetVault, secret: pin })
          : await guessAndVerifySplIx({ player: publicKey, vault: targetVault, feeMint: vault.feeMint, secret: pin });

        const paidTx = new Transaction().add(paidIx);
        const paidSig = await sendTransaction(paidTx, connection);
        await connection.confirmTransaction(paidSig, 'confirmed');

        try {
          localStorage.setItem('vault_game:did_attempt', '1');
        } catch {
          // ignore
        }

        const info = await connection.getAccountInfo(targetVault, 'confirmed');
        let won = false;
        if (info?.data) {
          const latest = decodeVault(Buffer.from(info.data));
          won = !!latest.winner?.equals(publicKey);
        }

        if (won) {
          triggerWinFanfare({
            vault: targetVault.toBase58(),
            amount: `${jackpot} ${vault.isSolFee ? 'SOL' : 'VC'}`,
            sig: paidSig,
          });
          setStatus(`WIN CONFIRMED: ${paidSig.slice(0, 12)}... Go to CLAIM after expiry.`);
          setPin('');
        } else {
          setStatus(`ATTEMPT LOGGED: ${paidSig.slice(0, 12)}... no match.`);
        }
      }
    } catch (err) {
      if (isUserRejected(err)) {
        setStatus('TRANSACTION CANCELLED.');
      } else {
        setStatus(`FAIL: ${formatError(err)}`);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-matrix-dim">
        MODULE: <span className="text-matrix">CRACK</span>
      </div>

      <section className="border border-matrix-dim/30 bg-black/30 p-3 text-sm">
        <div className="text-xs tracking-widest text-matrix-dim">[ TARGET ]</div>
        <input
          className="mt-2 w-full border border-matrix-dim/30 bg-black/40 px-3 py-2 font-mono text-matrix outline-none"
          placeholder="Vault PDA"
          value={vaultInput}
          onChange={(e) => setVaultInput(e.target.value.trim())}
        />
        {targetVault ? (
          <div className="mt-2 text-xs text-matrix-dim">
            ACTIVE: <span className="font-mono text-matrix">{shortKey(targetVault.toBase58())}</span>
          </div>
        ) : (
          <div className="mt-2 text-xs text-matrix-dim">Waiting for Mega Vault address...</div>
        )}
      </section>

      <section className="border border-matrix-dim/30 bg-black/30 p-3 text-xs text-matrix-dim">
        <div className="text-xs tracking-widest text-matrix-dim">[ PDA RETENTION ]</div>
        <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-3">
          <div>
            FREE TRY:{' '}
            <span className={freeTryAvailable ? 'text-matrix-hot' : 'text-matrix-dim'}>
              {freeTryAvailable ? 'READY' : 'USED'}
            </span>
          </div>
          <div>
            STREAK: <span className="text-matrix">{streakDays}d</span>
          </div>
          <div>
            MULT: <span className="text-matrix-hot">x{multiplier.toFixed(2)}</span>
          </div>
          <div>
            XP: <span className="text-matrix">{xp.toLocaleString()}</span>
          </div>
          <div>
            PLAYS: <span className="text-matrix">{plays.toLocaleString()}</span>
          </div>
          <div>
            RESET IN: <span className="text-matrix">{formatDurationSeconds(nextResetInSec(nowSec))}</span>
          </div>
        </div>

        <label className="mt-3 flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            className="h-3 w-3"
            checked={useFreeTry && freeTryAvailable}
            onChange={(e) => setUseFreeTry(e.target.checked)}
            disabled={!freeTryAvailable || busy}
          />
          <span className="text-matrix-dim">Use daily free try on next crack</span>
        </label>
      </section>

      <section className="border border-matrix-dim/30 bg-black/30 p-3 text-xs text-matrix-dim">
        <div className="grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-3">
          <div>
            STATE: <span className="text-matrix">{vault ? (vault.status === 1 ? 'LIVE' : 'SEALED') : '-'}</span>
          </div>
          <div>
            COST: <span className="text-matrix-hot">{vault ? Number(vault.currentFeeAmount) : 0}</span>
          </div>
          <div>
            FEE: <span className="text-matrix">{vault ? (vault.isSolFee ? 'SOL' : 'VC') : '-'}</span>
          </div>
          <div>
            ATTEMPTS: <span className="text-matrix">{vault ? Number(vault.attemptCount).toLocaleString() : 0}</span>
          </div>
          <div>
            JACKPOT: <span className="text-matrix-hot">{vault ? jackpot.toLocaleString() : 0}</span>
          </div>
          <div>
            SEALED FOR: <span className="text-matrix">{sealedFor}</span>
          </div>
        </div>
      </section>

      <section className="border border-matrix-dim/30 bg-black/30 p-3 text-sm">
        <div className="flex items-center justify-between">
          <div>
            PIN: <span className="text-matrix-hot">{maskPin(pin).padEnd(maxLen, '.')}</span>
          </div>
          <div className="text-xs text-matrix-dim">{hint}</div>
        </div>

        <div className="mt-3">
          <input
            className="w-full border border-matrix-dim/30 bg-black/40 px-3 py-2 font-mono text-matrix outline-none"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            placeholder="Enter 3-8 digit PIN"
            value={pin}
            onChange={(e) => setPin(clampDigits(e.target.value, maxLen))}
          />
        </div>
      </section>

      <div className="grid grid-cols-3 gap-2">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <button key={d} className="btn-bracket" type="button" onClick={() => pushDigit(d)} disabled={busy}>
            {d}
          </button>
        ))}
        <button className="btn-bracket" type="button" onClick={backspace} disabled={busy}>
          DEL
        </button>
        <button className="btn-bracket" type="button" onClick={() => pushDigit('0')} disabled={busy}>
          0
        </button>
        <button className="btn-bracket" type="button" onClick={clear} disabled={busy}>
          CLR
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <button className="btn-bracket" type="button" onClick={submit} disabled={busy}>
          {busy ? 'PROCESSING...' : useFreeTry && freeTryAvailable ? 'FREE TRY + VERIFY' : 'ATTEMPT + VERIFY'}
        </button>
        <Link className="btn-bracket" href={targetVault ? `/vault/${targetVault.toBase58()}` : '/vaults'}>
          OPEN VAULT
        </Link>
        <Link className="btn-bracket" href="/claim">
          CLAIM
        </Link>
      </div>

      {status ? <div className="border border-matrix-dim/30 bg-black/30 px-3 py-2 text-xs text-matrix">{status}</div> : null}

      <div className="text-xs text-matrix-dim/80">
        Daily free try and streak are wallet-bound in the on-chain retention PDA.
      </div>
    </div>
  );
}
