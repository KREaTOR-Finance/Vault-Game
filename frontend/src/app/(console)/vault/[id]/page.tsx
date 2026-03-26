'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { PublicKey } from '@solana/web3.js';
import Sparkline from '@/components/console/Sparkline';
import { associatedTokenAddress, megaVaultPda } from '@/lib/anchor';
import { formatDurationSeconds } from '@/lib/time';
import { useVaultTelemetry } from '@/lib/useVaultTelemetry';

function isProbablyPubkey(s: string) {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(s);
}

function shortKey(k: string) {
  return `${k.slice(0, 4)}...${k.slice(-4)}`;
}

export default function VaultDetailPage({ params }: { params: { id: string } }) {
  const id = params.id;
  const [nowSec, setNowSec] = useState(() => Math.floor(Date.now() / 1000));

  const vaultPda = useMemo(() => {
    if (isProbablyPubkey(id)) return new PublicKey(id);
    const n = Number(id);
    if (Number.isFinite(n)) {
      const buf = Buffer.alloc(8);
      // eslint-disable-next-line no-undef
      buf.writeBigUInt64LE(BigInt(n));
      return PublicKey.findProgramAddressSync(
        [Buffer.from('vault'), buf],
        new PublicKey('B1uj973FayJZYCHVJx3td57zMMBzg4n6UENB3bS24F3t')
      )[0];
    }
    return new PublicKey('11111111111111111111111111111111');
  }, [id]);

  const { vault, feeHistory } = useVaultTelemetry(vaultPda);

  useEffect(() => {
    const t = window.setInterval(() => setNowSec(Math.floor(Date.now() / 1000)), 1000);
    return () => window.clearInterval(t);
  }, []);

  const sealedFor = useMemo(() => {
    if (!vault) return '-';
    const createdAt = Number(vault.createdAt);
    if (!Number.isFinite(createdAt) || createdAt <= 0) return '-';
    return formatDurationSeconds(Math.max(0, nowSec - createdAt));
  }, [vault, nowSec]);

  const timeLeft = useMemo(() => {
    if (!vault) return '-';
    const endTs = Number(vault.endTs);
    const delta = endTs - nowSec;
    if (delta <= 0) return 'ENDED';
    return formatDurationSeconds(delta);
  }, [vault, nowSec]);

  const vaultAta = useMemo(() => {
    if (!vault) return null;
    return associatedTokenAddress(vault.feeMint, vaultPda);
  }, [vault, vaultPda]);

  const megaAta = useMemo(() => {
    if (!vault) return null;
    return associatedTokenAddress(vault.feeMint, megaVaultPda());
  }, [vault]);

  const jackpot = useMemo(() => {
    if (!vault) return 0;
    return Number(vault.prizeAmount) + Number(vault.winnerFeePool);
  }, [vault]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div className="text-sm text-matrix-dim">
          MODULE: <span className="text-matrix">VAULT</span>
          <span className="text-matrix-dim"> / </span>
          <span className="text-matrix-hot">{shortKey(vaultPda.toBase58())}</span>
        </div>
        <Link href="/vaults" className="btn-bracket">
          BACK
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <section className="border border-matrix-dim/30 bg-black/30 p-3">
          <div className="text-xs tracking-widest text-matrix-dim">[ TELEMETRY ]</div>
          <div className="mt-2 space-y-1 text-sm">
            <div>
              STATE: <span className="text-matrix">{vault ? (vault.status === 1 ? 'LIVE' : 'SEALED') : '-'}</span>
            </div>
            <div>
              FEE UNIT: <span className="text-matrix">{vault ? (vault.isSolFee ? 'SOL' : 'VC') : '-'}</span>
            </div>
            <div>
              ATTEMPTS: <span className="text-matrix">{vault ? Number(vault.attemptCount).toLocaleString() : 0}</span>
            </div>
            <div>
              NEXT COST: <span className="text-matrix-hot">{vault ? Number(vault.currentFeeAmount).toLocaleString() : 0}</span>
            </div>
            <div>
              JACKPOT: <span className="text-matrix-hot">{jackpot.toLocaleString()}</span>
            </div>
            <div>
              SEALED FOR: <span className="text-matrix">{sealedFor}</span>
              <span className="mx-2 text-matrix-dim">|</span>
              TIME LEFT: <span className="text-matrix">{timeLeft}</span>
            </div>
            <div className="pt-2 text-xs text-matrix-dim">
              FEE LADDER
              <div className="mt-1 text-matrix">
                <Sparkline values={feeHistory.length ? feeHistory : [0]} />
              </div>
            </div>
          </div>
        </section>

        <section className="border border-matrix-dim/30 bg-black/30 p-3">
          <div className="text-xs tracking-widest text-matrix-dim">[ ADDRESSES ]</div>
          <div className="mt-2 space-y-1 text-xs text-matrix-dim">
            <div>VAULT PDA: <span className="font-mono text-matrix">{shortKey(vaultPda.toBase58())}</span></div>
            <div>VAULT ATA: <span className="font-mono text-matrix">{vaultAta ? shortKey(vaultAta.toBase58()) : '-'}</span></div>
            <div>MEGA ATA: <span className="font-mono text-matrix">{megaAta ? shortKey(megaAta.toBase58()) : '-'}</span></div>
            <div>FEE MINT: <span className="font-mono text-matrix">{vault ? shortKey(vault.feeMint.toBase58()) : '-'}</span></div>
          </div>
        </section>
      </div>

      <section className="border border-matrix-dim/30 bg-black/30 p-3">
        <div className="text-xs tracking-widest text-matrix-dim">[ FEED ]</div>
        <div className="mt-2 space-y-1 text-xs text-matrix-dim/90">
          <div>
            <span className="text-matrix">[EVT]</span> Attempts: {vault ? Number(vault.attemptCount).toLocaleString() : 0}
          </div>
          <div>
            <span className="text-matrix">[EVT]</span> Next Cost: {vault ? Number(vault.currentFeeAmount).toLocaleString() : 0}
          </div>
          <div>
            <span className="text-matrix">[EVT]</span> Winner Pool: {vault ? Number(vault.winnerFeePool).toLocaleString() : 0}
          </div>
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        <Link className="btn-bracket" href="/crack">
          CRACK
        </Link>
        <Link className="btn-bracket" href="/claim">
          CLAIM
        </Link>
        <Link className="btn-bracket" href="/cancel">
          CANCEL
        </Link>
      </div>
    </div>
  );
}

