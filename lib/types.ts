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
