"use client";

import {
  Dispatch,
  SetStateAction,
  useEffect,
  useMemo,
  useRef,
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

const POS_ORDER = ["QB", "RB", "WR", "TE", "FLEX", "K", "DST", "D/ST", "DEF"];

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
type Density = "normal" | "compact";
const DENSITY_KEY = "ff-density";

function loadDensity(): Density {
  if (typeof window === "undefined") return "normal";
  return window.localStorage.getItem(DENSITY_KEY) === "compact"
    ? "compact"
    : "normal";
}

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
  const [linkedKey, setLinkedKey] = useState<string | null>(null);
  const [density, setDensity] = useState<Density>("normal");
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    setDensity(loadDensity());
  }, []);

  useEffect(() => {
    window.localStorage.setItem(DENSITY_KEY, density);
  }, [density]);

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

  const [query, setQuery] = useState("");
  const [posFilter, setPosFilter] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Typing anywhere on the page (not already inside a text field) jumps
  // straight into search, so you can just start typing a player's name
  // mid-draft without having to click the box first.
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key.length !== 1) return;
      const target = e.target as HTMLElement | null;
      const isEditable =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;
      if (isEditable) return;
      searchInputRef.current?.focus();
      setQuery((prev) => prev + e.key);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const availablePositions = useMemo(() => {
    const present = new Set(
      rows.map((r) => r.pos.toUpperCase()).filter(Boolean)
    );
    const ordered = POS_ORDER.filter((p) => present.has(p));
    const extras = Array.from(present)
      .filter((p) => !POS_ORDER.includes(p))
      .sort();
    return [...ordered, ...extras];
  }, [rows]);

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      const matchesQuery =
        !q ||
        r.name.toLowerCase().includes(q) ||
        r.team.toLowerCase().includes(q) ||
        r.pos.toLowerCase().includes(q);
      const matchesPos = !posFilter || r.pos.toUpperCase() === posFilter;
      return matchesQuery && matchesPos;
    });
  }, [rows, query, posFilter]);

  const espnSorted = useMemo(
    () => sortComparison(filteredRows, "espn"),
    [filteredRows]
  );
  const fprosSorted = useMemo(
    () => sortComparison(filteredRows, "fpros"),
    [filteredRows]
  );
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
          <div className="relative">
            <button
              onClick={() => setSettingsOpen((v) => !v)}
              aria-label="Settings"
              aria-expanded={settingsOpen}
              className={`flex h-6 w-6 items-center justify-center rounded-full border border-dashed transition-colors ${
                settingsOpen
                  ? "border-[#e8c257] text-[#e8c257]"
                  : "border-[#f5f0e1]/25 text-[#a9bcac] hover:text-[#f5f0e1]"
              }`}
            >
              <svg
                className="h-3.5 w-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
            {settingsOpen && (
              <>
                <button
                  aria-label="Close settings"
                  onClick={() => setSettingsOpen(false)}
                  className="fixed inset-0 z-10 cursor-default"
                />
                <div className="absolute right-0 z-20 mt-2 w-48 rounded-lg border border-dashed border-[#f5f0e1]/25 bg-[#1a3423] p-3 text-left shadow-lg">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#6f8375]">
                    Row density
                  </div>
                  <p className="mt-1 text-[11px] text-[#a9bcac]">
                    Zoom out to thin rows and columns so more fits on screen.
                  </p>
                  <div className="mt-2 flex gap-1 rounded-full border border-dashed border-[#f5f0e1]/25 p-0.5">
                    {(
                      [
                        { id: "normal", label: "Normal" },
                        { id: "compact", label: "Compact" },
                      ] as { id: Density; label: string }[]
                    ).map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => setDensity(opt.id)}
                        className={`flex-1 rounded-full px-2 py-1 text-xs font-bold transition-colors ${
                          density === opt.id
                            ? "bg-[#e8c257] text-[#0f2116]"
                            : "text-[#a9bcac] hover:text-[#f5f0e1]"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {rows.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full max-w-xs">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6f8375]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search players, team..."
              className="w-full rounded-full border border-dashed border-[#f5f0e1]/25 bg-[#1a3423]/60 py-2 pl-9 pr-8 text-sm text-[#f5f0e1] placeholder:text-[#6f8375] outline-none focus:border-[#e8c257]"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6f8375] hover:text-[#f5f0e1]"
              >
                ✕
              </button>
            )}
          </div>

          {availablePositions.length > 0 && (
            <div className="flex flex-wrap gap-1">
              <button
                onClick={() => setPosFilter(null)}
                className={`rounded-full px-3 py-1 text-xs font-bold transition-colors ${
                  posFilter === null
                    ? "bg-[#e8c257] text-[#0f2116]"
                    : "border border-dashed border-[#f5f0e1]/25 text-[#a9bcac] hover:text-[#f5f0e1]"
                }`}
              >
                All
              </button>
              {availablePositions.map((pos) => (
                <button
                  key={pos}
                  onClick={() => setPosFilter(posFilter === pos ? null : pos)}
                  className={`rounded-full px-3 py-1 text-xs font-bold transition-colors ${
                    posFilter === pos
                      ? "bg-[#e8c257] text-[#0f2116]"
                      : "border border-dashed border-[#f5f0e1]/25 text-[#a9bcac] hover:text-[#f5f0e1]"
                  }`}
                >
                  {pos}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

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

      {!error && !isPending && rows.length > 0 && filteredRows.length === 0 && (
        <div className="rounded-lg border-2 border-dashed border-[#f5f0e1]/25 py-16 text-center text-sm text-[#a9bcac]">
          No players match{query ? ` "${query}"` : ""}
          {posFilter ? ` in ${posFilter}` : ""}.
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
          compact={density === "compact"}
        />
      ) : (
        <div className="relative mx-auto grid w-full max-w-5xl grid-cols-2 gap-2 sm:gap-3">
          <div className="pointer-events-none absolute inset-y-10 left-1/2 block w-0 border-l-2 border-dashed border-[#f5f0e1]/20">
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
              linkedKey={linkedKey}
              setLinkedKey={setLinkedKey}
              showSecondaryRank={false}
              compact={density === "compact"}
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
              linkedKey={linkedKey}
              setLinkedKey={setLinkedKey}
              showSecondaryRank={false}
              compact={density === "compact"}
            />
          </div>
        </div>
      )}
    </div>
  );
}
