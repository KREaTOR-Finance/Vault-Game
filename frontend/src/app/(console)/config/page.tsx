export default function ConfigPage() {
  return (
    <div className="space-y-3">
      <div className="text-sm text-matrix-dim">
        MODULE: <span className="text-matrix">CONFIG</span>
      </div>
      <div className="border border-matrix-dim/30 bg-black/30 p-3 text-xs text-matrix-dim">
        Visual prefs (client-only):
        <div className="mt-2 space-y-1">
          <div>[ ] Matrix rain intensity</div>
          <div>[ ] Scanlines strength</div>
          <div>[ ] Sound</div>
          <div>[ ] Reduced motion</div>
        </div>
      </div>
    </div>
  );
}
