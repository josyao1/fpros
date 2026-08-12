export interface EspnPlayer {
  rank: number;
  name: string;
  team: string;
  pos: string;
  avgPick: number | null;
}

export interface FprosPlayer {
  rank: number;
  name: string;
  team: string;
  pos: string;
}

export interface ComparisonRow {
  espnRank: number;
  name: string;
  team: string;
  pos: string;
  avgPick: number | null;
  fprosRank: number | null;
  diff: number | null;
}

export type ScoringFormat = "ppr" | "half-ppr";

export interface TabState {
  espnText: string;
  fprosText: string;
}

export interface PlayerRankingRow {
  normalized_name: string;
  player_name: string;
  team: string | null;
  pos: string | null;
  scoring_format: ScoringFormat;
  espn_rank: number;
  fpros_rank: number | null;
  avg_pick: number | null;
  diff: number | null;
  updated_at: string;
}
