import Link from "next/link";

const MOCK = [
  { id: "A7K9", type: "SOL", prize: "1.25 SOL", state: "LIVE", timer: "—" },
  { id: "X3Q1", type: "TOKEN", prize: "5,000 $BYTE", state: "LOCKED", timer: "00:04:12" },
  { id: "N9F2", type: "NFT", prize: "DRAGON #044", state: "CLAIMABLE", timer: "—" },
];

export default function VaultsPage() {
  return (
    <div>
      <div className="mb-3 text-sm text-matrix-dim">
        MODULE: <span className="text-matrix">VAULTS</span>
      </div>

      <div className="overflow-x-auto border border-matrix-dim/30">
        <table className="w-full text-sm">
          <thead className="bg-black/40 text-xs tracking-widest text-matrix-dim">
            <tr>
              <th className="px-3 py-2 text-left">ID</th>
              <th className="px-3 py-2 text-left">TYPE</th>
              <th className="px-3 py-2 text-left">PRIZE</th>
              <th className="px-3 py-2 text-left">STATE</th>
              <th className="px-3 py-2 text-left">TIMER</th>
              <th className="px-3 py-2 text-left">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {MOCK.map((v) => (
              <tr
                key={v.id}
                className="border-t border-matrix-dim/20 hover:bg-matrix-hot/5"
              >
                <td className="px-3 py-2 text-matrix-hot">
                  <Link href={`/vault/${v.id}`} className="hover:underline">
                    {v.id}
                  </Link>
                </td>
                <td className="px-3 py-2">{v.type}</td>
                <td className="px-3 py-2">{v.prize}</td>
                <td className="px-3 py-2">{v.state}</td>
                <td className="px-3 py-2 text-matrix-dim">{v.timer}</td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-2">
                    <Link className="btn-bracket" href={`/vault/${v.id}`}>
                      OPEN
                    </Link>
                    <Link className="btn-bracket" href="/crack">
                      CRACK
                    </Link>
                    <Link className="btn-bracket" href="/claim">
                      CLAIM
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 text-xs text-matrix-dim">
        Tip: type <span className="text-matrix">open A7K9</span> in the navigator.
      </div>
    </div>
  );
}
