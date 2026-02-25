'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useVaultTelemetry } from '@/lib/useVaultTelemetry';
import { useMegaChallenge } from '@/lib/useMegaChallenge';
import { formatDurationSeconds } from '@/lib/time';

const MOCK = [
  { id: 'A7K9', type: 'SOL', prize: '1.25 SOL', state: 'LIVE', timer: '—' },
  { id: 'X3Q1', type: 'TOKEN', prize: '5,000 $BYTE', state: 'LOCKED', timer: '00:04:12' },
  { id: 'N9F2', type: 'NFT', prize: 'DRAGON #044', state: 'CLAIMABLE', timer: '—' },
];

function shortKey(k: string) {
  return k.slice(0, 4) + '…' + k.slice(-4);
}

export default function VaultsPage() {
  const [nowSec, setNowSec] = useState(() => Math.floor(Date.now() / 1000));

  const { state: megaChallenge } = useMegaChallenge();

  useEffect(() => {
    const id = window.setInterval(() => setNowSec(Math.floor(Date.now() / 1000)), 1000);
    return () => window.clearInterval(id);
  }, []);

  const megaPda = useMemo(() => {
    const pk = megaChallenge?.vault;
    if (!pk) return null;
    const s = pk.toBase58();
    if (s === '11111111111111111111111111111111') return null;
    return pk;
  }, [megaChallenge]);

  const { vault: megaVault } = useVaultTelemetry(megaPda ?? undefined);

  const totalValue = useMemo(() => {
    if (!megaVault) return 0;
    // v1: show locked prize + fee pool as a single "value" number.
    return Number(megaVault.prizeAmount) + Number(megaVault.winnerFeePool);
  }, [megaVault]);

  const sealedFor = useMemo(() => {
    if (!megaVault) return '—';
    const createdAt = Number(megaVault.createdAt);
    if (!Number.isFinite(createdAt) || createdAt <= 0) return '—';
    const delta = Math.max(0, nowSec - createdAt);
    return formatDurationSeconds(delta);
  }, [megaVault, nowSec]);

  return (
    <div className="space-y-4">
      <div className="text-sm text-matrix-dim">
        MODULE: <span className="text-matrix">VAULTS</span>
      </div>

      {megaPda ? (
        <section className="border border-matrix-dim/30 bg-black/30 p-3">
          <div className="text-xs tracking-widest text-matrix-dim">[ MEGA VAULT ]</div>

          <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <div className="text-xs text-matrix-dim">VALUE</div>
              <div className="mt-1 text-3xl font-mono text-matrix-hot">
                {megaVault ? totalValue.toLocaleString() : '…'}
                <span className="ml-2 text-sm text-matrix-dim">VC</span>
              </div>
              <div className="mt-1 text-xs text-matrix-dim">
                Vault: <span className="font-mono">{shortKey(megaPda.toBase58())}</span>
              </div>
            </div>

            <div>
              <div className="text-xs text-matrix-dim">GUESSES</div>
              <div className="mt-1 text-3xl font-mono text-matrix">
                {megaVault ? Number(megaVault.attemptCount).toLocaleString() : '…'}
              </div>
              <div className="mt-1 text-xs text-matrix-dim">
                SEALED FOR: <span className="text-matrix">{sealedFor}</span>
                <span className="mx-2 text-matrix-dim">·</span>
                PIN: <span className="text-matrix">8 digits</span>
              </div>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <Link className="btn-bracket" href={`/vault/${megaPda.toBase58()}`}>
              OPEN MEGA VAULT
            </Link>
            <Link className="btn-bracket" href="/crack">
              CRACK
            </Link>
            <Link className="btn-bracket" href="/lore">
              READ LORE
            </Link>
          </div>
        </section>
      ) : (
        <section className="border border-matrix-dim/30 bg-black/30 p-3 text-xs text-matrix-dim">
          No Mega Vault set yet.
        </section>
      )}

      <div className="overflow-x-auto border border-matrix-dim/30">
        <table className="w-full text-sm">
          <thead className="bg-black/40 text-xs tracking-widest text-matrix-dim">
            <tr>
              <th className="px-3 py-2 text-left">ID</th>
              <th className="px-3 py-2 text-left">TYPE</th>
              <th className="px-3 py-2 text-left">PRIZE</th>
              <th className="px-3 py-2 text-left">STATE</th>
              <th className="px-3 py-2 text-left">TIMER</th>
              <th className="px-3 py-2 text-left">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {MOCK.map((v) => (
              <tr key={v.id} className="border-t border-matrix-dim/20 hover:bg-matrix-hot/5">
                <td className="px-3 py-2 text-matrix-hot">
                  <Link href={`/vault/${v.id}`} className="hover:underline">
                    {v.id}
                  </Link>
                </td>
                <td className="px-3 py-2">{v.type}</td>
                <td className="px-3 py-2">{v.prize}</td>
                <td className="px-3 py-2">{v.state}</td>
                <td className="px-3 py-2 text-matrix-dim">{v.timer}</td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-2">
                    <Link className="btn-bracket" href={`/vault/${v.id}`}>
                      OPEN
                    </Link>
                    <Link className="btn-bracket" href="/crack">
                      CRACK
                    </Link>
                    <Link className="btn-bracket" href="/claim">
                      CLAIM
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="text-xs text-matrix-dim">
        Tip: the Mega Vault is configured by admin and is shared globally.
      </div>
    </div>
  );
}
