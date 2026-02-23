'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useEffect, useMemo } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';

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
  const { connected } = useWallet();

  // Wallet-gate: once connected, allow entrance to console.
  useEffect(() => {
    if (!connected) return;
    // Soft redirect by link (keeps client-only wallet state stable)
    window.location.href = '/vaults';
  }, [connected]);

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
            A console-style on-chain vault cracking game. Connect a wallet to enter.
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

          <div className="mt-6 space-y-2 text-xs text-matrix-dim/80">
            <div>
              SeedVault / MWA works when opened inside Solana Mobile (Saga/Seeker) browser.
            </div>
            <div>
              Important: MWA requires an <span className="text-matrix">https://</span> origin. If you open a local
              <span className="text-matrix"> http://192.168…</span> link, wallets may show as “Install / Download”.
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
