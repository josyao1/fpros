"use client";

import { ComparisonRow } from "@/lib/types";

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

interface DraftBoardTableProps {
  rows: ComparisonRow[];
  draftedKeys: Set<string>;
  keyFor: (row: ComparisonRow) => string;
  onToggle: (key: string) => void;
}

export default function DraftBoardTable({
  rows,
  draftedKeys,
  keyFor,
  onToggle,
}: DraftBoardTableProps) {
  if (rows.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
      <div className="max-h-[75vh] overflow-y-auto">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-zinc-800 bg-zinc-900 text-left text-[11px] uppercase tracking-wider text-zinc-500">
              <th className="w-10 px-3 py-2.5 font-medium"></th>
              <th className="w-14 px-3 py-2.5 font-medium">ESPN</th>
              <th className="px-3 py-2.5 font-medium">Player</th>
              <th className="w-16 px-3 py-2.5 text-right font-medium">FPros</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const key = keyFor(row);
              const drafted = draftedKeys.has(key);
              return (
                <tr
                  key={key}
                  onClick={() => onToggle(key)}
                  className={`cursor-pointer border-b border-zinc-900 transition-colors last:border-0 ${
                    drafted ? "bg-zinc-950" : "hover:bg-zinc-900/60"
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
                      drafted ? "text-zinc-700" : "text-zinc-500"
                    }`}
                  >
                    {row.espnRank}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
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
                  <td
                    className={`px-3 py-2.5 text-right tabular-nums ${
                      drafted ? "text-zinc-700" : "text-zinc-500"
                    }`}
                  >
                    {row.fprosRank ?? "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
