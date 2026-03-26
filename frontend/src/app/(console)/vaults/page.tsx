'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { formatDurationSeconds } from '@/lib/time';
import { useMegaChallenge } from '@/lib/useMegaChallenge';
import { useVaultList } from '@/lib/useVaultList';
import { useVaultTelemetry } from '@/lib/useVaultTelemetry';

function shortKey(k: string) {
  return `${k.slice(0, 4)}...${k.slice(-4)}`;
}

function stateLabel(status: number, endTs: number, nowSec: number) {
  if (status === 1) return endTs > nowSec ? 'LIVE' : 'EXPIRED';
  if (status === 2) return 'SETTLED';
  if (status === 3) return 'CANCELLED';
  return 'UNKNOWN';
}

function timerLabel(status: number, endTs: number, nowSec: number) {
  if (status !== 1) return '-';
  if (endTs <= nowSec) return 'ENDED';
  return `${formatDurationSeconds(endTs - nowSec)} LEFT`;
}

export default function VaultsPage() {
  const [nowSec, setNowSec] = useState(() => Math.floor(Date.now() / 1000));
  const { state: megaChallenge } = useMegaChallenge();
  const { vaults, loading } = useVaultList();

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

  const megaValue = useMemo(() => {
    if (!megaVault) return 0;
    return Number(megaVault.prizeAmount) + Number(megaVault.winnerFeePool);
  }, [megaVault]);

  const sealedFor = useMemo(() => {
    if (!megaVault) return '-';
    const createdAt = Number(megaVault.createdAt);
    if (!Number.isFinite(createdAt) || createdAt <= 0) return '-';
    return formatDurationSeconds(Math.max(0, nowSec - createdAt));
  }, [megaVault, nowSec]);

  return (
    <div className="space-y-4">
      <div className="text-sm text-matrix-dim">
        MODULE: <span className="text-matrix">VAULTS</span>
      </div>

      {megaPda ? (
        <section className="border border-matrix-dim/30 bg-black/30 p-3">
          <div className="text-xs tracking-widest text-matrix-dim">[ MEGA VAULT ]</div>

          <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <div className="text-xs text-matrix-dim">JACKPOT</div>
              <div className="mt-1 text-3xl font-mono text-matrix-hot">
                {megaVault ? megaValue.toLocaleString() : '...'}
                <span className="ml-2 text-sm text-matrix-dim">{megaVault?.isSolFee ? 'SOL' : 'VC'}</span>
              </div>
            </div>

            <div>
              <div className="text-xs text-matrix-dim">ATTEMPTS</div>
              <div className="mt-1 text-3xl font-mono text-matrix">
                {megaVault ? Number(megaVault.attemptCount).toLocaleString() : '...'}
              </div>
            </div>

            <div>
              <div className="text-xs text-matrix-dim">NEXT COST</div>
              <div className="mt-1 text-3xl font-mono text-matrix-hot">
                {megaVault ? Number(megaVault.currentFeeAmount).toLocaleString() : '...'}
              </div>
              <div className="mt-1 text-xs text-matrix-dim">SEALED FOR: {sealedFor}</div>
            </div>
          </div>

          <div className="mt-3 text-xs text-matrix-dim">
            VAULT: <span className="font-mono text-matrix">{shortKey(megaPda.toBase58())}</span>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <Link className="btn-bracket" href={`/vault/${megaPda.toBase58()}`}>
              OPEN MEGA
            </Link>
            <Link className="btn-bracket" href="/crack">
              CRACK
            </Link>
          </div>
        </section>
      ) : (
        <section className="border border-matrix-dim/30 bg-black/30 p-3 text-xs text-matrix-dim">
          Mega vault is not configured yet.
        </section>
      )}

      <div className="overflow-x-auto border border-matrix-dim/30">
        <table className="w-full text-sm">
          <thead className="bg-black/40 text-xs tracking-widest text-matrix-dim">
            <tr>
              <th className="px-3 py-2 text-left">VAULT</th>
              <th className="px-3 py-2 text-left">JACKPOT</th>
              <th className="px-3 py-2 text-left">NEXT COST</th>
              <th className="px-3 py-2 text-left">ATTEMPTS</th>
              <th className="px-3 py-2 text-left">STATE</th>
              <th className="px-3 py-2 text-left">TIMER</th>
              <th className="px-3 py-2 text-left">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {vaults.map((item) => {
              const v = item.vault;
              const endTs = Number(v.endTs);
              const status = stateLabel(v.status, endTs, nowSec);
              const timer = timerLabel(v.status, endTs, nowSec);
              const value = Number(v.prizeAmount) + Number(v.winnerFeePool);
              const feeUnit = v.isSolFee ? 'SOL' : 'VC';
              const id = item.pubkey.toBase58();

              return (
                <tr key={id} className="border-t border-matrix-dim/20 hover:bg-matrix-hot/5">
                  <td className="px-3 py-2 text-matrix-hot">
                    <Link href={`/vault/${id}`} className="hover:underline">
                      {shortKey(id)}
                    </Link>
                  </td>
                  <td className="px-3 py-2">
                    {value.toLocaleString()} <span className="text-xs text-matrix-dim">{feeUnit}</span>
                  </td>
                  <td className="px-3 py-2">
                    {Number(v.currentFeeAmount).toLocaleString()}
                    <span className="ml-1 text-xs text-matrix-dim">{feeUnit}</span>
                  </td>
                  <td className="px-3 py-2">{Number(v.attemptCount).toLocaleString()}</td>
                  <td className="px-3 py-2">{status}</td>
                  <td className="px-3 py-2 text-matrix-dim">{timer}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-2">
                      <Link className="btn-bracket" href={`/vault/${id}`}>
                        OPEN
                      </Link>
                      <Link className="btn-bracket" href="/crack">
                        CRACK
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}

            {!loading && vaults.length === 0 ? (
              <tr className="border-t border-matrix-dim/20">
                <td colSpan={7} className="px-3 py-4 text-xs text-matrix-dim">
                  No vault accounts found on this network yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {loading ? <div className="text-xs text-matrix-dim">Refreshing on-chain vault list...</div> : null}
    </div>
  );
}

