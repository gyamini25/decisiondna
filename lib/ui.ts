import clsx, { type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

export function pct(x: number): string {
  return `${Math.round(x * 100)}%`;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export type RiskLevel = "High" | "Medium" | "Low";

/** Tailwind classes for a risk badge by level. */
export function riskClasses(level: string): string {
  switch (level) {
    case "High":
      return "bg-risk-high-bg text-risk-high";
    case "Medium":
      return "bg-risk-med-bg text-risk-med";
    default:
      return "bg-risk-low-bg text-risk-low";
  }
}

/** Color for a confidence value. */
export function confidenceColor(c: number): string {
  if (c >= 0.8) return "var(--color-good)";
  if (c >= 0.6) return "var(--color-warn)";
  return "var(--color-bad)";
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Deterministic pastel avatar color from a name. */
export function avatarColor(name: string): string {
  const colors = [
    "#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
    "#ec4899", "#14b8a6",
  ];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return colors[h % colors.length];
}
