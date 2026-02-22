export default function LogsPage() {
  return (
    <div className="space-y-3">
      <div className="text-sm text-matrix-dim">
        MODULE: <span className="text-matrix">LOGS</span>
      </div>
      <div className="border border-matrix-dim/30 bg-black/30 p-3 text-xs text-matrix-dim">
        <div>
          <span className="text-matrix">[EVT]</span> VaultCreated id=A7K9
        </div>
        <div>
          <span className="text-matrix">[EVT]</span> CrackAttempted id=A7K9 result=FAIL
        </div>
        <div>
          <span className="text-matrix">[EVT]</span> VaultClaimed id=N9F2
        </div>
      </div>
    </div>
  );
}
