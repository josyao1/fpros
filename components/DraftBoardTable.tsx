"use client";

import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react";
import { ComparisonRow } from "@/lib/types";
import { RankSource } from "@/lib/match";

const PENNANT_CLIP = "[clip-path:polygon(0_0,82%_0,100%_50%,82%_100%,0_100%)]";

const POS_FILL: Record<string, string> = {
  QB: "bg-[#e79aa8]",
  RB: "bg-[#8fd6a2]",
  WR: "bg-[#9cc4e8]",
  TE: "bg-[#e8b87e]",
  K: "bg-[#c9c2ad]",
  DST: "bg-[#c6a9e8]",
  "D/ST": "bg-[#c6a9e8]",
  FLEX: "bg-[#c9c2ad]",
};

function PosBadge({
  pos,
  dimmed,
  compact,
}: {
  pos: string;
  dimmed: boolean;
  compact: boolean;
}) {
  const fill = POS_FILL[pos.toUpperCase()] ?? POS_FILL.FLEX;
  return (
    <span
      className={`inline-flex items-center font-extrabold uppercase tracking-wide text-[#0f2116] ${PENNANT_CLIP} ${
        compact ? "py-0.5 pl-1 pr-2 text-[8px]" : "py-0.5 pl-1.5 pr-2.5 text-[10px]"
      } ${dimmed ? "bg-[#6f8375]/40" : fill}`}
    >
      {pos || "—"}
    </span>
  );
}

function DiffBadge({
  diff,
  dimmed,
  compact,
}: {
  diff: number | null;
  dimmed: boolean;
  compact: boolean;
}) {
  const sizeCls = compact ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-0.5 text-[11px]";
  if (diff === null) {
    return <span className={`${compact ? "text-[9px]" : "text-[11px]"} text-[#6f8375]`}>no match</span>;
  }
  if (diff === 0) {
    return (
      <span className={`inline-flex items-center rounded-full border border-dashed border-[#f5f0e1]/25 font-bold text-[#6f8375] ${sizeCls}`}>
        even
      </span>
    );
  }
  const isValue = diff > 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full border border-dashed font-extrabold tabular-nums ${sizeCls} ${
        dimmed
          ? "border-[#f5f0e1]/15 text-[#6f8375]"
          : isValue
          ? "border-[#8fd6a2] text-[#8fd6a2]"
          : "border-[#e58b84] text-[#e58b84]"
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
  dimmed,
  compact,
}: {
  espnId: string | null | undefined;
  name: string;
  pos: string;
  dimmed: boolean;
  compact: boolean;
}) {
  const [errored, setErrored] = useState(false);
  const sizeCls = compact ? "h-4 w-4" : "h-7 w-7";

  if (!espnId || errored) {
    return (
      <div
        className={`flex ${sizeCls} shrink-0 items-center justify-center rounded-full border-[1.5px] border-dashed font-extrabold ${
          compact ? "text-[7px]" : "text-[10px]"
        } ${
          dimmed
            ? "border-[#f5f0e1]/15 bg-[#1c3a26] text-[#6f8375]"
            : "border-[#f5f0e1]/30 bg-[#1c3a26] text-[#a9bcac]"
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
      className={`${sizeCls} shrink-0 rounded-full bg-[#1c3a26] object-cover object-top ${
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
  linkedKey?: string | null;
  setLinkedKey?: Dispatch<SetStateAction<string | null>>;
  showSecondaryRank?: boolean;
  compact?: boolean;
}

export default function DraftBoardTable({
  rows,
  sortBy,
  draftedKeys,
  starredKeys,
  keyFor,
  onToggle,
  onToggleStar,
  linkedKey = null,
  setLinkedKey,
  showSecondaryRank = true,
  compact = false,
}: DraftBoardTableProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // When the clicked player isn't visible in this panel (e.g. they're
  // scrolled off in the other order), bring their row into view.
  useEffect(() => {
    if (!linkedKey || !containerRef.current) return;
    const container = containerRef.current;
    const el = container.querySelector<HTMLElement>(
      `[data-key="${CSS.escape(linkedKey)}"]`
    );
    if (!el) return;

    const containerRect = container.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const isVisible =
      elRect.top >= containerRect.top && elRect.bottom <= containerRect.bottom;

    if (!isVisible) {
      el.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [linkedKey]);

  if (rows.length === 0) return null;

  const cellPad = compact ? "px-1.5 py-1" : "px-3 py-2.5";
  const headerPad = compact ? "px-1.5 py-1.5" : "px-3 py-2.5";
  const rowGap = compact ? "gap-1" : "gap-2";
  const rankCls = compact ? "text-xs" : "";
  const nameCls = compact ? "text-xs" : "";
  const teamCls = compact ? "text-[10px]" : "text-xs";
  const starCls = compact ? "text-xs" : "text-base";
  const minW = compact
    ? showSecondaryRank
      ? "min-w-[400px]"
      : "min-w-[230px]"
    : showSecondaryRank
    ? "min-w-[520px]"
    : "min-w-[380px]";

  return (
    <div className="overflow-hidden rounded-md border-[1.5px] border-[#f5f0e1]/15 bg-[#1a3423]">
      <div ref={containerRef} className="max-h-[75vh] overflow-auto">
        <table className={`w-full border-collapse text-sm ${minW}`}>
          <thead className="sticky top-0 z-10">
            <tr className="border-b-[1.5px] border-dashed border-[#f5f0e1]/20 bg-[#1a3423] text-left text-[11px] uppercase tracking-wider text-[#6f8375]">
              <th className={`w-8 ${headerPad} font-bold`}></th>
              <th className={`w-12 ${headerPad} font-bold text-[#e8c257]`}>
                {sortBy === "espn" ? "ESPN" : "FPros"}
              </th>
              <th className={`${headerPad} font-bold`}>Player</th>
              {showSecondaryRank && (
                <th className={`w-14 ${headerPad} text-right font-bold`}>
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
              const isLinked = linkedKey === key;
              const primaryRank =
                sortBy === "espn" ? row.espnRank : row.fprosRank;
              const secondaryRank =
                sortBy === "espn" ? row.fprosRank : row.espnRank;
              return (
                <tr
                  key={key}
                  data-key={key}
                  onClick={() => setLinkedKey?.(key)}
                  className={`cursor-pointer border-b border-[#f5f0e1]/8 transition-colors last:border-0 ${
                    drafted
                      ? "bg-[#152a1d]"
                      : isLinked
                      ? "bg-[#e8c257]/10 ring-1 ring-inset ring-[#e8c257]/50"
                      : "hover:bg-[#204029]"
                  }`}
                >
                  <td className={cellPad}>
                    <input
                      type="checkbox"
                      checked={drafted}
                      onChange={() => onToggle(key)}
                      onClick={(e) => e.stopPropagation()}
                      className={`rounded border-[#f5f0e1]/40 bg-[#1c3a26] accent-[#8fd6a2] ${
                        compact ? "h-3 w-3" : "h-4 w-4"
                      }`}
                    />
                  </td>
                  <td
                    className={`${cellPad} tabular-nums ${rankCls} ${
                      drafted ? "text-[#6f8375]" : "font-extrabold text-[#e8c257]"
                    }`}
                  >
                    {primaryRank ?? "—"}
                  </td>
                  <td className={cellPad}>
                    <div className={`flex items-center ${rowGap}`}>
                      <Headshot
                        espnId={row.espnId}
                        name={row.name}
                        pos={row.pos}
                        dimmed={drafted}
                        compact={compact}
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleStar(key);
                        }}
                        aria-label={starred ? "Unstar player" : "Star player"}
                        className={`${starCls} leading-none transition-colors ${
                          starred
                            ? "text-[#e8c257]"
                            : "text-[#f5f0e1]/25 hover:text-[#f5f0e1]/50"
                        }`}
                      >
                        {starred ? "★" : "☆"}
                      </button>
                      <span
                        className={`font-bold ${nameCls} ${
                          drafted
                            ? "text-[#6f8375] line-through decoration-[#6f8375]/60"
                            : "text-[#f5f0e1]"
                        }`}
                      >
                        {row.name}
                      </span>
                      <PosBadge pos={row.pos} dimmed={drafted} compact={compact} />
                      <span
                        className={teamCls + " " + (drafted ? "text-[#6f8375]/60" : "text-[#6f8375]")}
                      >
                        {row.team}
                      </span>
                      <DiffBadge diff={row.diff} dimmed={drafted} compact={compact} />
                    </div>
                  </td>
                  {showSecondaryRank && (
                    <td
                      className={`${cellPad} text-right tabular-nums ${rankCls} ${
                        drafted ? "text-[#6f8375]/60" : "text-[#6f8375]"
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
