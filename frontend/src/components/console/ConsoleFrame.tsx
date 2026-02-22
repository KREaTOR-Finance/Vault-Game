import type { ReactNode } from "react";
import NavigatorPrompt from "@/components/console/NavigatorPrompt";

function HudLine() {
  // placeholders for now (wallet/cluster/slot/lat)
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 text-xs text-matrix-dim">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <span>
          WALLET:<span className="text-matrix"> DISCONNECTED</span>
        </span>
        <span>
          CLUSTER:<span className="text-matrix"> DEVNET</span>
        </span>
        <span>
          SLOT:<span className="text-matrix"> —</span>
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <span>
          LAT:<span className="text-matrix"> —</span>
        </span>
        <span>
          TIME:<span className="text-matrix"> {new Date().toLocaleTimeString()}</span>
        </span>
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border border-matrix-dim/40 bg-black/35">
      <div className="border-b border-matrix-dim/30 px-3 py-2 text-xs tracking-widest text-matrix-dim">
        [ {title} ]
      </div>
      <div className="px-3 py-3">{children}</div>
    </section>
  );
}

export default function ConsoleFrame({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-dvh">
      <div className="mx-auto max-w-[1180px] px-4 py-10">
        <div className="relative">
          {/* bezel */}
          <div className="absolute -inset-3 -z-10 border border-matrix-dim/25 bg-black/25" />

          {/* CRT overlays (within the window) */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-20 crt-scanlines"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-20 crt-vignette"
          />

          <div className="border border-matrix-dim/45 bg-black/55 p-4">
            <HudLine />
            <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr_320px]">
              <Panel title="SYSTEM LOG">
                <div className="space-y-2 text-xs text-matrix-dim/90">
                  <div>
                    <span className="text-matrix">[OK]</span> matrix-rain online
                  </div>
                  <div>
                    <span className="text-matrix">[OK]</span> ui booted
                  </div>
                  <div>
                    <span className="text-matrix">[WARN]</span> wallet not connected
                  </div>
                </div>
              </Panel>

              <Panel title="CONSOLE">{children}</Panel>

              <Panel title="NAVIGATOR">
                <NavigatorPrompt />
                <div className="mt-3 text-xs text-matrix-dim/80">
                  Ctrl+K: focus prompt · Esc: clear · ↑↓: select · Enter: open
                </div>
              </Panel>
            </div>

            <div className="mt-4 border-t border-matrix-dim/30 pt-3 text-xs text-matrix-dim">
              :: VAULT INTERFACE v0.1 ::
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
