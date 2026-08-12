"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import DraftBoardTable from "./DraftBoardTable";
import { getRankings } from "@/app/actions";
import { normalizeName, sortComparison, RankSource } from "@/lib/match";
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

function draftedStorageKey(tab: ScoringFormat) {
  return `ff-drafted:${tab}`;
}

function loadDrafted(tab: ScoringFormat): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(draftedStorageKey(tab));
    if (!raw) return new Set();
    return new Set(JSON.parse(raw));
  } catch {
    return new Set();
  }
}

export default function DraftBoard() {
  const [activeTab, setActiveTab] = useState<ScoringFormat>("ppr");
  const [rows, setRows] = useState<ComparisonRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [drafted, setDrafted] = useState<Set<string>>(new Set());
  const [hydrated, setHydrated] = useState(false);
  const [sortBy, setSortBy] = useState<RankSource>("espn");

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
    setDrafted(loadDrafted(activeTab));
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(
      draftedStorageKey(activeTab),
      JSON.stringify(Array.from(drafted))
    );
  }, [drafted, activeTab, hydrated]);

  const keyFor = (row: ComparisonRow) => normalizeName(row.name);

  const toggleDrafted = (key: string) => {
    setDrafted((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const draftedCount = useMemo(
    () => rows.filter((r) => drafted.has(keyFor(r))).length,
    [rows, drafted]
  );

  const sortedRows = useMemo(
    () => sortComparison(rows, sortBy),
    [rows, sortBy]
  );

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-6 py-10">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-zinc-100">Draft Board</h1>
        <p className="text-sm text-zinc-500">
          Last saved rankings from Update Rankings. Click a player or their
          checkbox to mark them drafted.
        </p>
      </header>

      <div className="flex items-center justify-between border-b border-zinc-800">
        <div className="flex gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "border-b-2 border-zinc-100 text-zinc-100"
                  : "border-b-2 border-transparent text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="mb-2 flex items-center gap-4">
          {rows.length > 0 && (
            <span className="text-xs text-zinc-500">
              <span className="font-semibold text-zinc-300">
                {rows.length - draftedCount}
              </span>{" "}
              left &middot; {draftedCount} drafted
            </span>
          )}
          {drafted.size > 0 && (
            <button
              onClick={() => setDrafted(new Set())}
              className="text-xs text-zinc-500 hover:text-red-400"
            >
              Reset drafted
            </button>
          )}
          <button
            onClick={() => load(activeTab)}
            disabled={isPending}
            className="text-xs text-zinc-500 hover:text-zinc-300 disabled:opacity-50"
          >
            {isPending ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {rows.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <span>Sort by</span>
          <div className="flex rounded-full border border-zinc-800 bg-zinc-900 p-0.5">
            {(["espn", "fpros"] as RankSource[]).map((source) => (
              <button
                key={source}
                onClick={() => setSortBy(source)}
                className={`rounded-full px-3 py-1 font-medium transition-colors ${
                  sortBy === source
                    ? "bg-zinc-100 text-zinc-900"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {source === "espn" ? "ESPN" : "FantasyPros"}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-900 bg-red-950 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {!error && !isPending && rows.length === 0 && (
        <div className="rounded-lg border border-dashed border-zinc-700 py-16 text-center text-sm text-zinc-500">
          Nothing saved for {TABS.find((t) => t.id === activeTab)?.label} yet.
          Go to Update Rankings, paste your lists, and hit Save.
        </div>
      )}

      <DraftBoardTable
        rows={sortedRows}
        sortBy={sortBy}
        draftedKeys={drafted}
        keyFor={keyFor}
        onToggle={toggleDrafted}
      />
    </div>
  );
}
