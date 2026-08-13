"use client";

import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react";
import { ComparisonRow } from "@/lib/types";
import { RankSource } from "@/lib/match";

const POS_STYLES: Record<string, string> = {
  QB: "bg-red-500/15 text-red-400 border-red-500/30",
  RB: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  WR: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  TE: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  K: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
  DST: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  "D/ST": "bg-purple-500/15 text-purple-400 border-purple-500/30",
  FLEX: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
};

function PosBadge({ pos, dimmed }: { pos: string; dimmed: boolean }) {
  const style = POS_STYLES[pos.toUpperCase()] ?? POS_STYLES.FLEX;
  return (
    <span
      className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
        dimmed ? "border-zinc-700 bg-zinc-800/40 text-zinc-600" : style
      }`}
    >
      {pos || "—"}
    </span>
  );
}

function DiffBadge({ diff, dimmed }: { diff: number | null; dimmed: boolean }) {
  if (diff === null) {
    return <span className="text-[11px] text-zinc-600">no match</span>;
  }
  if (diff === 0) {
    return <span className="text-[11px] text-zinc-500">even</span>;
  }
  const isValue = diff > 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[11px] font-bold tabular-nums ${
        dimmed
          ? "bg-zinc-800/40 text-zinc-600"
          : isValue
          ? "bg-emerald-500/15 text-emerald-400"
          : "bg-red-500/15 text-red-400"
      }`}
      title={isValue ? "Value: FPros ranks them higher than ESPN ADP" : "Reach: ESPN ADP is ahead of FPros"}
    >
      {isValue ? "▲" : "▼"}
      {Math.abs(diff)}
    </span>
  );
}

function initialsFor(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function Headshot({
  espnId,
  name,
  pos,
  dimmed,
}: {
  espnId: string | null | undefined;
  name: string;
  pos: string;
  dimmed: boolean;
}) {
  const [errored, setErrored] = useState(false);
  const posStyle = POS_STYLES[pos.toUpperCase()] ?? POS_STYLES.FLEX;

  if (!espnId || errored) {
    return (
      <div
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold ${
          dimmed ? "border-zinc-700 bg-zinc-800/40 text-zinc-600" : posStyle
        }`}
      >
        {initialsFor(name)}
      </div>
    );
  }

  return (
    <img
      src={`https://a.espncdn.com/i/headshots/nfl/players/full/${espnId}.png`}
      alt=""
      loading="lazy"
      onError={() => setErrored(true)}
      className={`h-7 w-7 shrink-0 rounded-full bg-zinc-800 object-cover object-top ${
        dimmed ? "opacity-40 grayscale" : ""
      }`}
    />
  );
}

interface DraftBoardTableProps {
  rows: ComparisonRow[];
  sortBy: RankSource;
  draftedKeys: Set<string>;
  starredKeys: Set<string>;
  keyFor: (row: ComparisonRow) => string;
  onToggle: (key: string) => void;
  onToggleStar: (key: string) => void;
  hoveredKey?: string | null;
  setHoveredKey?: Dispatch<SetStateAction<string | null>>;
  showSecondaryRank?: boolean;
}

export default function DraftBoardTable({
  rows,
  sortBy,
  draftedKeys,
  starredKeys,
  keyFor,
  onToggle,
  onToggleStar,
  hoveredKey = null,
  setHoveredKey,
  showSecondaryRank = true,
}: DraftBoardTableProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // When the hovered player isn't visible in this panel (e.g. they're
  // scrolled off in the other order), bring their row into view.
  useEffect(() => {
    if (!hoveredKey || !containerRef.current) return;
    const container = containerRef.current;
    const el = container.querySelector<HTMLElement>(
      `[data-key="${CSS.escape(hoveredKey)}"]`
    );
    if (!el) return;

    const containerRect = container.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const isVisible =
      elRect.top >= containerRect.top && elRect.bottom <= containerRect.bottom;

    if (!isVisible) {
      el.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [hoveredKey]);

  if (rows.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
      <div ref={containerRef} className="max-h-[75vh] overflow-auto">
        <table
          className={`w-full border-collapse text-sm ${
            showSecondaryRank ? "min-w-[520px]" : "min-w-[380px]"
          }`}
        >
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-zinc-800 bg-zinc-900 text-left text-[11px] uppercase tracking-wider text-zinc-500">
              <th className="w-10 px-3 py-2.5 font-medium"></th>
              <th className="w-14 px-3 py-2.5 font-medium text-zinc-300">
                {sortBy === "espn" ? "ESPN" : "FPros"}
              </th>
              <th className="px-3 py-2.5 font-medium">Player</th>
              {showSecondaryRank && (
                <th className="w-16 px-3 py-2.5 text-right font-medium">
                  {sortBy === "espn" ? "FPros" : "ESPN"}
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const key = keyFor(row);
              const drafted = draftedKeys.has(key);
              const starred = starredKeys.has(key);
              const isHovered = hoveredKey === key;
              const primaryRank =
                sortBy === "espn" ? row.espnRank : row.fprosRank;
              const secondaryRank =
                sortBy === "espn" ? row.fprosRank : row.espnRank;
              return (
                <tr
                  key={key}
                  data-key={key}
                  onClick={() => onToggle(key)}
                  onMouseEnter={() => setHoveredKey?.(key)}
                  onMouseLeave={() =>
                    setHoveredKey?.((prev) => (prev === key ? null : prev))
                  }
                  className={`cursor-pointer border-b border-zinc-900 transition-colors last:border-0 ${
                    drafted
                      ? "bg-zinc-950"
                      : isHovered
                      ? "bg-blue-500/10 ring-1 ring-inset ring-blue-500/40"
                      : "hover:bg-zinc-900/60"
                  }`}
                >
                  <td className="px-3 py-2.5">
                    <input
                      type="checkbox"
                      checked={drafted}
                      onChange={() => onToggle(key)}
                      onClick={(e) => e.stopPropagation()}
                      className="h-4 w-4 rounded border-zinc-600 bg-zinc-800 accent-emerald-500"
                    />
                  </td>
                  <td
                    className={`px-3 py-2.5 tabular-nums ${
                      drafted ? "text-zinc-700" : "font-semibold text-zinc-200"
                    }`}
                  >
                    {primaryRank ?? "—"}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <Headshot
                        espnId={row.espnId}
                        name={row.name}
                        pos={row.pos}
                        dimmed={drafted}
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleStar(key);
                        }}
                        aria-label={starred ? "Unstar player" : "Star player"}
                        className={`text-base leading-none transition-colors ${
                          starred
                            ? "text-amber-400"
                            : "text-zinc-700 hover:text-zinc-400"
                        }`}
                      >
                        {starred ? "★" : "☆"}
                      </button>
                      <span
                        className={`font-medium ${
                          drafted
                            ? "text-zinc-600 line-through decoration-zinc-700"
                            : "text-zinc-100"
                        }`}
                      >
                        {row.name}
                      </span>
                      <PosBadge pos={row.pos} dimmed={drafted} />
                      <span
                        className={`text-xs ${
                          drafted ? "text-zinc-700" : "text-zinc-500"
                        }`}
                      >
                        {row.team}
                      </span>
                      <DiffBadge diff={row.diff} dimmed={drafted} />
                    </div>
                  </td>
                  {showSecondaryRank && (
                    <td
                      className={`px-3 py-2.5 text-right tabular-nums ${
                        drafted ? "text-zinc-700" : "text-zinc-500"
                      }`}
                    >
                      {secondaryRank ?? "—"}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
