import { ComparisonRow, EspnPlayer, FprosPlayer } from "./types";

const SUFFIXES = /\b(jr|sr|ii|iii|iv|v)\b/g;
const DST_WORDS = /\b(defense|dst|d st|special teams)\b/g;

export function normalizeName(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[.'']/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(SUFFIXES, "")
    .replace(DST_WORDS, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildComparison(
  espn: EspnPlayer[],
  fpros: FprosPlayer[]
): ComparisonRow[] {
  const byName = new Map<string, FprosPlayer>();
  const byTeamPos = new Map<string, FprosPlayer>();

  for (const p of fpros) {
    byName.set(normalizeName(p.name), p);
    const isDst = /^(dst|d\/st|def)$/i.test(p.pos);
    if (isDst) byTeamPos.set(`${p.team}-DST`, p);
  }

  return espn.map((e) => {
    const isDst = /^(dst|d\/st|def)$/i.test(e.pos);
    let match =
      byName.get(normalizeName(e.name)) ??
      (isDst ? byTeamPos.get(`${e.team}-DST`) : undefined) ??
      null;

    const fprosRank = match ? match.rank : null;
    const diff = fprosRank !== null ? e.rank - fprosRank : null;

    return {
      espnRank: e.rank,
      name: e.name,
      team: e.team,
      pos: e.pos,
      avgPick: e.avgPick,
      fprosRank,
      diff,
    };
  });
}
