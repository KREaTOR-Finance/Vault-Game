'use client';

import { useEffect, useMemo, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { rankForScore } from '@/lib/rank';
import { formatDurationSeconds } from '@/lib/time';
import { usePlayerProfile } from '@/lib/usePlayerProfile';
import { usePlayerRetention } from '@/lib/usePlayerRetention';

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

export default function ProfilePage() {
  const { publicKey } = useWallet();
  const { profile } = usePlayerProfile();
  const { retention } = usePlayerRetention();
  const [nowSec, setNowSec] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    const timer = window.setInterval(() => setNowSec(Math.floor(Date.now() / 1000)), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const stats = useMemo(() => {
    if (!profile) {
      return {
        attempts: 0,
        wins: 0,
        vaultsCreated: 0,
        score: 0,
        lastSeen: '-',
      };
    }

    const lastSeen = profile.lastSeenTs ? `${profile.lastSeenTs}` : '-';

    return {
      attempts: Number(profile.attempts),
      wins: Number(profile.wins),
      vaultsCreated: Number(profile.vaultsCreated),
      score: Number(profile.score),
      lastSeen,
    };
  }, [profile]);

  const today = dayIndex(nowSec);
  const rawStreak = retention ? retention.streakDays : 0;
  const lastPlayDay = retention ? Number(retention.lastPlayDay) : -1;
  const streakDays = lastPlayDay === today || lastPlayDay === today - 1 ? rawStreak : 0;
  const multiplier = streakMultiplier(streakDays);
  const freeTryAvailable = retention ? Number(retention.freeTryDay) !== today : true;
  const xp = retention ? Number(retention.xp) : 0;
  const plays = retention ? Number(retention.plays) : 0;

  const rank = rankForScore(stats.score);
  const onChainWinRate = stats.attempts > 0 ? Math.round((stats.wins / stats.attempts) * 100) : 0;

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
            On-chain win rate: <span className="text-matrix">{onChainWinRate}%</span>
          </div>
        </div>
      </div>

      <div className="border border-matrix-dim/30 bg-black/30 p-3 text-sm">
        <div className="text-xs tracking-widest text-matrix-dim">[ RETENTION PDA ]</div>
        <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
          <div className="text-matrix-dim">
            Daily free try:{' '}
            <span className={freeTryAvailable ? 'text-matrix-hot' : 'text-matrix-dim'}>
              {freeTryAvailable ? 'READY' : 'USED'}
            </span>
          </div>
          <div className="text-matrix-dim">
            Streak: <span className="text-matrix">{streakDays} days</span>
          </div>
          <div className="text-matrix-dim">
            Multiplier: <span className="text-matrix-hot">x{multiplier.toFixed(2)}</span>
          </div>
          <div className="text-matrix-dim">
            XP: <span className="text-matrix">{xp.toLocaleString()}</span>
          </div>
          <div className="text-matrix-dim">
            Plays: <span className="text-matrix">{plays.toLocaleString()}</span>
          </div>
          <div className="text-matrix-dim">
            Reset in: <span className="text-matrix">{formatDurationSeconds(nextResetInSec(nowSec))}</span>
          </div>
        </div>
        <div className="mt-3 text-[10px] text-matrix-dim/70">Daily free try resets at 00:00 UTC (on-chain day index).</div>
      </div>

      <div className="text-[10px] text-matrix-dim/70">
        Rank is derived from on-chain score. Final tier is <span className="text-matrix">NEO</span>.
      </div>
    </div>
  );
}

