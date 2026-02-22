export default function ClaimPage() {
  return (
    <div className="space-y-3">
      <div className="text-sm text-matrix-dim">
        MODULE: <span className="text-matrix">CLAIM</span>
      </div>

      <div className="border border-matrix-dim/30 bg-black/30 p-3 text-sm">
        TRANSFER SUMMARY
        <div className="mt-2 text-xs text-matrix-dim">
          - Prize: <span className="text-matrix">1.25 SOL</span>
          <br />- From: <span className="text-matrix-dim">vault treasury</span>
          <br />- To: <span className="text-matrix-dim">your wallet</span>
        </div>
      </div>

      <div className="border border-matrix-dim/30 bg-black/30 p-3 text-sm">
        TYPE <span className="text-matrix-hot">CLAIM</span> TO CONFIRM: _
      </div>

      <button className="btn-bracket" type="button">
        EXECUTE
      </button>
    </div>
  );
}
