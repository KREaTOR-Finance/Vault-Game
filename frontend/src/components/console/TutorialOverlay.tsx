'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

type Stage = 'crack' | 'create' | 'done';

const LS_KEY = 'vault_game:tutorial_stage:v1';

function loadStage(): Stage {
  try {
    const v = localStorage.getItem(LS_KEY) as Stage | null;
    return v === 'create' || v === 'crack' || v === 'done' ? v : 'crack';
  } catch {
    return 'crack';
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
  const [stage, setStage] = useState<Stage>('crack');
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

  // Auto-advance: after the user attempts a crack once, move to create stage.
  useEffect(() => {
    if (stage !== 'crack') return;
    const did = localStorage.getItem('vault_game:did_attempt');
    if (did === '1') {
      const next: Stage = 'create';
      saveStage(next);
      setStage(next);
      setOpen(true);
    }
  }, [stage]);

  const body = useMemo(() => {
    if (stage === 'crack') {
      return {
        title: '[ OPERATOR TRAINING // STAGE 1 ]',
        lines: [
          'You are a NEO. Your fortune lies in the vaults ahead.',
          'Start with the Mega Vault: 8 digits. Brutal odds.',
          'Each attempt costs VC and escalates (1.2× ladder).',
        ],
        actions: (
          <div className="flex flex-wrap gap-2">
            <Link className="btn-bracket" href="/vaults" onClick={() => setOpen(false)}>
              GO TO VAULTS
            </Link>
            <Link className="btn-bracket" href="/crack" onClick={() => setOpen(false)}>
              GO TO CRACK
            </Link>
            <Link className="btn-bracket" href="/lore" onClick={() => setOpen(false)}>
              READ LORE
            </Link>
            <button className="btn-bracket" type="button" onClick={() => setOpen(false)}>
              LATER
            </button>
          </div>
        ),
      };
    }

    if (stage === 'create') {
      return {
        title: '[ OPERATOR TRAINING // STAGE 2 ]',
        lines: [
          'Now create a vault and set the bait.',
          'Creators deposit the prize. Crackers contribute via attempt fees.',
          'Share the link. Watch the guesses climb.',
        ],
        actions: (
          <div className="flex flex-wrap gap-2">
            <Link className="btn-bracket" href="/create" onClick={() => setOpen(false)}>
              GO TO CREATE
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
