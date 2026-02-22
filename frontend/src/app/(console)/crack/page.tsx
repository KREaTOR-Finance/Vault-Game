export default function CrackPage() {
  return (
    <div className="space-y-3">
      <div className="text-sm text-matrix-dim">
        MODULE: <span className="text-matrix">CRACK</span>
      </div>
      <div className="border border-matrix-dim/30 bg-black/30 p-3 text-sm">
        PIN? <span className="text-matrix-hot">████</span>
      </div>
      <div className="flex flex-wrap gap-2">
        <button className="btn-bracket" type="button">
          SUBMIT
        </button>
        <button className="btn-bracket" type="button">
          CLEAR
        </button>
      </div>
    </div>
  );
}
