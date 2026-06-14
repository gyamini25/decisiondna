"use client";

import { Mic } from "lucide-react";
import { initials, avatarColor } from "@/lib/ui";

interface Participant {
  name: string;
  role?: string;
}

export function VideoGrid({
  participants,
  activeSpeaker,
}: {
  participants: Participant[];
  activeSpeaker?: string;
}) {
  // Pad to a 6-tile call grid like the mockup.
  const tiles = [...participants];
  if (tiles.length < 6) {
    const extra = ["Sarah Johnson", "You"].filter(
      (n) => !tiles.some((t) => t.name === n),
    );
    for (const n of extra) {
      if (tiles.length >= 6) break;
      tiles.push({ name: n });
    }
  }

  return (
    <div className="grid grid-cols-3 gap-2 p-3">
      {tiles.slice(0, 6).map((p, i) => {
        const active = p.name === activeSpeaker || (!activeSpeaker && i === 0);
        return (
          <div
            key={p.name + i}
            className={`video-tile relative flex aspect-video items-center justify-center overflow-hidden rounded-lg ${
              active ? "ring-2 ring-brand-500" : "ring-1 ring-line"
            }`}
          >
            <div
              className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold text-white"
              style={{ backgroundColor: avatarColor(p.name) }}
            >
              {initials(p.name)}
            </div>
            <span className="absolute bottom-1 left-1.5 rounded bg-black/40 px-1.5 py-0.5 text-[9px] font-medium text-white">
              {p.name}
            </span>
            {active && (
              <Mic size={11} className="absolute right-1.5 top-1.5 text-brand-300" />
            )}
          </div>
        );
      })}
    </div>
  );
}
