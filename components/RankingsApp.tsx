"use client";

import { useEffect, useMemo, useState } from "react";
import PasteBox from "./PasteBox";
import ComparisonTable from "./ComparisonTable";
import { parseEspn } from "@/lib/parseEspn";
import { parseFpros } from "@/lib/parseFpros";
import { buildComparison } from "@/lib/match";
import { ScoringFormat, TabState } from "@/lib/types";

const TABS: { id: ScoringFormat; label: string }[] = [
  { id: "ppr", label: "PPR" },
  { id: "half-ppr", label: "Half PPR" },
];

const EMPTY_STATE: TabState = { espnText: "", fprosText: "" };

function storageKey(tab: ScoringFormat) {
  return `ff-rankings-compare:${tab}`;
}

function loadTabState(tab: ScoringFormat): TabState {
  if (typeof window === "undefined") return EMPTY_STATE;
  try {
    const raw = window.localStorage.getItem(storageKey(tab));
    if (!raw) return EMPTY_STATE;
    const parsed = JSON.parse(raw);
    return {
      espnText: parsed.espnText ?? "",
      fprosText: parsed.fprosText ?? "",
    };
  } catch {
    return EMPTY_STATE;
  }
}

export default function RankingsApp() {
  const [activeTab, setActiveTab] = useState<ScoringFormat>("ppr");
  const [tabStates, setTabStates] = useState<Record<ScoringFormat, TabState>>({
    ppr: EMPTY_STATE,
    "half-ppr": EMPTY_STATE,
  });
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setTabStates({
      ppr: loadTabState("ppr"),
      "half-ppr": loadTabState("half-ppr"),
    });
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(
      storageKey(activeTab),
      JSON.stringify(tabStates[activeTab])
    );
  }, [tabStates, activeTab, hydrated]);

  const current = tabStates[activeTab];

  const updateCurrent = (patch: Partial<TabState>) => {
    setTabStates((prev) => ({
      ...prev,
      [activeTab]: { ...prev[activeTab], ...patch },
    }));
  };

  const espnPlayers = useMemo(
    () => parseEspn(current.espnText),
    [current.espnText]
  );
  const fprosPlayers = useMemo(
    () => parseFpros(current.fprosText),
    [current.fprosText]
  );
  const rows = useMemo(
    () => buildComparison(espnPlayers, fprosPlayers),
    [espnPlayers, fprosPlayers]
  );

  const matchedCount = rows.filter((r) => r.fprosRank !== null).length;
  const unmatchedCount = rows.length - matchedCount;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-10">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          ESPN vs. FantasyPros Rankings
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Paste ESPN ADP rankings and FantasyPros consensus rankings below.
          Players stay ordered by ESPN rank, with their FantasyPros rank and
          the gap between the two shown alongside &mdash; green means
          FantasyPros likes them more than ESPN&apos;s ADP suggests (value),
          red means ESPN is drafting them ahead of FantasyPros&apos; opinion
          (reach).
        </p>
      </header>

      <div className="flex gap-1 border-b border-zinc-200 dark:border-zinc-800">
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

      <div className="flex flex-col gap-4 sm:flex-row">
        <PasteBox
          label="ESPN Rankings"
          value={current.espnText}
          onChange={(v) => updateCurrent({ espnText: v })}
          count={espnPlayers.length}
          placeholder={"Paste the ESPN draft rankings table here..."}
        />
        <PasteBox
          label="FantasyPros Rankings"
          value={current.fprosText}
          onChange={(v) => updateCurrent({ fprosText: v })}
          count={fprosPlayers.length}
          placeholder={"Paste the FantasyPros consensus rankings here..."}
        />
      </div>

      {rows.length > 0 && (
        <div className="flex flex-wrap gap-4 text-xs text-zinc-500 dark:text-zinc-400">
          <span>{espnPlayers.length} ESPN players parsed</span>
          <span>{fprosPlayers.length} FantasyPros players parsed</span>
          <span>{matchedCount} matched</span>
          {unmatchedCount > 0 && (
            <span className="text-amber-600 dark:text-amber-400">
              {unmatchedCount} unmatched
            </span>
          )}
        </div>
      )}

      <ComparisonTable rows={rows} />
    </div>
  );
}
