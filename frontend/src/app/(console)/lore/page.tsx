'use client';

export default function LorePage() {
  return (
    <div className="space-y-3">
      <div className="text-sm text-matrix-dim">
        MODULE: <span className="text-matrix">LORE</span>
      </div>

      <div className="border border-matrix-dim/30 bg-black/30 p-3 text-sm text-matrix-dim">
        <div className="text-xs tracking-widest text-matrix-dim">[ TRANSMISSION // ARCHIVE-NEO ]</div>

        <div className="mt-3 space-y-3 leading-relaxed">
          <p>
            You are a <span className="text-matrix">NEO</span> — a name for the ones who can still
            see the seams.
          </p>
          <p>
            When mankind was consumed by code, the old world didn’t end. It was encrypted.
          </p>
          <p>
            The Vaults are what’s left: sealed caches of value, proof, and leverage. Some were built
            as salvation. Some as traps. All of them are invitations.
          </p>
          <p>
            Your fortune lies ahead — not in certainty, but in attempts.
          </p>
          <p className="text-matrix">Crack wisely.</p>
        </div>
      </div>
    </div>
  );
}
