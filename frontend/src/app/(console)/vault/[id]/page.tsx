'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { PublicKey } from '@solana/web3.js';
import Sparkline from '@/components/console/Sparkline';
import { useVaultTelemetry } from '@/lib/useVaultTelemetry';

function isProbablyPubkey(s: string) {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(s);
}

export default function VaultDetailPage({ params }: { params: { id: string } }) {
  const id = params.id;

  const vaultPda = useMemo(() => {
    if (isProbablyPubkey(id)) return new PublicKey(id);
    // fallback: treat as numeric vault index for legacy routes
    const n = Number(id);
    if (Number.isFinite(n)) {
      const buf = Buffer.alloc(8);
      // eslint-disable-next-line no-undef
      buf.writeBigUInt64LE(BigInt(n));
      return PublicKey.findProgramAddressSync([Buffer.from('vault'), buf], new PublicKey('B1uj973FayJZYCHVJx3td57zMMBzg4n6UENB3bS24F3t'))[0];
    }
    return new PublicKey('11111111111111111111111111111111');
  }, [id]);

  const { vault, feeHistory } = useVaultTelemetry(vaultPda);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div className="text-sm text-matrix-dim">
          MODULE: <span className="text-matrix">VAULT</span>
          <span className="text-matrix-dim"> / </span>
          <span className="text-matrix-hot">{id}</span>
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
              STATE: <span className="text-matrix">{vault ? (vault.status === 1 ? 'LIVE' : 'SEALED') : '—'}</span>
            </div>
            <div>
              FEE: <span className="text-matrix">{vault ? (vault.isSolFee ? 'SOL' : 'SKR') : '—'}</span>
            </div>
            <div>
              ATTEMPTS: <span className="text-matrix">{vault ? Number(vault.attemptCount) : 0}</span>
            </div>
            <div>
              NEXT COST:{' '}
              <span className="text-matrix-hot">{vault ? Number(vault.currentFeeAmount) : 0}</span>
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
          <div className="text-xs tracking-widest text-matrix-dim">[ SEEDS / ADDRESSES ]</div>
          <div className="mt-2 space-y-1 text-xs text-matrix-dim">
            <div>VAULT PDA: …</div>
            <div>TREASURY: …</div>
            <div>PRIZE ATA: …</div>
          </div>
        </section>
      </div>

      <section className="border border-matrix-dim/30 bg-black/30 p-3">
        <div className="text-xs tracking-widest text-matrix-dim">[ EVENT FEED ]</div>
        <div className="mt-2 space-y-1 text-xs text-matrix-dim/90">
          <div>
            <span className="text-matrix">[EVT]</span> VaultCreated
          </div>
          <div>
            <span className="text-matrix">[EVT]</span> HintPublished
          </div>
          <div>
            <span className="text-matrix">[EVT]</span> CrackAttempted
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
