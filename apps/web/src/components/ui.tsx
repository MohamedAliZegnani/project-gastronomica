import type { ButtonHTMLAttributes, InputHTMLAttributes, PropsWithChildren } from "react";

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  const styles =
    variant === "primary"
      ? "bg-[color:var(--color-accent)] text-[#1a1408] hover:brightness-110"
      : variant === "secondary"
        ? "bg-[color:var(--color-panel-2)] text-ink border border-white/10 hover:border-white/25"
        : variant === "danger"
          ? "bg-red-900/40 text-red-100 border border-red-500/30"
          : "bg-transparent text-[color:var(--color-muted)] hover:text-ink";
  return (
    <button
      className={`inline-flex items-center justify-center rounded-full px-4 py-2.5 text-sm font-bold transition disabled:opacity-40 ${styles} ${className}`}
      {...props}
    />
  );
}

export function Input({
  label,
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  return (
    <label className="grid gap-1.5 text-sm">
      {label && (
        <span className="text-xs font-bold uppercase tracking-wider text-[color:var(--color-muted)]">
          {label}
        </span>
      )}
      <input
        className={`rounded-xl border border-white/10 bg-[#0c2422] px-3 py-2.5 text-ink outline-none focus:border-[color:var(--color-accent)] ${className}`}
        {...props}
      />
    </label>
  );
}

export function Card({ children, className = "" }: PropsWithChildren<{ className?: string }>) {
  return (
    <div
      className={`rounded-2xl border border-white/10 bg-[color:var(--color-panel)] p-5 shadow-xl ${className}`}
    >
      {children}
    </div>
  );
}

export function Avatar({
  name,
  hue,
  size = "md",
}: {
  name: string;
  hue: number;
  size?: "sm" | "md" | "lg";
}) {
  const dim = size === "sm" ? "h-8 w-8 text-xs" : size === "lg" ? "h-16 w-16 text-xl" : "h-10 w-10 text-sm";
  return (
    <div
      className={`${dim} grid place-items-center rounded-full font-bold text-[#0f1a14]`}
      style={{ background: `hsl(${hue} 70% 55%)` }}
      aria-hidden
    >
      {name.slice(0, 1).toUpperCase()}
    </div>
  );
}

export function Badge({ children }: PropsWithChildren) {
  return (
    <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-bold text-[color:var(--color-muted)]">
      {children}
    </span>
  );
}

export function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = Math.min(100, Math.round((value / Math.max(1, max)) * 100));
  return (
    <div className="h-2 overflow-hidden rounded-full bg-black/35">
      <div
        className="h-full rounded-full bg-gradient-to-r from-[color:var(--color-accent)] to-[color:var(--color-accent-2)]"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-6">
      <h1 className="font-[family-name:var(--font-display)] text-3xl md:text-4xl">{title}</h1>
      {subtitle && <p className="mt-1 text-[color:var(--color-muted)]">{subtitle}</p>}
    </div>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <Card className="text-center">
      <h3 className="font-bold">{title}</h3>
      <p className="mt-1 text-sm text-[color:var(--color-muted)]">{body}</p>
    </Card>
  );
}
