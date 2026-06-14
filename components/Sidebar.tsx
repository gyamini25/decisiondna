"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Video,
  ClipboardList,
  ShieldAlert,
  GitBranch,
  Share2,
  BarChart3,
  Bell,
  Settings,
  Dna,
} from "lucide-react";
import { cn } from "@/lib/ui";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  live?: boolean;
  badge?: number;
}

// Nav order — Home is the default landing page; Decision Guard is item 4.
const NAV: NavItem[] = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/meetings", label: "Meetings", icon: Video },
  { href: "/decisions", label: "Decisions", icon: ClipboardList },
  { href: "/decision-guard", label: "Decision Guard", icon: ShieldAlert, live: true },
  { href: "/timeline", label: "Timeline", icon: GitBranch },
  { href: "/memory-graph", label: "Memory Graph", icon: Share2 },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/alerts", label: "Alerts", icon: Bell, badge: 3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col bg-sidebar text-sidebar-fg">
      <div className="flex items-center gap-2 px-5 py-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600">
          <Dna size={18} className="text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-white">DecisionDNA</p>
          <p className="text-[10px] text-sidebar-muted">Decision Intelligence</p>
        </div>
      </div>

      <nav className="mt-2 flex-1 space-y-1 px-3">
        {NAV.map((item) => {
          // Active state driven by the current path — never hardcoded.
          const active = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-brand-600 font-medium text-white"
                  : "text-sidebar-fg hover:bg-sidebar-hover",
              )}
            >
              <Icon size={18} />
              <span className="flex-1">{item.label}</span>
              {item.live && (
                <span className="live-dot h-2 w-2 rounded-full bg-risk-high" />
              )}
              {item.badge ? (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-risk-high px-1 text-[10px] font-bold text-white">
                  {item.badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-4">
        <div className="rounded-lg bg-sidebar-hover p-3">
          <p className="text-[11px] font-medium text-white">DecisionDNA Copilot</p>
          <p className="mt-0.5 text-[10px] text-sidebar-muted">
            Ask anything about past decisions.
          </p>
          <button className="mt-2 w-full rounded-md bg-brand-600 px-2 py-1.5 text-[11px] font-medium text-white hover:bg-brand-700">
            Ask Copilot
          </button>
        </div>
        <p className="mt-3 text-center text-[10px] text-sidebar-muted">v2.0.0</p>
      </div>
    </aside>
  );
}
