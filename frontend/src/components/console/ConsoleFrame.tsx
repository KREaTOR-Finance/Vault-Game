'use client';

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import NavigatorPrompt from "@/components/console/NavigatorPrompt";
import GlobalAttemptBanner from "@/components/console/GlobalAttemptBanner";
import { useWallet } from "@solana/wallet-adapter-react";

function shortKey(k: string) {
  return k.slice(0, 4) + "…" + k.slice(-4);
}

function HudLine() {
  const { publicKey, connected, disconnect } = useWallet();
  const [time, setTime] = useState<string>("");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;

    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as Node | null;
      if (!t) return;

      // Close when tapping/clicking outside the menu + its toggle button.
      if (menuRef.current?.contains(t)) return;
      if (menuButtonRef.current?.contains(t)) return;
      setMenuOpen(false);
    };

    window.addEventListener('pointerdown', onPointerDown);
    return () => window.removeEventListener('pointerdown', onPointerDown);
  }, [menuOpen]);

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 text-xs text-matrix-dim">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className="relative flex items-center gap-2">
          <span>
            WALLET:
            <span className="text-matrix">
              {connected && publicKey ? " " + shortKey(publicKey.toBase58()) : " DISCONNECTED"}
            </span>
          </span>

          {connected && publicKey ? (
            <>
              <button
                ref={menuButtonRef}
                type="button"
                className="btn-bracket px-2 py-1 text-[10px]"
                onClick={() => setMenuOpen((v) => !v)}
                aria-expanded={menuOpen}
                aria-haspopup="menu"
                title="Profile menu"
              >
                PROFILE
              </button>

              {menuOpen ? (
                <div
                  ref={menuRef}
                  role="menu"
                  className="absolute left-0 top-full z-50 mt-2 w-[260px] border border-matrix-dim/40 bg-black/90 p-2 text-xs text-matrix-dim shadow-lg"
                >
                  <div className="border-b border-matrix-dim/30 px-2 py-2">
                    <div className="tracking-widest text-matrix-dim">[ IDENTITY ]</div>
                    <div className="mt-1 font-mono text-matrix">{shortKey(publicKey.toBase58())}</div>
                  </div>

                  <div className="px-1 py-2">
                    <button
                      role="menuitem"
                      type="button"
                      className="w-full text-left px-2 py-2 hover:bg-matrix-dim/10"
                      onClick={async () => {
                        await navigator.clipboard.writeText(publicKey.toBase58());
                        setMenuOpen(false);
                      }}
                    >
                      COPY ADDRESS
                    </button>

                    <button
                      role="menuitem"
                      type="button"
                      className="w-full text-left px-2 py-2 hover:bg-matrix-dim/10"
                      onClick={() => {
                        disconnect();
                        setMenuOpen(false);
                      }}
                    >
                      EXIT LINK (DISCONNECT)
                    </button>
                  </div>

                  <div className="border-t border-matrix-dim/30 px-2 py-2 text-[10px] text-matrix-dim/70">
                    Esc: close
                  </div>
                </div>
              ) : null}
            </>
          ) : null}
        </span>
        <span>
          NETWORK:<span className="text-matrix"> SKR GRID</span>
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <span>
          LAT:<span className="text-matrix"> —</span>
        </span>
        <span>
          TIME:<span className="text-matrix"> {time || "—"}</span>
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
            <div className="mt-3">
              <GlobalAttemptBanner />
            </div>
            <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr_320px]">
              <Panel title="SYSTEM LOG">
                <div className="space-y-2 text-xs text-matrix-dim/90">
                  <div>
                    <span className="text-matrix">[OK]</span> matrix-rain online
                  </div>
                  <div>
                    <span className="text-matrix">[OK]</span> interface initialized
                  </div>
                  <div>
                    <span className="text-matrix">[WARN]</span> link offline (wallet not connected)
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
