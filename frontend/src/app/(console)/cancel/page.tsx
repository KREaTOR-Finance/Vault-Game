export default function CancelPage() {
  return (
    <div className="space-y-3">
      <div className="text-sm text-matrix-dim">
        MODULE: <span className="text-matrix">CANCEL</span>
      </div>
      <div className="border border-matrix-dim/30 bg-black/30 p-3 text-xs text-matrix-dim">
        WARNING: Abort will return staked funds to the vault authority. This action is final once broadcast.
      </div>
      <button className="btn-bracket" type="button">
        CONFIRM CANCEL
      </button>
    </div>
  );
}
