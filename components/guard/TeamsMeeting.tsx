"use client";

import { useState } from "react";
import {
  MessageSquare,
  Users,
  Hand,
  Smile,
  LayoutGrid,
  MoreHorizontal,
  Video,
  Mic,
  MicOff,
  MonitorUp,
  PhoneOff,
  Sparkles,
  Send,
} from "lucide-react";
import { initials, avatarColor } from "@/lib/ui";
import type { DecisionDetection } from "@/lib/types";
import type { TranscriptDoc } from "@/lib/transcripts";

const TABS = ["Live Transcript", "Notes", "Highlights"] as const;

/** A Microsoft Teams-style meeting stage: header, video grid, control bar,
 *  transcript tabs, live transcript + decision-detected banner, message bar. */
export function TeamsMeeting({
  doc,
  detection,
  activeSpeaker = "Laura Mitchell",
}: {
  doc: TranscriptDoc;
  detection?: DecisionDetection;
  activeSpeaker?: string;
}) {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Live Transcript");

  // Pad to a 6-tile Teams gallery.
  const tiles = [...doc.participants];
  for (const n of ["Sarah Johnson", "You"]) {
    if (tiles.length >= 6) break;
    if (!tiles.some((t) => t.name === n)) tiles.push({ name: n, role: "" });
  }

  return (
    <div className="flex h-full flex-col bg-[#1f2333]">
      {/* Meeting header */}
      <div className="flex items-center justify-between border-b border-black/30 px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-xs font-semibold text-white">
            {doc.title}
          </span>
          <span className="inline-flex items-center gap-1 rounded bg-risk-high/90 px-1.5 py-0.5 text-[9px] font-semibold text-white">
            <span className="live-dot h-1.5 w-1.5 rounded-full bg-white" /> Live
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] tabular-nums text-white/70">22:14</span>
          <div className="flex -space-x-1.5">
            {tiles.slice(0, 3).map((p) => (
              <div
                key={p.name}
                className="flex h-5 w-5 items-center justify-center rounded-full text-[8px] font-semibold text-white ring-2 ring-[#1f2333]"
                style={{ backgroundColor: avatarColor(p.name) }}
              >
                {initials(p.name)}
              </div>
            ))}
            <span className="flex h-5 items-center rounded-full bg-white/15 px-1.5 text-[9px] text-white">
              +{Math.max(0, tiles.length - 3)}
            </span>
          </div>
        </div>
      </div>

      {/* Video gallery */}
      <div className="grid grid-cols-3 gap-1.5 p-2">
        {tiles.slice(0, 6).map((p, i) => {
          const speaking = p.name === activeSpeaker;
          return (
            <div
              key={p.name + i}
              className={`relative flex aspect-video items-center justify-center overflow-hidden rounded-md bg-[#2a3047] ${
                speaking ? "ring-2 ring-[#6264a7]" : ""
              }`}
            >
              <div
                className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold text-white"
                style={{ backgroundColor: avatarColor(p.name) }}
              >
                {initials(p.name)}
              </div>
              <span className="absolute bottom-1 left-1 max-w-[85%] truncate rounded bg-black/50 px-1.5 py-0.5 text-[9px] font-medium text-white">
                {p.name}
              </span>
              <span className="absolute bottom-1 right-1 text-white/80">
                {speaking ? <Mic size={11} /> : <MicOff size={11} className="text-risk-high" />}
              </span>
            </div>
          );
        })}
      </div>

      {/* Teams control bar */}
      <div className="flex items-center justify-center gap-1 border-y border-black/30 bg-[#181b28] px-2 py-1.5">
        {[
          { icon: MessageSquare, label: "Chat" },
          { icon: Users, label: "People" },
          { icon: Hand, label: "Raise" },
          { icon: Smile, label: "React" },
          { icon: LayoutGrid, label: "View" },
          { icon: MoreHorizontal, label: "More" },
        ].map(({ icon: Icon, label }) => (
          <button
            key={label}
            title={label}
            className="flex flex-col items-center rounded px-1.5 py-1 text-white/70 hover:bg-white/10"
          >
            <Icon size={15} />
          </button>
        ))}
        <span className="mx-1 h-5 w-px bg-white/15" />
        {[Video, Mic, MonitorUp].map((Icon, i) => (
          <button key={i} className="rounded p-1.5 text-white/70 hover:bg-white/10">
            <Icon size={15} />
          </button>
        ))}
        <button className="ml-1 flex items-center gap-1 rounded bg-risk-high px-2 py-1 text-[11px] font-medium text-white">
          <PhoneOff size={13} /> Leave
        </button>
      </div>

      {/* Transcript tabs */}
      <div className="flex gap-3 border-b border-black/30 px-3 pt-2">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`pb-1.5 text-[11px] font-medium ${
              tab === t
                ? "border-b-2 border-[#7b83eb] text-white"
                : "text-white/50 hover:text-white/80"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Live transcript */}
      <div className="scroll-thin min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3">
        {tab === "Live Transcript" ? (
          <>
            {doc.lines.map((l, i) => (
              <div key={i} className="flex gap-2">
                <div
                  className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold text-white"
                  style={{ backgroundColor: avatarColor(l.speaker) }}
                >
                  {initials(l.speaker)}
                </div>
                <div className="flex-1">
                  <p className="text-[11px]">
                    <span className="font-semibold text-white">{l.speaker}</span>{" "}
                    <span className="text-white/40">{l.time}</span>
                  </p>
                  <p className="mt-0.5 text-xs text-white/75">{l.text}</p>
                </div>
              </div>
            ))}
            {detection?.isDecision && (
              <div className="flex items-start gap-2 rounded-md border border-[#6264a7]/60 bg-[#6264a7]/20 px-2.5 py-2">
                <Sparkles size={14} className="mt-0.5 text-[#a5b4fc]" />
                <div>
                  <p className="text-[11px] font-semibold text-[#c7d2fe]">
                    Decision Detected
                  </p>
                  <p className="text-xs text-white">{detection.proposal}</p>
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="py-6 text-center text-[11px] text-white/40">
            {tab} are empty for this meeting.
          </p>
        )}
      </div>

      {/* Message bar */}
      <div className="flex items-center gap-2 border-t border-black/30 px-3 py-2">
        <input
          placeholder="Type a message…"
          className="flex-1 rounded-md bg-white/5 px-2.5 py-1.5 text-xs text-white outline-none placeholder:text-white/40"
        />
        <button className="text-white/60 hover:text-white">
          <Send size={15} />
        </button>
      </div>
    </div>
  );
}
