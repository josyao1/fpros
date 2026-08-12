import { EspnPlayer } from "./types";

const PURE_INT = /^\d+$/;

/**
 * Parses ESPN fantasy football rankings pasted straight from the ESPN
 * draft rankings table. ESPN's markup duplicates the player name on one
 * line (e.g. "Jahmyr GibbsJahmyr Gibbs") followed by the clean name, so we
 * detect and collapse that doubling. Everything else is read positionally:
 * rank, [doubled name], name, team, position, then numeric stat columns
 * until the next rank line.
 */
export function parseEspn(raw: string): EspnPlayer[] {
  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const players: EspnPlayer[] = [];
  let i = 0;

  while (i < lines.length) {
    if (!PURE_INT.test(lines[i])) {
      i++;
      continue;
    }

    const rank = parseInt(lines[i], 10);
    i++;
    if (i >= lines.length) break;

    let name: string;
    const a = lines[i];
    const b = i + 1 < lines.length ? lines[i + 1] : "";
    if (b && a === b + b) {
      name = b;
      i += 2;
    } else {
      name = a;
      i += 1;
    }

    const team = i < lines.length ? lines[i] : "";
    i++;
    const pos = i < lines.length ? lines[i] : "";
    i++;

    const stats: string[] = [];
    while (i < lines.length && !PURE_INT.test(lines[i])) {
      stats.push(lines[i]);
      i++;
    }

    const avgPick = stats.length > 0 ? parseFloat(stats[0]) : NaN;

    players.push({
      rank,
      name,
      team,
      pos,
      avgPick: Number.isNaN(avgPick) ? null : avgPick,
    });
  }

  return players;
}
