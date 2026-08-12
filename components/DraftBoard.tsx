"use client";

import { useEffect, useState, useTransition } from "react";
import ComparisonTable from "./ComparisonTable";
import { getRankings } from "@/app/actions";
import { ComparisonRow, PlayerRankingRow, ScoringFormat } from "@/lib/types";

const TABS: { id: ScoringFormat; label: string }[] = [
  { id: "ppr", label: "PPR" },
  { id: "half-ppr", label: "Half PPR" },
];

function toComparisonRow(row: PlayerRankingRow): ComparisonRow {
  return {
    espnRank: row.espn_rank,
    name: row.player_name,
    team: row.team ?? "",
    pos: row.pos ?? "",
    avgPick: row.avg_pick,
    fprosRank: row.fpros_rank,
    diff: row.diff,
  };
}

export default function DraftBoard() {
  const [activeTab, setActiveTab] = useState<ScoringFormat>("ppr");
  const [rows, setRows] = useState<ComparisonRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const load = (tab: ScoringFormat) => {
    setError(null);
    startTransition(async () => {
      try {
        const data = await getRankings(tab);
        setRows(data.map(toComparisonRow));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load.");
      }
    });
  };

  useEffect(() => {
    load(activeTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-10">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Draft Board
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Last saved rankings from the Update Rankings tab.
        </p>
      </header>

      <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "border-b-2 border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100"
                  : "border-b-2 border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => load(activeTab)}
          disabled={isPending}
          className="mb-2 text-xs text-zinc-400 hover:text-zinc-600 disabled:opacity-50 dark:hover:text-zinc-300"
        >
          {isPending ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
          {error}
        </div>
      )}

      {!error && !isPending && rows.length === 0 && (
        <div className="rounded-lg border border-dashed border-zinc-300 py-16 text-center text-sm text-zinc-400 dark:border-zinc-700">
          Nothing saved for {TABS.find((t) => t.id === activeTab)?.label} yet.
          Go to Update Rankings, paste your lists, and hit Save.
        </div>
      )}

      {rows.length > 0 && <ComparisonTable rows={rows} />}
    </div>
  );
}
