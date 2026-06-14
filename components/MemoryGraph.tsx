"use client";

import { useMemo, useState } from "react";
import type { GraphData, GraphNode } from "@/lib/memory/graph-builder";

const TYPE_COLOR: Record<string, string> = {
  decision: "#6366f1",
  stakeholder: "#0ea5e9",
  risk: "#ef4444",
  outcome: "#10b981",
};

const W = 820;
const H = 560;

interface Positioned extends GraphNode {
  x: number;
  y: number;
}

/** Deterministic force-directed layout (no RNG → stable, SSR-safe). */
function layout(data: GraphData): Positioned[] {
  const n = data.nodes.length;
  const nodes: Positioned[] = data.nodes.map((node, i) => {
    const angle = (i / n) * Math.PI * 2;
    return {
      ...node,
      x: W / 2 + Math.cos(angle) * 220,
      y: H / 2 + Math.sin(angle) * 180,
    };
  });
  const idx = new Map(nodes.map((node, i) => [node.id, i]));

  const edges = data.edges
    .map((e) => ({ s: idx.get(e.source)!, t: idx.get(e.target)!, w: e.weight }))
    .filter((e) => e.s != null && e.t != null);

  const REP = 26000;
  const SPRING = 0.015;
  const CENTER = 0.012;

  for (let iter = 0; iter < 320; iter++) {
    const fx = new Array(n).fill(0);
    const fy = new Array(n).fill(0);
    // repulsion
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        let dx = nodes[i].x - nodes[j].x;
        let dy = nodes[i].y - nodes[j].y;
        let d2 = dx * dx + dy * dy || 0.01;
        const f = REP / d2;
        const d = Math.sqrt(d2);
        dx /= d;
        dy /= d;
        fx[i] += dx * f;
        fy[i] += dy * f;
        fx[j] -= dx * f;
        fy[j] -= dy * f;
      }
    }
    // springs
    for (const e of edges) {
      const dx = nodes[e.t].x - nodes[e.s].x;
      const dy = nodes[e.t].y - nodes[e.s].y;
      fx[e.s] += dx * SPRING;
      fy[e.s] += dy * SPRING;
      fx[e.t] -= dx * SPRING;
      fy[e.t] -= dy * SPRING;
    }
    // gravity to center + integrate
    const damp = 0.85;
    for (let i = 0; i < n; i++) {
      fx[i] += (W / 2 - nodes[i].x) * CENTER;
      fy[i] += (H / 2 - nodes[i].y) * CENTER;
      nodes[i].x += Math.max(-12, Math.min(12, fx[i] * damp));
      nodes[i].y += Math.max(-12, Math.min(12, fy[i] * damp));
      nodes[i].x = Math.max(30, Math.min(W - 30, nodes[i].x));
      nodes[i].y = Math.max(30, Math.min(H - 30, nodes[i].y));
    }
  }
  return nodes;
}

export function MemoryGraph({ data }: { data: GraphData }) {
  const positioned = useMemo(() => layout(data), [data]);
  const posById = useMemo(
    () => new Map(positioned.map((p) => [p.id, p])),
    [positioned],
  );
  const [active, setActive] = useState<Positioned | null>(null);
  const [filter, setFilter] = useState<string>("all");

  const visible = (t: string) => filter === "all" || filter === t;
  const connected = new Set<string>();
  if (active) {
    for (const e of data.edges) {
      if (e.source === active.id) connected.add(e.target);
      if (e.target === active.id) connected.add(e.source);
    }
  }

  return (
    <div className="flex gap-4">
      <div className="flex-1">
        <div className="mb-3 flex gap-1.5">
          {["all", "decision", "stakeholder", "risk", "outcome"].map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`rounded-full border px-3 py-1 text-xs capitalize ${
                filter === t
                  ? "border-brand-600 bg-brand-50 text-brand-700"
                  : "border-line bg-surface text-ink-soft hover:bg-surface-2"
              }`}
            >
              {t === "all" ? "Show all" : t + "s"}
            </button>
          ))}
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-xl border border-line bg-surface">
          {data.edges.map((e, i) => {
            const s = posById.get(e.source);
            const t = posById.get(e.target);
            if (!s || !t) return null;
            const dim = active && !(e.source === active.id || e.target === active.id);
            return (
              <line
                key={i}
                x1={s.x}
                y1={s.y}
                x2={t.x}
                y2={t.y}
                stroke={dim ? "#eef0f5" : "#cbd2e0"}
                strokeWidth={Math.min(3, e.weight)}
              />
            );
          })}
          {positioned.map((p) => {
            if (!visible(p.type)) return null;
            const r = p.type === "decision" ? 10 + p.weight * 12 : 9;
            const dim = active && active.id !== p.id && !connected.has(p.id);
            return (
              <g
                key={p.id}
                transform={`translate(${p.x},${p.y})`}
                onClick={() => setActive(p)}
                className="cursor-pointer"
                opacity={dim ? 0.25 : 1}
              >
                <circle r={r} fill={TYPE_COLOR[p.type]} stroke="#fff" strokeWidth={2} />
                {(p.type === "decision" || active?.id === p.id) && (
                  <text
                    x={r + 4}
                    y={4}
                    fontSize={10}
                    fill="#11151f"
                    className="select-none"
                  >
                    {p.label.length > 24 ? p.label.slice(0, 24) + "…" : p.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      <div className="w-64 shrink-0">
        <div className="rounded-xl border border-line bg-surface p-4">
          <p className="text-xs font-semibold text-ink">Node Detail</p>
          {active ? (
            <div className="mt-2 space-y-2">
              <p className="text-sm font-semibold text-ink">{active.label}</p>
              <span
                className="inline-block rounded-full px-2 py-0.5 text-[10px] font-medium capitalize text-white"
                style={{ background: TYPE_COLOR[active.type] }}
              >
                {active.type}
              </span>
              <p className="text-[11px] leading-relaxed text-ink-soft">
                {active.description}
              </p>
              {active.meta && (
                <div className="space-y-0.5 border-t border-line pt-2">
                  {Object.entries(active.meta).map(([k, v]) => (
                    <p key={k} className="text-[11px] text-ink-soft">
                      <span className="capitalize text-ink-faint">{k}</span>:{" "}
                      {String(v)}
                    </p>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="mt-2 text-[11px] text-ink-soft">
              Click a node to inspect its connections.
            </p>
          )}
        </div>

        <div className="mt-3 rounded-xl border border-line bg-surface p-4">
          <p className="text-xs font-semibold text-ink">Legend</p>
          <div className="mt-2 space-y-1.5">
            {Object.entries(TYPE_COLOR).map(([t, c]) => (
              <div key={t} className="flex items-center gap-2 text-[11px] capitalize text-ink-soft">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: c }} />
                {t}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
