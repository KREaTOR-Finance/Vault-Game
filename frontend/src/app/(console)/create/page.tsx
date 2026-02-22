export default function CreatePage() {
  return (
    <div className="space-y-3">
      <div className="text-sm text-matrix-dim">
        MODULE: <span className="text-matrix">CREATE</span>
      </div>
      <div className="border border-matrix-dim/30 bg-black/30 p-3 text-sm">
        AMOUNT? <span className="text-matrix-hot">_</span>
      </div>
      <div className="text-xs text-matrix-dim">
        (wizard UI placeholder — will become prompt-sequence)
      </div>
    </div>
  );
}
