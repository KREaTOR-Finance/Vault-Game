'use client';

import { useMemo } from 'react';

export default function Sparkline({
  values,
  width = 120,
  height = 28,
}: {
  values: number[];
  width?: number;
  height?: number;
}) {
  const pts = useMemo(() => {
    if (!values.length) return '';
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || 1;

    return values
      .map((v, i) => {
        const x = (i / Math.max(1, values.length - 1)) * width;
        const y = height - ((v - min) / span) * height;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  }, [values, width, height]);

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden>
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        points={pts}
        opacity={values.length ? 1 : 0.3}
      />
    </svg>
  );
}
