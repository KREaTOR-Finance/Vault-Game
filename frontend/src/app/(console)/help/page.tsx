export default function HelpPage() {
  return (
    <div className="space-y-3">
      <div className="text-sm text-matrix-dim">
        MODULE: <span className="text-matrix">HELP</span>
      </div>

      <div className="border border-matrix-dim/30 bg-black/30 p-3 text-xs text-matrix-dim">
        <div className="text-matrix">KEYBINDS</div>
        <div className="mt-2 space-y-1">
          <div>Ctrl+K -{'>'} focus navigator</div>
          <div>Esc -{'>'} clear</div>
          <div>Up/Down -{'>'} select</div>
          <div>Enter -{'>'} open</div>
        </div>
      </div>

      <div className="border border-matrix-dim/30 bg-black/30 p-3 text-xs text-matrix-dim">
        <div className="text-matrix">RETENTION LOOP</div>
        <div className="mt-2 space-y-1">
          <div>1 wallet-bound daily free try (resets 00:00 UTC)</div>
          <div>Each active day increases streak</div>
          <div>Streak raises on-chain XP multiplier (caps at x1.75)</div>
          <div>Use free try from CRACK screen toggle</div>
        </div>
      </div>
    </div>
  );
}
