"use client";

import type { CSSProperties } from "react";
import { ComparisonRow } from "@/lib/types";

function diffStyle(diff: number | null): CSSProperties {
  if (diff === null) {
    return { background: "transparent" };
  }
  if (diff === 0) {
    return { background: "transparent" };
  }
  const intensity = Math.min(Math.abs(diff) / 15, 1) * 0.55 + 0.08;
  const color = diff > 0 ? "34,197,94" : "239,68,68"; // green : red
  return { background: `rgba(${color},${intensity})` };
}

function diffLabel(diff: number | null): string {
  if (diff === null) return "—";
  if (diff === 0) return "0";
  return diff > 0 ? `+${diff}` : `${diff}`;
}

export default function ComparisonTable({ rows }: { rows: ComparisonRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-300 py-16 text-center text-sm text-zinc-400 dark:border-zinc-700">
        Paste ESPN rankings above to get started.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
            <th className="px-3 py-2 font-medium">ESPN #</th>
            <th className="px-3 py-2 font-medium">Player</th>
            <th className="px-3 py-2 font-medium">Team</th>
            <th className="px-3 py-2 font-medium">Pos</th>
            <th className="px-3 py-2 font-medium">ADP</th>
            <th className="px-3 py-2 font-medium">FPros #</th>
            <th className="px-3 py-2 font-medium">Diff</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={`${row.espnRank}-${row.name}`}
              className="border-b border-zinc-100 last:border-0 dark:border-zinc-900"
            >
              <td className="px-3 py-1.5 tabular-nums text-zinc-500">
                {row.espnRank}
              </td>
              <td className="px-3 py-1.5 font-medium text-zinc-800 dark:text-zinc-100">
                {row.name}
                {row.fprosRank === null && (
                  <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-normal text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
                    no FPros match
                  </span>
                )}
              </td>
              <td className="px-3 py-1.5 text-zinc-500">{row.team}</td>
              <td className="px-3 py-1.5 text-zinc-500">{row.pos}</td>
              <td className="px-3 py-1.5 tabular-nums text-zinc-500">
                {row.avgPick ?? "—"}
              </td>
              <td className="px-3 py-1.5 tabular-nums text-zinc-500">
                {row.fprosRank ?? "—"}
              </td>
              <td
                className="px-3 py-1.5 text-right tabular-nums font-semibold"
                style={diffStyle(row.diff)}
              >
                {diffLabel(row.diff)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
