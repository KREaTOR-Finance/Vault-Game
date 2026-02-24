'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

type Stage = 'create' | 'crack' | 'done';

const LS_KEY = 'vault_game:tutorial_stage:v1';

function loadStage(): Stage {
  try {
    const v = localStorage.getItem(LS_KEY) as Stage | null;
    return v === 'create' || v === 'crack' || v === 'done' ? v : 'create';
  } catch {
    return 'create';
  }
}

function saveStage(s: Stage) {
  try {
    localStorage.setItem(LS_KEY, s);
  } catch {
    // ignore
  }
}

export function advanceTutorial(next: Stage) {
  saveStage(next);
  // Also ping listeners
  try {
    window.dispatchEvent(new CustomEvent('vault_game:tutorial_stage', { detail: next }));
  } catch {
    // ignore
  }
}

export default function TutorialOverlay() {
  const [stage, setStage] = useState<Stage>('create');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setStage(loadStage());
    setOpen(loadStage() !== 'done');

    const onEvt = (e: Event) => {
      const ce = e as CustomEvent<Stage>;
      const s = ce.detail;
      if (s === 'create' || s === 'crack' || s === 'done') {
        setStage(s);
        setOpen(s !== 'done');
      }
    };

    const listener: EventListener = (e) => onEvt(e);
    window.addEventListener('vault_game:tutorial_stage', listener);
    return () => window.removeEventListener('vault_game:tutorial_stage', listener);
  }, []);

  // Auto-advance: if a vault was created, move to crack stage.
  useEffect(() => {
    if (stage !== 'create') return;
    const id = localStorage.getItem('vault_game:last_created_vault');
    if (id) {
      const next: Stage = 'crack';
      saveStage(next);
      setStage(next);
      setOpen(true);
    }
  }, [stage]);

  const body = useMemo(() => {
    if (stage === 'create') {
      return {
        title: '[ OPERATOR TRAINING // STAGE 1 ]',
        lines: [
          'Create a tiny vault first. Keep it simple.',
          'Defaults: 24h · SKR · Base 1 · PIN 6 digits.',
          'Free vaults are allowed (Base 0).',
          'After creation you’ll get a share link to send to others.',
        ],
        actions: (
          <div className="flex flex-wrap gap-2">
            <Link className="btn-bracket" href="/create" onClick={() => setOpen(false)}>
              GO TO CREATE
            </Link>
            <button className="btn-bracket" type="button" onClick={() => setOpen(false)}>
              LATER
            </button>
          </div>
        ),
      };
    }

    if (stage === 'crack') {
      return {
        title: '[ OPERATOR TRAINING // STAGE 2 ]',
        lines: [
          'Now try cracking a vault.',
          'Attempts cost SKR and escalate (1.2× ladder).',
          'Your attempts appear in the global activity banner.',
        ],
        actions: (
          <div className="flex flex-wrap gap-2">
            <Link className="btn-bracket" href="/vaults" onClick={() => setOpen(false)}>
              GO TO VAULTS
            </Link>
            <Link className="btn-bracket" href="/crack" onClick={() => setOpen(false)}>
              GO TO CRACK
            </Link>
            <button
              className="btn-bracket"
              type="button"
              onClick={() => {
                saveStage('done');
                setStage('done');
                setOpen(false);
              }}
            >
              DONE
            </button>
          </div>
        ),
      };
    }

    return null;
  }, [stage]);

  if (!open || !body) return null;

  return (
    <div className="fixed inset-0 z-[60]">
      <div className="absolute inset-0 bg-black/70" onClick={() => setOpen(false)} />
      <div className="absolute left-1/2 top-1/2 w-[92vw] max-w-[520px] -translate-x-1/2 -translate-y-1/2 border border-matrix-dim/40 bg-black/90 p-4">
        <div className="text-xs tracking-widest text-matrix-dim">{body.title}</div>
        <div className="mt-3 space-y-2 text-sm text-matrix-dim/90">
          {body.lines.map((t, i) => (
            <div key={i}>{t}</div>
          ))}
        </div>
        <div className="mt-4">{body.actions}</div>
      </div>
    </div>
  );
}
