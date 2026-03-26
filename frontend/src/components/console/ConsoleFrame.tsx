'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import NavigatorPrompt from '@/components/console/NavigatorPrompt';
import GlobalAttemptBanner from '@/components/console/GlobalAttemptBanner';
import TutorialOverlay from '@/components/console/TutorialOverlay';
import WinFanfareOverlay from '@/components/console/WinFanfareOverlay';
import { formatDurationSeconds } from '@/lib/time';
import { useMegaChallenge } from '@/lib/useMegaChallenge';
import { usePlayerRetention } from '@/lib/usePlayerRetention';
import { useVaultTelemetry } from '@/lib/useVaultTelemetry';

function shortKey(k: string) {
  return `${k.slice(0, 4)}...${k.slice(-4)}`;
}

function dayIndex(nowSec: number) {
  return Math.floor(nowSec / 86_400);
}

function streakMultiplier(streakDays: number) {
  const extra = Math.min(75, Math.max(0, streakDays - 1) * 5);
  return (100 + extra) / 100;
}

function nextResetInSec(nowSec: number) {
  const next = (Math.floor(nowSec / 86_400) + 1) * 86_400;
  return Math.max(0, next - nowSec);
}

function HudLine() {
  const { publicKey, connected, disconnect } = useWallet();
  const [time, setTime] = useState<string>('');
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
            <span className="text-matrix">{connected && publicKey ? ` ${shortKey(publicKey.toBase58())}` : ' DISCONNECTED'}</span>
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
                      className="w-full px-2 py-2 text-left hover:bg-matrix-dim/10"
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
                      className="w-full px-2 py-2 text-left hover:bg-matrix-dim/10"
                      onClick={() => {
                        disconnect();
                        setMenuOpen(false);
                      }}
                    >
                      DISCONNECT
                    </button>
                  </div>
                </div>
              ) : null}
            </>
          ) : null}
        </span>

        <span>
          NETWORK:<span className="text-matrix"> DEVNET</span>
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <span>
          MODE:<span className="text-matrix"> MWA ONLY</span>
        </span>
        <span>
          TIME:<span className="text-matrix"> {time || '-'}</span>
        </span>
      </div>
    </div>
  );
}

function MissionStrip() {
  const { state: megaChallenge } = useMegaChallenge();
  const { retention } = usePlayerRetention();
  const [nowSec, setNowSec] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    const id = window.setInterval(() => setNowSec(Math.floor(Date.now() / 1000)), 1000);
    return () => window.clearInterval(id);
  }, []);

  const megaPda = useMemo(() => {
    const pk = megaChallenge?.vault;
    if (!pk) return null;
    const s = pk.toBase58();
    if (s === '11111111111111111111111111111111') return null;
    return pk;
  }, [megaChallenge]);

  const { vault: megaVault } = useVaultTelemetry(megaPda ?? undefined);
  const jackpot = megaVault ? Number(megaVault.prizeAmount) + Number(megaVault.winnerFeePool) : 0;
  const nextCost = megaVault ? Number(megaVault.currentFeeAmount) : 0;

  const today = dayIndex(nowSec);
  const lastPlayDay = retention ? Number(retention.lastPlayDay) : -1;
  const rawStreak = retention ? retention.streakDays : 0;
  const streakDays = lastPlayDay === today || lastPlayDay === today - 1 ? rawStreak : 0;
  const multiplier = streakMultiplier(streakDays);
  const freeTry = retention ? Number(retention.freeTryDay) !== today : true;

  return (
    <section className="border border-matrix-dim/40 bg-black/35 p-3">
      <div className="text-xs tracking-widest text-matrix-dim">[ MISSION BOARD ]</div>
      <div className="mt-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-5">
        <div className="border border-matrix-dim/20 bg-black/25 p-2">
          <div className="text-matrix-dim">MEGA JACKPOT</div>
          <div className="mt-1 text-base text-matrix-hot">{jackpot.toLocaleString()}</div>
        </div>
        <div className="border border-matrix-dim/20 bg-black/25 p-2">
          <div className="text-matrix-dim">NEXT COST</div>
          <div className="mt-1 text-base text-matrix">{nextCost.toLocaleString()}</div>
        </div>
        <div className="border border-matrix-dim/20 bg-black/25 p-2">
          <div className="text-matrix-dim">FREE TRY</div>
          <div className="mt-1 text-base text-matrix-hot">{freeTry ? 'READY' : 'USED'}</div>
        </div>
        <div className="border border-matrix-dim/20 bg-black/25 p-2">
          <div className="text-matrix-dim">STREAK</div>
          <div className="mt-1 text-base text-matrix">
            {streakDays}d <span className="text-matrix-dim">x{multiplier.toFixed(2)}</span>
          </div>
        </div>
        <div className="border border-matrix-dim/20 bg-black/25 p-2">
          <div className="text-matrix-dim">RESET</div>
          <div className="mt-1 text-base text-matrix">{formatDurationSeconds(nextResetInSec(nowSec))}</div>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <Link className="btn-bracket" href="/crack">
          START CRACK LOOP
        </Link>
        <Link className="btn-bracket" href="/vaults">
          VIEW HOT VAULTS
        </Link>
        {megaPda ? (
          <Link className="btn-bracket" href={`/vault/${megaPda.toBase58()}`}>
            MEGA {shortKey(megaPda.toBase58())}
          </Link>
        ) : null}
      </div>
    </section>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border border-matrix-dim/40 bg-black/35">
      <div className="border-b border-matrix-dim/30 px-3 py-2 text-xs tracking-widest text-matrix-dim">[ {title} ]</div>
      <div className="px-3 py-3">{children}</div>
    </section>
  );
}

function QuickNav() {
  const pathname = usePathname();

  const items = [
    { href: '/crack', label: 'CRACK' },
    { href: '/vaults', label: 'VAULTS' },
    { href: '/claim', label: 'CLAIM' },
    { href: '/profile', label: 'PROFILE' },
    { href: '/create', label: 'CREATE' },
  ];

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-matrix-dim/40 bg-black/95 p-2 backdrop-blur sm:static sm:border-0 sm:bg-transparent sm:p-0">
      <div className="mx-auto grid max-w-[680px] grid-cols-5 gap-2">
        {items.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`btn-bracket px-2 py-2 text-center text-[10px] ${active ? 'border-matrix-hot text-matrix-hot' : ''}`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default function ConsoleFrame({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-dvh pb-20 sm:pb-8">
      <div className="mx-auto max-w-[1180px] px-4 py-8">
        <div className="relative">
          <div className="absolute -inset-3 -z-10 border border-matrix-dim/25 bg-black/25" />
          <div aria-hidden className="pointer-events-none absolute inset-0 z-20 crt-scanlines" />
          <div aria-hidden className="pointer-events-none absolute inset-0 z-20 crt-vignette" />

          <div className="border border-matrix-dim/45 bg-black/55 p-4">
            <HudLine />

            <div className="mt-3">
              <GlobalAttemptBanner />
            </div>

            <div className="mt-3">
              <MissionStrip />
            </div>

            <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
              <Panel title="ACTIVE CONSOLE">{children}</Panel>

              <div className="space-y-4">
                <Panel title="NAVIGATOR">
                  <NavigatorPrompt />
                  <div className="mt-3 text-xs text-matrix-dim/80">Ctrl+K focus prompt. Enter opens selected route.</div>
                </Panel>

                <Panel title="FLOW">
                  <div className="space-y-2 text-xs text-matrix-dim/90">
                    <div>
                      <span className="text-matrix">1.</span> Open CRACK.
                    </div>
                    <div>
                      <span className="text-matrix">2.</span> Use free try or one-signature paid attempt.
                    </div>
                    <div>
                      <span className="text-matrix">3.</span> Win and settle via CLAIM.
                    </div>
                  </div>
                </Panel>
              </div>
            </div>

            <div className="mt-4 border-t border-matrix-dim/30 pt-3 text-xs text-matrix-dim">:: VAULTCRACK MISSION CONSOLE ::</div>
          </div>

          <TutorialOverlay />
          <WinFanfareOverlay />
        </div>
      </div>

      <QuickNav />
    </div>
  );
}
