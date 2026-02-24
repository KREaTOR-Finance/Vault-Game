'use client';

import { useMemo } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { rankForScore } from '@/lib/rank';
import { usePlayerProfile } from '@/lib/usePlayerProfile';

export default function ProfilePage() {
  const { publicKey } = useWallet();
  const { profile } = usePlayerProfile();

  // Placeholder until the PDA exists for this wallet.
  const stats = useMemo(() => {
    if (!profile) {
      return {
        attempts: 0,
        wins: 0,
        vaultsCreated: 0,
        score: 0,
        lastSeen: '—',
      };
    }

    const lastSeen = profile.lastSeenTs ? `${profile.lastSeenTs}` : '—';

    return {
      attempts: Number(profile.attempts),
      wins: Number(profile.wins),
      vaultsCreated: Number(profile.vaultsCreated),
      score: Number(profile.score),
      lastSeen,
    };
  }, [profile]);

  const rank = rankForScore(stats.score);

  return (
    <div className="space-y-3">
      <div className="text-sm text-matrix-dim">
        MODULE: <span className="text-matrix">PROFILE</span>
      </div>

      <div className="border border-matrix-dim/30 bg-black/30 p-3 text-sm">
        FILE:{' '}
        <span className="text-matrix">
          {publicKey ? `PLAYER_${publicKey.toBase58().slice(0, 4).toUpperCase()}` : 'PLAYER_UNKNOWN'}
        </span>

        <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
          <div className="text-matrix-dim">
            Attempts: <span className="text-matrix">{stats.attempts}</span>
          </div>
          <div className="text-matrix-dim">
            Wins: <span className="text-matrix">{stats.wins}</span>
          </div>
          <div className="text-matrix-dim">
            Vaults created: <span className="text-matrix">{stats.vaultsCreated}</span>
          </div>
          <div className="text-matrix-dim">
            Score: <span className="text-matrix">{stats.score}</span>
          </div>
          <div className="text-matrix-dim">
            Rank: <span className="text-matrix-hot">{rank.key}</span>
          </div>
          <div className="text-matrix-dim">
            Last seen: <span className="text-matrix">{stats.lastSeen} ago</span>
          </div>
        </div>

        <div className="mt-3 text-[10px] text-matrix-dim/70">
          Rank is derived from score. The final tier is <span className="text-matrix">NEO</span>.
        </div>
      </div>
    </div>
  );
}
