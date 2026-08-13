import "server-only";
import { normalizeName } from "./match";

const SEARCH_URL = "https://site.web.api.espn.com/apis/common/v3/search";

interface EspnSearchItem {
  id: string;
  displayName: string;
  headshot?: { href: string };
  teamRelationships?: { core?: { abbreviation?: string } }[];
}

async function searchEspnPlayer(name: string): Promise<EspnSearchItem[]> {
  const url = `${SEARCH_URL}?region=us&lang=en&query=${encodeURIComponent(
    name
  )}&type=player&limit=10`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return [];
    const data = await res.json();
    return data.items ?? [];
  } catch {
    return [];
  }
}

/**
 * Resolves a player's ESPN athlete ID by name, disambiguating same-name
 * players (e.g. two "Josh Allen"s in the NFL) by cross-checking the team
 * code we already parsed against each search result's current team.
 */
async function resolveEspnId(name: string, team: string): Promise<string | null> {
  const results = await searchEspnPlayer(name);
  if (results.length === 0) return null;

  const target = normalizeName(name);
  const nameMatches = results.filter((r) => normalizeName(r.displayName) === target);
  const pool = nameMatches.length > 0 ? nameMatches : results;

  const teamMatch = pool.find(
    (r) => r.teamRelationships?.[0]?.core?.abbreviation?.toUpperCase() === team.toUpperCase()
  );

  return (teamMatch ?? pool[0]).id;
}

/**
 * Resolves ESPN IDs for a batch of players with limited concurrency, so we
 * don't fire hundreds of simultaneous requests at ESPN's search endpoint.
 * Returns a map keyed by normalized player name.
 */
export async function resolveEspnIdsBatch(
  players: { name: string; team: string }[],
  concurrency = 8
): Promise<Map<string, string | null>> {
  const results = new Map<string, string | null>();
  let index = 0;

  async function worker() {
    while (index < players.length) {
      const player = players[index++];
      try {
        results.set(normalizeName(player.name), await resolveEspnId(player.name, player.team));
      } catch {
        results.set(normalizeName(player.name), null);
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, players.length) }, worker)
  );

  return results;
}
