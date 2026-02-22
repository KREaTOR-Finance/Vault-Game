"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getNavigatorResults } from "@/lib/modules";

export default function NavigatorPrompt() {
  const router = useRouter();
  const pathname = usePathname();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);

  const results = useMemo(() => getNavigatorResults(q), [q]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function go(idx: number) {
    const r = results[idx];
    if (!r) return;
    setQ("");
    setActive(0);
    if (r.route !== pathname) router.push(r.route);
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <span className="text-matrix-hot">&gt;</span>
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setActive(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => Math.min(a + 1, results.length - 1));
            }
            if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            }
            if (e.key === "Enter") {
              e.preventDefault();
              go(active);
            }
            if (e.key === "Escape") {
              setQ("");
              setActive(0);
            }
          }}
          placeholder="type to navigate (vaults, create, crack, claim, …)"
          className="w-full bg-transparent outline-none placeholder:text-matrix-dim/60"
          spellCheck={false}
          autoCapitalize="none"
          autoCorrect="off"
        />
      </div>

      {q.trim().length > 0 && results.length > 0 && (
        <div className="mt-2 border border-matrix-dim/40 bg-black/40">
          {results.map((r, idx) => (
            <button
              key={r.route + r.label}
              type="button"
              onMouseEnter={() => setActive(idx)}
              onClick={() => go(idx)}
              className={
                "block w-full px-3 py-2 text-left text-sm transition-colors " +
                (idx === active
                  ? "bg-matrix-hot/10 text-matrix-hot"
                  : "text-matrix")
              }
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="tracking-wide">{r.label}</span>
                <span className="text-xs text-matrix-dim">{r.route}</span>
              </div>
              {r.description && (
                <div className="mt-1 text-xs text-matrix-dim/80">
                  {r.description}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
