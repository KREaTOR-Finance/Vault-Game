export function formatDurationSeconds(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return '—';

  const s = Math.floor(totalSeconds);
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;

  const pad = (n: number) => String(n).padStart(2, '0');

  if (days > 0) return `${days}d ${pad(hours)}h ${pad(mins)}m`;
  if (hours > 0) return `${hours}h ${pad(mins)}m ${pad(secs)}s`;
  return `${mins}m ${pad(secs)}s`;
}
