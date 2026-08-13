"use server";

import { getSupabase } from "@/lib/supabase";
import { normalizeName } from "@/lib/match";
import { resolveEspnIdsBatch } from "@/lib/espn";
import { ComparisonRow, PlayerRankingRow, ScoringFormat } from "@/lib/types";

const MAX_ROWS = 1000;

/**
 * Looks up each player's ESPN athlete ID (used to build their headshot
 * URL). Already-resolved players are read back from the DB first (any
 * scoring format) so a re-save doesn't re-hit ESPN's search API for
 * players we've already matched.
 */
async function resolveEspnIds(
  rows: ComparisonRow[]
): Promise<Map<string, string | null>> {
  const byNormalizedName = new Map(rows.map((r) => [normalizeName(r.name), r]));
  const names = Array.from(byNormalizedName.keys());
  const resolved = new Map<string, string | null>();

  const { data: existing } = await getSupabase()
    .from("player_rankings")
    .select("normalized_name, espn_id")
    .in("normalized_name", names)
    .not("espn_id", "is", null);

  for (const row of existing ?? []) {
    resolved.set(row.normalized_name, row.espn_id);
  }

  const unresolved = names
    .filter((n) => !resolved.has(n))
    .map((n) => {
      const r = byNormalizedName.get(n)!;
      return { name: r.name, team: r.team };
    });

  if (unresolved.length > 0) {
    const freshlyResolved = await resolveEspnIdsBatch(unresolved);
    for (const [name, id] of freshlyResolved) resolved.set(name, id);
  }

  return resolved;
}

export async function saveRankings(
  scoringFormat: ScoringFormat,
  rows: ComparisonRow[]
): Promise<{ count: number }> {
  if (rows.length === 0) return { count: 0 };
  if (rows.length > MAX_ROWS) {
    throw new Error(`Too many players in one save (max ${MAX_ROWS}).`);
  }

  const espnIds = await resolveEspnIds(rows);

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
    espn_id: espnIds.get(normalizeName(r.name)) ?? null,
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
