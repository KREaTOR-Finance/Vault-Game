'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Transaction } from '@solana/web3.js';
import { touchPlayerIx } from '@/lib/anchor';

const WalletMultiButton = dynamic(
  () => import('@solana/wallet-adapter-react-ui').then((m) => m.WalletMultiButton),
  { ssr: false }
);

function RuleLine({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
      <span className="text-matrix-dim">{k}:</span>
      <span className="text-matrix">{v}</span>
    </div>
  );
}

export default function LandingPage() {
  const { connection } = useConnection();
  const { connected, publicKey, sendTransaction } = useWallet();
  const [status, setStatus] = useState<string>('');
  const [showEnterAnyway, setShowEnterAnyway] = useState(false);
  const touchRan = useRef(false);

  // Wallet-gate: once connected, touch/init the on-chain player profile, then enter.
  useEffect(() => {
    if (!connected || !publicKey) {
      touchRan.current = false;
      setShowEnterAnyway(false);
      return;
    }

    // Prevent repeated touch attempts that can cause flicker on some mobile wallets.
    if (touchRan.current) return;
    touchRan.current = true;

    let cancelled = false;

    (async () => {
      try {
        setShowEnterAnyway(false);
        setStatus('LINK ESTABLISHED — initializing identity…');
        const ix = await touchPlayerIx(publicKey);
        const tx = new Transaction().add(ix);
        const sig = await sendTransaction(tx, connection);
        await connection.confirmTransaction(sig, 'confirmed');
        if (cancelled) return;
        setStatus('IDENTITY SYNCED — entering console…');
        window.location.href = '/vaults';
      } catch {
        if (cancelled) return;
        // Soft fallback: stay on the gate and let the player enter manually.
        // This avoids redirect loops if the wallet briefly drops connection during signing.
        setStatus('IDENTITY SYNC FAILED — you can still enter (profile may be empty until first action)');
        setShowEnterAnyway(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [connected, publicKey, sendTransaction, connection]);

  const rules = useMemo(
    () => [
      { k: 'OBJECTIVE', v: 'Crack vaults before the timer ends.' },
      { k: 'CURRENCY', v: 'SKR first. SOL fallback supported.' },
      { k: 'GUESS COST', v: 'Each attempt increases 1.2× the previous attempt.' },
      { k: 'FEES', v: '20% to winner, remainder to Mega Vault.' },
      { k: 'TIME', v: 'Vaults can run for 24h (creator-defined).' },
    ],
    []
  );

  return (
    <main className="relative min-h-dvh">
      <div className="mx-auto max-w-[980px] px-6 py-14">
        <div className="border border-matrix-dim/40 bg-black/55 p-6">
          <div className="text-xs tracking-widest text-matrix-dim">[ SEEDVAULT ACCESS GATE ]</div>
          <h1 className="mt-3 text-3xl font-semibold text-matrix">VAULT GAME</h1>
          <p className="mt-2 text-sm text-matrix-dim/90">
            A console-style vault cracking game. Connect a wallet to enter.
          </p>

          <div className="mt-6 space-y-2">
            {rules.map((r) => (
              <RuleLine key={r.k} k={r.k} v={r.v} />
            ))}
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <WalletMultiButton className="btn-bracket" />
            <Link className="btn-bracket" href="/help">
              READ MANUAL
            </Link>
          </div>

          {status ? (
            <div className="mt-4 border border-matrix-dim/30 bg-black/30 px-3 py-2 text-xs text-matrix">
              {status}
            </div>
          ) : null}

          {showEnterAnyway ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <Link className="btn-bracket" href="/vaults">
                ENTER CONSOLE
              </Link>
            </div>
          ) : null}

          <div className="mt-6 space-y-2 text-xs text-matrix-dim/80">
            <div>Tip: For the smoothest wallet connection, open Vault-Game from a secure link (HTTPS).</div>
            <div>If your wallet options look wrong, try reopening from the official link or switching browsers.</div>
          </div>
        </div>
      </div>
    </main>
  );
}
