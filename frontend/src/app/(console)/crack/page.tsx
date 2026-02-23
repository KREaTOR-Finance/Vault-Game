'use client';

import { useMemo, useState } from 'react';

function maskPin(pin: string) {
  return pin.replace(/./g, '█');
}

export default function CrackPage() {
  const [pin, setPin] = useState('');
  const maxLen = 6;

  const hint = useMemo(() => {
    if (!pin.length) return 'ENTER PIN';
    return `${pin.length}/${maxLen}`;
  }, [pin.length]);

  function pushDigit(d: string) {
    setPin((p) => (p.length >= maxLen ? p : p + d));
  }

  function backspace() {
    setPin((p) => p.slice(0, -1));
  }

  function clear() {
    setPin('');
  }

  function submit() {
    // Wire to on-chain attempt next. For now, just a local demo interaction.
    // eslint-disable-next-line no-alert
    alert(`Attempt submitted: ${pin || '(empty)'}`);
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-matrix-dim">
        MODULE: <span className="text-matrix">CRACK</span>
      </div>

      <div className="border border-matrix-dim/30 bg-black/30 p-3 text-sm">
        <div className="flex items-center justify-between">
          <div>
            PIN? <span className="text-matrix-hot">{maskPin(pin).padEnd(maxLen, '·')}</span>
          </div>
          <div className="text-xs text-matrix-dim">{hint}</div>
        </div>

        <div className="mt-3">
          <input
            className="w-full rounded-sm border border-matrix-dim/30 bg-black/40 px-3 py-2 font-mono text-matrix outline-none"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            placeholder="Enter PIN"
            value={pin}
            onChange={(e) => {
              const next = e.target.value.replace(/\D/g, '').slice(0, maxLen);
              setPin(next);
            }}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {['1','2','3','4','5','6','7','8','9'].map((d) => (
          <button key={d} className="btn-bracket" type="button" onClick={() => pushDigit(d)}>
            {d}
          </button>
        ))}
        <button className="btn-bracket" type="button" onClick={backspace}>
          ⌫
        </button>
        <button className="btn-bracket" type="button" onClick={() => pushDigit('0')}>
          0
        </button>
        <button className="btn-bracket" type="button" onClick={clear}>
          CLR
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <button className="btn-bracket" type="button" onClick={submit}>
          SUBMIT
        </button>
        <button className="btn-bracket" type="button" onClick={clear}>
          CLEAR
        </button>
      </div>

      <div className="text-xs text-matrix-dim/80">
        NOTE: This will be wired to the on-chain attempt instruction next.
      </div>
    </div>
  );
}
