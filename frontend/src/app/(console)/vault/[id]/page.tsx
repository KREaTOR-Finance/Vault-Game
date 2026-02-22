import Link from "next/link";

export default async function VaultDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div className="text-sm text-matrix-dim">
          MODULE: <span className="text-matrix">VAULT</span>
          <span className="text-matrix-dim"> / </span>
          <span className="text-matrix-hot">{id.toUpperCase()}</span>
        </div>
        <Link href="/vaults" className="btn-bracket">
          BACK
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <section className="border border-matrix-dim/30 bg-black/30 p-3">
          <div className="text-xs tracking-widest text-matrix-dim">[ TELEMETRY ]</div>
          <div className="mt-2 space-y-1 text-sm">
            <div>
              STATE: <span className="text-matrix">LIVE</span>
            </div>
            <div>
              TYPE: <span className="text-matrix">SOL</span>
            </div>
            <div>
              PRIZE: <span className="text-matrix">1.25 SOL</span>
            </div>
            <div>
              COOLDOWN: <span className="text-matrix-dim">—</span>
            </div>
          </div>
        </section>

        <section className="border border-matrix-dim/30 bg-black/30 p-3">
          <div className="text-xs tracking-widest text-matrix-dim">[ SEEDS / ADDRESSES ]</div>
          <div className="mt-2 space-y-1 text-xs text-matrix-dim">
            <div>VAULT PDA: …</div>
            <div>TREASURY: …</div>
            <div>PRIZE ATA: …</div>
          </div>
        </section>
      </div>

      <section className="border border-matrix-dim/30 bg-black/30 p-3">
        <div className="text-xs tracking-widest text-matrix-dim">[ EVENT FEED ]</div>
        <div className="mt-2 space-y-1 text-xs text-matrix-dim/90">
          <div>
            <span className="text-matrix">[EVT]</span> VaultCreated
          </div>
          <div>
            <span className="text-matrix">[EVT]</span> HintPublished
          </div>
          <div>
            <span className="text-matrix">[EVT]</span> CrackAttempted
          </div>
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        <Link className="btn-bracket" href="/crack">
          CRACK
        </Link>
        <Link className="btn-bracket" href="/claim">
          CLAIM
        </Link>
        <Link className="btn-bracket" href="/cancel">
          CANCEL
        </Link>
      </div>
    </div>
  );
}
