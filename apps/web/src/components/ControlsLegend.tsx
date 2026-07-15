export function ControlsLegend({ className = "" }: { className?: string }) {
  const rows = [
    ["WASD / Arrows", "Move"],
    ["Shift", "Sprint"],
    ["E", "Interact / serve"],
    ["Q", "Drop"],
    ["Space", "Throw"],
    ["H", "Toggle help"],
    ["Esc", "Pause"],
    ["R", "Replay (results)"],
  ];
  return (
    <div
      className={`rounded-2xl border border-white/10 bg-[color:var(--color-panel)]/80 p-4 text-sm ${className}`}
    >
      <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[color:var(--color-muted)]">
        Controls
      </p>
      <ul className="grid gap-1.5 sm:grid-cols-2">
        {rows.map(([key, action]) => (
          <li key={key} className="flex justify-between gap-3">
            <kbd className="rounded bg-black/40 px-1.5 py-0.5 font-mono text-xs text-[color:var(--color-accent)]">
              {key}
            </kbd>
            <span className="text-[color:var(--color-muted)]">{action}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
