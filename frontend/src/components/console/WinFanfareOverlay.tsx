'use client';

import { useEffect, useMemo, useState } from 'react';

type Payload = {
  vault?: string;
  amount?: string;
  sig?: string;
  ts: number;
};

const LS_KEY = 'vault_game:fanfare';

function safeParse(v: string | null): Payload | null {
  if (!v) return null;
  try {
    const p = JSON.parse(v) as Payload;
    if (!p || typeof p.ts !== 'number') return null;
    return p;
  } catch {
    return null;
  }
}

export function triggerWinFanfare(p: Omit<Payload, 'ts'>) {
  const payload: Payload = { ...p, ts: Date.now() };
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(payload));
    window.dispatchEvent(new CustomEvent('vault_game:fanfare', { detail: payload }));
  } catch {
    // ignore
  }
}

export default function WinFanfareOverlay() {
  const [payload, setPayload] = useState<Payload | null>(null);

  useEffect(() => {
    setPayload(safeParse(localStorage.getItem(LS_KEY)));

    const onEvt = (e: Event) => {
      const ce = e as CustomEvent<Payload>;
      if (!ce.detail) return;
      setPayload(ce.detail);
    };

    const listener: EventListener = (e) => onEvt(e);
    window.addEventListener('vault_game:fanfare', listener);
    return () => window.removeEventListener('vault_game:fanfare', listener);
  }, []);

  const open = !!payload;

  const lines = useMemo(() => {
    if (!payload) return [] as string[];
    const out: string[] = [];
    if (payload.amount) out.push(`PAYOUT: ${payload.amount}`);
    if (payload.vault) out.push(`VAULT: ${payload.vault.slice(0, 4)}…${payload.vault.slice(-4)}`);
    if (payload.sig) out.push(`TX: ${payload.sig.slice(0, 4)}…${payload.sig.slice(-4)}`);
    return out;
  }, [payload]);

  function close() {
    setPayload(null);
    try {
      localStorage.removeItem(LS_KEY);
    } catch {
      // ignore
    }
  }

  if (!open || !payload) return null;

  return (
    <div className="fixed inset-0 z-[70]">
      <div className="absolute inset-0 bg-black/80" onClick={close} />

      {/* confetti */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {Array.from({ length: 48 }).map((_, i) => (
          <span
            // eslint-disable-next-line react/no-array-index-key
            key={i}
            className="vc-confetti"
            style={{
              left: `${(i * 37) % 100}%`,
              animationDelay: `${(i % 12) * 0.05}s`,
              opacity: 0.9,
            }}
          />
        ))}
      </div>

      <div className="absolute left-1/2 top-1/2 w-[92vw] max-w-[640px] -translate-x-1/2 -translate-y-1/2 border border-matrix-hot/40 bg-black/95 p-5">
        <div className="text-xs tracking-widest text-matrix-dim">[ VAULTCRACK ]</div>

        <div className="mt-3 vc-glitch text-3xl font-bold tracking-widest text-matrix-hot">
          VAULT BREACHED
        </div>

        <div className="mt-3 space-y-1 text-sm text-matrix-dim/90">
          {lines.length ? (
            lines.map((t) => <div key={t}>{t}</div>)
          ) : (
            <div>WIN CONFIRMED</div>
          )}
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <button className="btn-bracket" type="button" onClick={close}>
            ACKNOWLEDGE
          </button>
          <button
            className="btn-bracket"
            type="button"
            onClick={() => {
              // replay keeps payload, just retriggers animation by closing/opening.
              close();
              setTimeout(() => setPayload(payload), 80);
            }}
          >
            REPLAY
          </button>
        </div>
      </div>
    </div>
  );
}
