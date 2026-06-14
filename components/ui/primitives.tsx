import * as React from "react";
import { cn, riskClasses, confidenceColor, pct, initials, avatarColor } from "@/lib/ui";

export function Card({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl border border-line bg-surface shadow-sm",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  icon,
  action,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
      <div className="flex items-center gap-2">
        {icon}
        <div>
          <h3 className="text-sm font-semibold text-ink">{title}</h3>
          {subtitle && (
            <p className="text-xs text-ink-soft">{subtitle}</p>
          )}
        </div>
      </div>
      {action}
    </div>
  );
}

export function Badge({
  children,
  className,
  tone = "neutral",
}: {
  children: React.ReactNode;
  className?: string;
  tone?: "neutral" | "brand" | "good" | "warn" | "bad";
}) {
  const tones: Record<string, string> = {
    neutral: "bg-surface-2 text-ink-soft border border-line",
    brand: "bg-brand-50 text-brand-700",
    good: "bg-risk-low-bg text-risk-low",
    warn: "bg-risk-med-bg text-risk-med",
    bad: "bg-risk-high-bg text-risk-high",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function RiskBadge({ level }: { level: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
        riskClasses(level),
      )}
    >
      {level} Risk
    </span>
  );
}

export function ConfidenceBar({
  value,
  showLabel = true,
}: {
  value: number;
  showLabel?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: pct(value),
            backgroundColor: confidenceColor(value),
          }}
        />
      </div>
      {showLabel && (
        <span className="w-9 text-right text-xs font-semibold text-ink">
          {pct(value)}
        </span>
      )}
    </div>
  );
}

export function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
      style={{
        width: size,
        height: size,
        backgroundColor: avatarColor(name),
        fontSize: size * 0.4,
      }}
      title={name}
    >
      {initials(name)}
    </div>
  );
}

export function Stat({
  label,
  value,
  tone,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  tone?: "brand" | "good" | "warn" | "bad";
  hint?: string;
}) {
  const color =
    tone === "bad"
      ? "text-risk-high"
      : tone === "warn"
        ? "text-risk-med"
        : tone === "good"
          ? "text-risk-low"
          : "text-ink";
  return (
    <Card className="p-4">
      <p className="text-xs font-medium text-ink-soft">{label}</p>
      <p className={cn("mt-1 text-2xl font-bold", color)}>{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-ink-faint">{hint}</p>}
    </Card>
  );
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-line bg-surface-2 px-6 py-12 text-center">
      <p className="text-sm font-medium text-ink">{title}</p>
      {description && (
        <p className="mt-1 max-w-sm text-xs text-ink-soft">{description}</p>
      )}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-surface-2", className)}
    />
  );
}
