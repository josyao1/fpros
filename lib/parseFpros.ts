import { FprosPlayer } from "./types";

const PURE_INT = /^\d+$/;
const NAME_TEAM = /^(.+?)\s*\(([A-Za-z]{2,4})\)$/;
const POS_PREFIX = /^([A-Za-z]+)\d+/;

/**
 * Parses FantasyPros consensus rankings pasted straight from their rankings
 * page. The layout is noisy (tier headers, star-rating tooltip text, an
 * ECR-vs-ADP number that can itself look like a rank), so rather than
 * counting lines we anchor on two unambiguous signals: a line that is
 * purely digits (a rank) and a line shaped like "Player Name (TEAM)".
 * Position is pulled from the following line, e.g. "RB1    6    ...".
 */
export function parseFpros(raw: string): FprosPlayer[] {
  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const players: FprosPlayer[] = [];
  let lastRank: number | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (PURE_INT.test(line)) {
      lastRank = parseInt(line, 10);
      continue;
    }

    const match = line.match(NAME_TEAM);
    if (match && lastRank !== null) {
      const name = match[1].trim();
      const team = match[2].toUpperCase();

      let pos = "";
      const next = i + 1 < lines.length ? lines[i + 1] : "";
      const posMatch = next.match(POS_PREFIX);
      if (posMatch) pos = posMatch[1].toUpperCase();

      players.push({ rank: lastRank, name, team, pos });
      lastRank = null;
    }
  }

  // Same reasoning as parseEspn: chunked pastes can land out of order or
  // overlap, so normalize by sorting on rank and dropping duplicate ranks.
  const seen = new Set<number>();
  return players
    .filter((p) => {
      if (seen.has(p.rank)) return false;
      seen.add(p.rank);
      return true;
    })
    .sort((a, b) => a.rank - b.rank);
}
