export default function HelpPage() {
  return (
    <div className="space-y-3">
      <div className="text-sm text-matrix-dim">
        MODULE: <span className="text-matrix">HELP</span>
      </div>
      <div className="border border-matrix-dim/30 bg-black/30 p-3 text-xs text-matrix-dim">
        <div className="text-matrix">KEYBINDS</div>
        <div className="mt-2 space-y-1">
          <div>Ctrl+K → focus navigator</div>
          <div>Esc → clear</div>
          <div>↑↓ → select</div>
          <div>Enter → open</div>
        </div>
      </div>
    </div>
  );
}
