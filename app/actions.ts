"use server";

import { getSupabase } from "@/lib/supabase";
import { normalizeName } from "@/lib/match";
import { ComparisonRow, PlayerRankingRow, ScoringFormat } from "@/lib/types";

const MAX_ROWS = 1000;

export async function saveRankings(
  scoringFormat: ScoringFormat,
  rows: ComparisonRow[]
): Promise<{ count: number }> {
  if (rows.length === 0) return { count: 0 };
  if (rows.length > MAX_ROWS) {
    throw new Error(`Too many players in one save (max ${MAX_ROWS}).`);
  }

  const payload = rows.map((r) => ({
    normalized_name: normalizeName(r.name),
    player_name: r.name,
    team: r.team || null,
    pos: r.pos || null,
    scoring_format: scoringFormat,
    espn_rank: r.espnRank,
    fpros_rank: r.fprosRank,
    avg_pick: r.avgPick,
    diff: r.diff,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await getSupabase()
    .from("player_rankings")
    .upsert(payload, { onConflict: "normalized_name,scoring_format" });

  if (error) throw new Error(error.message);
  return { count: payload.length };
}

export async function getRankings(
  scoringFormat: ScoringFormat
): Promise<PlayerRankingRow[]> {
  const { data, error } = await getSupabase()
    .from("player_rankings")
    .select("*")
    .eq("scoring_format", scoringFormat)
    .order("espn_rank", { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}
