import { EspnPlayer } from "./types";
import { normalizeName } from "./match";

const PURE_INT = /^\d+$/;
const DECIMAL = /^-?\d+\.\d+$/;

const TEAMS = new Set([
  "ARI", "ATL", "BAL", "BUF", "CAR", "CHI", "CIN", "CLE", "DAL", "DEN",
  "DET", "GB", "HOU", "IND", "JAX", "KC", "LAC", "LAR", "LV", "MIA",
  "MIN", "NE", "NO", "NYG", "NYJ", "PHI", "PIT", "SEA", "SF", "TB",
  "TEN", "WAS", "WSH", "FA",
]);

const POSITIONS = new Set(["QB", "RB", "WR", "TE", "K", "DST", "D/ST", "DEF", "FLEX"]);

interface Block {
  name: string;
  team: string;
  pos: string;
  nextIndex: number;
}

/**
 * Tries to read a player block starting at `idx`: ESPN duplicates the name
 * on one line (e.g. "Jahmyr GibbsJahmyr Gibbs") right before the clean name
 * in some paste formats, so that doubling is detected and collapsed. A
 * block is only confirmed if it's followed by a recognized team code and
 * then a recognized position code — that's the one structural signal that
 * holds across every ESPN paste layout we've seen (with or without rank
 * numbers or stat columns).
 */
function tryBlockAt(lines: string[], idx: number): Block | null {
  if (idx >= lines.length) return null;

  const a = lines[idx];
  const b = idx + 1 < lines.length ? lines[idx + 1] : "";
  let nameIdx: number;
  let teamIdx: number;
  if (b && a === b + b) {
    nameIdx = idx + 1;
    teamIdx = idx + 2;
  } else {
    nameIdx = idx;
    teamIdx = idx + 1;
  }

  const posIdx = teamIdx + 1;
  if (posIdx >= lines.length) return null;

  const team = lines[teamIdx];
  const pos = lines[posIdx];
  if (!TEAMS.has(team.toUpperCase())) return null;
  if (!POSITIONS.has(pos.toUpperCase())) return null;

  return { name: lines[nameIdx], team, pos, nextIndex: posIdx + 1 };
}

/**
 * Parses ESPN fantasy football rankings pasted from any ESPN rankings/
 * players table. Handles both the full draft-rankings paste (rank number +
 * stat columns) and the more compact players-list paste (just repeating
 * name/team/position blocks, no rank numbers at all). When no rank number
 * precedes a block, players are numbered by the order they appear in the
 * paste.
 */
export function parseEspn(raw: string): EspnPlayer[] {
  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const players: EspnPlayer[] = [];
  let i = 0;
  let autoRank = 0;

  while (i < lines.length) {
    let explicitRank: number | null = null;
    let blockStart = i;

    if (PURE_INT.test(lines[i])) {
      const candidateBlock = tryBlockAt(lines, i + 1);
      if (candidateBlock) {
        explicitRank = parseInt(lines[i], 10);
        blockStart = i + 1;
      }
    }

    const block = tryBlockAt(lines, blockStart);
    if (!block) {
      i++;
      continue;
    }

    let avgPick: number | null = null;
    let next = block.nextIndex;
    if (next < lines.length && DECIMAL.test(lines[next])) {
      avgPick = parseFloat(lines[next]);
      next++;
    }

    autoRank++;
    players.push({
      rank: explicitRank ?? autoRank,
      name: block.name,
      team: block.team,
      pos: block.pos,
      avgPick,
    });
    i = next;
  }

  // Chunked pastes (1-50, then 51-100, ...) can land out of order, overlap,
  // or (in the rank-less compact format) get accidentally pasted twice. Sort
  // by rank and dedupe by normalized name (keeping the first-seen copy) so
  // the base order stays correct regardless of how the paste was assembled.
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
