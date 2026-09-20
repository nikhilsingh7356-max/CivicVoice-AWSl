import React from 'react';

/** Horizontal bar rows for ranked lists / distributions. */
export const BarRows: React.FC<{
  items: { label: string; value: number; tone?: string }[];
  max?: number;
}> = ({ items, max }) => {
  const peak = max ?? Math.max(1, ...items.map((i) => i.value));
  if (items.length === 0) {
    return <p className="subtitle py-4 text-center">No data yet.</p>;
  }
  return (
    <ul className="space-y-3">
      {items.map((it) => (
        <li key={it.label}>
          <div className="mb-1 flex items-baseline justify-between gap-3">
            <span className="min-w-0 truncate text-[12.5px] font-medium text-navy-800">{it.label}</span>
            <span className="shrink-0 text-[12px] font-semibold tabular-nums text-navy-500">{it.value}</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-navy-100">
            <div
              className="h-full rounded-full transition-[width] duration-300"
              style={{ width: `${(it.value / peak) * 100}%`, backgroundColor: it.tone ?? 'var(--color-navy-600)' }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
};

/** Small proportional donut with a legend. */
export const DonutLegend: React.FC<{
  items: { label: string; value: number; tone: string }[];
}> = ({ items }) => {
  const total = items.reduce((s, i) => s + i.value, 0);
  if (total === 0) return <p className="subtitle py-4 text-center">No data yet.</p>;

  let acc = 0;
  const segments = items.map((i) => {
    const start = acc / total;
    acc += i.value;
    return { ...i, pct: i.value / total, start };
  });

  const R = 34;
  const C = 2 * Math.PI * R;

  return (
    <div className="flex flex-wrap items-center gap-6">
      <svg viewBox="0 0 80 80" className="h-28 w-28 shrink-0" role="img" aria-label="Proportion chart">
        <circle cx="40" cy="40" r={R} fill="none" stroke="var(--color-navy-50)" strokeWidth="12" />
        {segments.map((s) => (
          <circle
            key={s.label}
            cx="40"
            cy="40"
            r={R}
            fill="none"
            stroke={s.tone}
            strokeWidth="12"
            strokeDasharray={`${s.pct * C} ${C}`}
            strokeDashoffset={-s.start * C}
            transform="rotate(-90 40 40)"
          />
        ))}
      </svg>
      <ul className="min-w-[160px] space-y-1.5">
        {segments.map((s) => (
          <li key={s.label} className="flex items-center gap-2">
            <span className="dot" style={{ backgroundColor: s.tone }} aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate text-[12.5px] text-navy-700">{s.label}</span>
            <span className="shrink-0 text-[12px] font-semibold tabular-nums text-navy-500">
              {Math.round(s.pct * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

/** Vertical bars for counts across buckets (e.g. reports per week). */
export const BucketBars: React.FC<{
  buckets: { label: string; value: number; tone?: string }[];
}> = ({ buckets }) => {
  const peak = Math.max(1, ...buckets.map((b) => b.value));
  const allZero = buckets.every((b) => b.value === 0);
  if (allZero) return <p className="subtitle py-4 text-center">No data in this range.</p>;
  return (
    <div>
      <div className="flex h-32 items-end gap-2">
        {buckets.map((b) => (
          <div key={b.label} className="group flex min-w-0 flex-1 flex-col items-center" title={`${b.label}: ${b.value}`}>
            <div
              className="w-full rounded-t-sm transition-[height] duration-300"
              style={{
                height: `${Math.max(2, (b.value / peak) * 100)}%`,
                backgroundColor: b.tone ?? 'var(--color-pine-500)',
              }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex gap-2">
        {buckets.map((b) => (
          <span key={b.label} className="min-w-0 flex-1 truncate text-center text-[10px] text-navy-400">
            {b.label}
          </span>
        ))}
      </div>
    </div>
  );
};

/** Linear scale bar used for confidence / severity readouts. */
export const ScaleBar: React.FC<{
  value: number;
  max?: number;
  tone: string;
  label?: string;
}> = ({ value, max = 10, tone, label }) => {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-medium text-navy-700">{label}</span>
        <span className="text-[12px] font-semibold tabular-nums text-navy-500">{value}/10</span>
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-navy-100">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: tone }} />
      </div>
    </div>
  );
};