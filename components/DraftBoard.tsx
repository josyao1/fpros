"use client";

import {
  Dispatch,
  SetStateAction,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
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
    espnId: row.espn_id,
  };
}

function draftedStorageKey(tab: ScoringFormat) {
  return `ff-drafted:${tab}`;
}

function starredStorageKey(tab: ScoringFormat) {
  return `ff-starred:${tab}`;
}

function loadStoredSet(key: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw));
  } catch {
    return new Set();
  }
}

type ViewMode = "single" | "side-by-side";

export default function DraftBoard() {
  const [activeTab, setActiveTab] = useState<ScoringFormat>("ppr");
  const [rows, setRows] = useState<ComparisonRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [drafted, setDrafted] = useState<Set<string>>(new Set());
  const [starred, setStarred] = useState<Set<string>>(new Set());
  const [hydrated, setHydrated] = useState(false);
  const [sortBy, setSortBy] = useState<RankSource>("espn");
  const [viewMode, setViewMode] = useState<ViewMode>("single");
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

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
    setDrafted(loadStoredSet(draftedStorageKey(activeTab)));
    setStarred(loadStoredSet(starredStorageKey(activeTab)));
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

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(
      starredStorageKey(activeTab),
      JSON.stringify(Array.from(starred))
    );
  }, [starred, activeTab, hydrated]);

  const keyFor = (row: ComparisonRow) => normalizeName(row.name);

  const toggleSet = (
    setter: Dispatch<SetStateAction<Set<string>>>,
    key: string
  ) => {
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleDrafted = (key: string) => toggleSet(setDrafted, key);
  const toggleStar = (key: string) => toggleSet(setStarred, key);

  const draftedCount = useMemo(
    () => rows.filter((r) => drafted.has(keyFor(r))).length,
    [rows, drafted]
  );

  const espnSorted = useMemo(() => sortComparison(rows, "espn"), [rows]);
  const fprosSorted = useMemo(() => sortComparison(rows, "fpros"), [rows]);
  const sortedRows = sortBy === "espn" ? espnSorted : fprosSorted;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-10">
      <header className="flex flex-col gap-1">
        <div className="text-[.7rem] font-bold uppercase tracking-[.18em] text-[#e8c257]">
          Week 0 &middot; Pre-Draft
        </div>
        <h1 className="mt-1 inline-block w-fit border-b-2 border-dashed border-[#e8c257]/70 pb-2 text-3xl font-extrabold text-[#f5f0e1]">
          Draft Board
        </h1>
        <p className="mt-2 max-w-xl text-sm text-[#a9bcac]">
          Last saved rankings from Update Rankings. Click a player or their
          checkbox to mark them drafted.
        </p>
      </header>

      <div className="flex items-center justify-between border-b-2 border-dashed border-[#f5f0e1]/25 pb-1">
        <div className="flex gap-2">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-full px-4 py-1.5 text-sm font-bold transition-colors ${
                activeTab === tab.id
                  ? "border border-[#e8c257] bg-[#e8c257] text-[#0f2116]"
                  : "border border-dashed border-[#f5f0e1]/30 text-[#a9bcac] hover:text-[#f5f0e1]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="mb-2 flex items-center gap-4">
          {rows.length > 0 && (
            <span className="text-xs text-[#a9bcac]">
              <span className="font-bold text-[#f5f0e1]">
                {rows.length - draftedCount}
              </span>{" "}
              left &middot; {draftedCount} drafted
            </span>
          )}
          {drafted.size > 0 && (
            <button
              onClick={() => setDrafted(new Set())}
              className="text-xs text-[#a9bcac] hover:text-[#e58b84]"
            >
              Reset drafted
            </button>
          )}
          <button
            onClick={() => load(activeTab)}
            disabled={isPending}
            className="text-xs text-[#a9bcac] hover:text-[#f5f0e1] disabled:opacity-50"
          >
            {isPending ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {rows.length > 0 && (
        <div className="flex flex-wrap items-center gap-4 text-xs text-[#a9bcac]">
          <div className="flex items-center gap-2">
            <span>View</span>
            <div className="flex gap-1 rounded-full border border-dashed border-[#f5f0e1]/25 p-0.5">
              {(
                [
                  { id: "single", label: "Single" },
                  { id: "side-by-side", label: "Side by Side" },
                ] as { id: ViewMode; label: string }[]
              ).map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => setViewMode(mode.id)}
                  className={`rounded-full px-3 py-1 font-bold transition-colors ${
                    viewMode === mode.id
                      ? "bg-[#e8c257] text-[#0f2116]"
                      : "text-[#a9bcac] hover:text-[#f5f0e1]"
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>

          {viewMode === "single" && (
            <div className="flex items-center gap-2">
              <span>Sort by</span>
              <div className="flex gap-1 rounded-full border border-dashed border-[#f5f0e1]/25 p-0.5">
                {(["espn", "fpros"] as RankSource[]).map((source) => (
                  <button
                    key={source}
                    onClick={() => setSortBy(source)}
                    className={`rounded-full px-3 py-1 font-bold transition-colors ${
                      sortBy === source
                        ? "bg-[#e8c257] text-[#0f2116]"
                        : "text-[#a9bcac] hover:text-[#f5f0e1]"
                    }`}
                  >
                    {source === "espn" ? "ESPN" : "FantasyPros"}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-[#e58b84]/50 bg-[#e58b84]/10 px-4 py-3 text-sm text-[#e58b84]">
          {error}
        </div>
      )}

      {!error && !isPending && rows.length === 0 && (
        <div className="rounded-lg border-2 border-dashed border-[#f5f0e1]/25 py-16 text-center text-sm text-[#a9bcac]">
          Nothing saved for {TABS.find((t) => t.id === activeTab)?.label} yet.
          Go to Update Rankings, paste your lists, and hit Save.
        </div>
      )}

      {viewMode === "single" ? (
        <DraftBoardTable
          rows={sortedRows}
          sortBy={sortBy}
          draftedKeys={drafted}
          starredKeys={starred}
          keyFor={keyFor}
          onToggle={toggleDrafted}
          onToggleStar={toggleStar}
        />
      ) : (
        <div className="relative mx-auto grid w-full max-w-5xl grid-cols-1 gap-3 md:grid-cols-2">
          <div className="pointer-events-none absolute inset-y-10 left-1/2 hidden w-0 border-l-2 border-dashed border-[#f5f0e1]/20 md:block">
            <span className="absolute -left-2.5 -top-6 text-[.65rem] font-extrabold text-[#6f8375]">
              50
            </span>
          </div>
          <div className="flex flex-col gap-2">
            <h2 className="text-xs font-extrabold uppercase tracking-wide text-[#f5f0e1]">
              ESPN Order
            </h2>
            <DraftBoardTable
              rows={espnSorted}
              sortBy="espn"
              draftedKeys={drafted}
              starredKeys={starred}
              keyFor={keyFor}
              onToggle={toggleDrafted}
              onToggleStar={toggleStar}
              hoveredKey={hoveredKey}
              setHoveredKey={setHoveredKey}
              showSecondaryRank={false}
            />
          </div>
          <div className="flex flex-col gap-2">
            <h2 className="text-xs font-extrabold uppercase tracking-wide text-[#f5f0e1]">
              FantasyPros Order
            </h2>
            <DraftBoardTable
              rows={fprosSorted}
              sortBy="fpros"
              draftedKeys={drafted}
              starredKeys={starred}
              keyFor={keyFor}
              onToggle={toggleDrafted}
              onToggleStar={toggleStar}
              hoveredKey={hoveredKey}
              setHoveredKey={setHoveredKey}
              showSecondaryRank={false}
            />
          </div>
        </div>
      )}
    </div>
  );
}
