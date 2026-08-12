import { FprosPlayer } from "./types";
import { normalizeName } from "./match";
import { cleanLines, stripInjurySuffix } from "./injury";

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
  const lines = cleanLines(raw);

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
      // An injury tag can land inside the captured name (e.g. "Name Q")
      // rather than at the very end of the line, since "(TEAM)" follows it.
      const name = stripInjurySuffix(match[1].trim());
      const team = match[2].toUpperCase();

      let pos = "";
      const next = i + 1 < lines.length ? lines[i + 1] : "";
      const posMatch = next.match(POS_PREFIX);
      if (posMatch) pos = posMatch[1].toUpperCase();

      players.push({ rank: lastRank, name, team, pos });
      lastRank = null;
    }
  }

  // Same reasoning as parseEspn: chunked pastes can land out of order,
  // overlap, or get accidentally re-pasted, so normalize by sorting on rank
  // and deduping on normalized name.
  const seen = new Set<string>();
  return players
    .filter((p) => {
      const key = normalizeName(p.name);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => a.rank - b.rank);
}
