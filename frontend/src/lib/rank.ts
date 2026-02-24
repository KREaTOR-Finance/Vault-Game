export type RankTier = {
  key: 'TRACE' | 'VECTOR' | 'NODE' | 'CIPHER' | 'ARCHON' | 'ROOT' | 'NEO';
  minScore: number;
};

// Tier-only rank. Keep this client-side so thresholds can be tuned without on-chain migrations.
export const RANK_TIERS: RankTier[] = [
  { key: 'TRACE', minScore: 0 },
  { key: 'VECTOR', minScore: 100 },
  { key: 'NODE', minScore: 500 },
  { key: 'CIPHER', minScore: 1500 },
  { key: 'ARCHON', minScore: 4000 },
  { key: 'ROOT', minScore: 10000 },
  // Nearly unobtainable.
  { key: 'NEO', minScore: 10000000 },
];

export function rankForScore(score: number | bigint | null | undefined): RankTier {
  const s = score == null ? 0 : typeof score === 'bigint' ? Number(score) : score;
  // Walk from highest to lowest.
  for (let i = RANK_TIERS.length - 1; i >= 0; i--) {
    if (s >= RANK_TIERS[i].minScore) return RANK_TIERS[i];
  }
  return RANK_TIERS[0];
}
