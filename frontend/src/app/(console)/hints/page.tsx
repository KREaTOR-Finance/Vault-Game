export default function HintsPage() {
  return (
    <div className="space-y-3">
      <div className="text-sm text-matrix-dim">
        MODULE: <span className="text-matrix">HINTS</span>
      </div>
      <div className="border border-matrix-dim/30 bg-black/30 p-3 text-xs text-matrix-dim">
        [INTEL FEED]
        <div className="mt-2 space-y-1">
          <div>
            <span className="text-matrix">HINT#01</span> → "first two digits repeat"
          </div>
          <div>
            <span className="text-matrix">HINT#02</span> → "sum of digits = 14"
          </div>
        </div>
      </div>
    </div>
  );
}
