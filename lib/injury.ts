// Injury/status designations ESPN and FantasyPros stick next to a player's
// name (as their own line, or a trailing suffix on the name/team/pos line).
// They carry no identifying info, so they're stripped before parsing.
const INJURY_TAGS = [
  "Q", "O", "D", "IR", "PUP", "SUSP", "NFI", "DNP", "OUT", "GTD", "DTD",
];

const TAG_ALTERNATION = INJURY_TAGS.join("|");
const TAG_SUFFIX_RE = new RegExp(`\\s+(${TAG_ALTERNATION})$`, "i");
const TAG_ONLY_RE = new RegExp(`^(${TAG_ALTERNATION})$`, "i");

export function isInjuryTagOnly(line: string): boolean {
  return TAG_ONLY_RE.test(line.trim());
}

export function stripInjurySuffix(line: string): string {
  return line.replace(TAG_SUFFIX_RE, "").trim();
}

/** Splits raw pasted text into cleaned, non-empty lines with injury tags removed. */
export function cleanLines(raw: string): string[] {
  return raw
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .filter((l) => !isInjuryTagOnly(l))
    .map((l) => stripInjurySuffix(l));
}
