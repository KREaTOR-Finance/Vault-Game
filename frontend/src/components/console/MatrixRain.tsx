"use client";

import { useEffect, useRef } from "react";

type MatrixRainProps = {
  opacity?: number;
};

export default function MatrixRain({ opacity = 0.22 }: MatrixRainProps) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;
    const context = ctx;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    let raf = 0;
    let lastT = 0;

    const chars =
      "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

    let width = 0;
    let height = 0;
    let columns = 0;
    let drops: number[] = [];

    function resize() {
      const c = ref.current;
      if (!c) return;
      const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      width = Math.floor(window.innerWidth);
      height = Math.floor(window.innerHeight);
      c.width = Math.floor(width * dpr);
      c.height = Math.floor(height * dpr);
      c.style.width = `${width}px`;
      c.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);

      const fontSize = 14;
      columns = Math.floor(width / fontSize);
      drops = new Array(columns).fill(0).map(() => Math.random() * height);
      context.font = `${fontSize}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, \"Liberation Mono\", \"Courier New\", monospace`;
    }

    function tick(t: number) {
      raf = requestAnimationFrame(tick);
      if (prefersReducedMotion) return;

      // throttle a bit
      if (t - lastT < 50) return;
      lastT = t;

      context.fillStyle = `rgba(2, 8, 5, 0.11)`;
      context.fillRect(0, 0, width, height);

      context.fillStyle = `rgba(0, 255, 102, ${opacity})`;

      const fontSize = 14;
      for (let i = 0; i < columns; i++) {
        const text = chars[Math.floor(Math.random() * chars.length)];
        const x = i * fontSize;
        const y = drops[i];
        context.fillText(text, x, y);

        if (y > height && Math.random() > 0.975) drops[i] = 0;
        drops[i] += fontSize;
      }
    }

    resize();
    window.addEventListener("resize", resize);
    raf = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(raf);
    };
  }, [opacity]);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className="fixed inset-0 -z-10 h-full w-full"
    />
  );
}
