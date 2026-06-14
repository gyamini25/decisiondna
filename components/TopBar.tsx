"use client";

import { Search, Bell, HelpCircle, Activity } from "lucide-react";
import { Avatar } from "@/components/ui/primitives";

export function TopBar() {
  return (
    <header className="flex h-16 shrink-0 items-center gap-4 border-b border-line bg-surface px-6">
      <div className="relative max-w-xl flex-1">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"
        />
        <input
          className="w-full rounded-lg border border-line bg-surface-2 py-2 pl-9 pr-12 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-brand-400"
          placeholder="Search decisions, people, outcomes…"
        />
        <kbd className="absolute right-3 top-1/2 -translate-y-1/2 rounded border border-line bg-surface px-1.5 py-0.5 text-[10px] text-ink-faint">
          ⌘K
        </kbd>
      </div>

      <div className="flex items-center gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-risk-low-bg bg-risk-low-bg px-2.5 py-1 text-xs font-medium text-risk-low">
          <Activity size={13} /> AI Agent Active
        </span>
        <button className="text-ink-soft hover:text-ink">
          <Bell size={18} />
        </button>
        <button className="text-ink-soft hover:text-ink">
          <HelpCircle size={18} />
        </button>
        <div className="flex items-center gap-2 border-l border-line pl-3">
          <Avatar name="Laura Mitchell" size={32} />
          <div className="leading-tight">
            <p className="text-xs font-semibold text-ink">Laura Mitchell</p>
            <p className="text-[10px] text-ink-soft">Senior Product Manager</p>
          </div>
        </div>
      </div>
    </header>
  );
}
