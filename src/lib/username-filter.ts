/**
 * Username content filter.
 * Blocks usernames that contain explicit, hateful, or otherwise inappropriate content.
 *
 * Strategy:
 *  1. Strip separators (- _) so "f_u_c_k" is caught.
 *  2. Normalize common leet-speak substitutions (3→e, 4→a, 0→o, etc.).
 *  3. Check for blocked substrings.
 */

// ─── Blocked terms ────────────────────────────────────────────────────────────
// Sexual / explicit
const EXPLICIT = [
  "fuck",
  "fuk",
  "fck",
  "cunt",
  "pussy",
  "vagina",
  "vulva",
  "clitoris",
  "penis",
  "phallus",
  "dildo",
  "anal",
  "anus",
  "asshole",
  "assfuck",
  "asshat",
  "asswipe",
  "blowjob",
  "handjob",
  "rimjob",
  "cumshot",
  "cumslut",
  "masturbat",
  "orgasm",
  "ejaculat",
  "semen",
  "jizz",
  "boner",
  "erection",
  "hardon",
  "sexting",
  "sexshop",
  "pornstar",
  "pornhub",
  "xvideos",
  "nudes",
  "nude",
  "titjob",
  "buttfuck",
  "cocksucker",
  "cumming",
  "creampie",
  "fisting",
  "gangbang",
  "incest",
  "pedophil",
  "paedophil",
  "pedo",
  "bestiality",
  "necrophil",
  "rape",
  "rapist",
  "molest",
  "pervert",
  "sexoffend",
  "deepthroat",
];

// Slurs — racial, ethnic, homophobic, ableist
const SLURS = [
  "nigger",
  "nigga",
  "niga",
  "nigg",
  "kike",
  "chink",
  "spick",
  "spic",
  "wetback",
  "gook",
  "cracker",
  "coon",
  "jigaboo",
  "sambo",
  "darkie",
  "towelhead",
  "sandnigger",
  "zipperhead",
  "beaner",
  "greaseball",
  "wop",
  "polack",
  "kraut",
  "raghead",
  "redskin",
  "squaw",
  "faggot",
  "fggot",
  "dyke",
  "tranny",
  "shemale",
  "retard",
  "tard",
  "spaz",
  "cripple",
  "mongoloid",
];

// Hate / violence
const HATE = [
  "nazi",
  "hitler",
  "heil",
  "kkk",
  "whitepower",
  "whitepride",
  "aryan",
  "genocide",
  "holocaust",
  "terrorist",
  "suicide",
  "killall",
  "killyourself",
  "kys",
  "selfharm",
];

const ALL_BLOCKED = [...EXPLICIT, ...SLURS, ...HATE];

// ─── Leet-speak normalizer ────────────────────────────────────────────────────
function normalize(str: string): string {
  return str
    .toLowerCase()
    .replace(/[-_]/g, "")   // strip separators so f_u_c_k → fuck
    .replace(/0/g, "o")
    .replace(/1/g, "i")
    .replace(/3/g, "e")
    .replace(/4/g, "a")
    .replace(/5/g, "s")
    .replace(/7/g, "t")
    .replace(/8/g, "b")
    .replace(/\$/g, "s")
    .replace(/@/g, "a")
    .replace(/\+/g, "t")
    .replace(/!/g, "i")
    .replace(/\|/g, "i");
}

// ─── Public API ───────────────────────────────────────────────────────────────
export function checkUsername(username: string): { ok: boolean; reason?: string } {
  const normalized = normalize(username);

  for (const term of ALL_BLOCKED) {
    if (normalized.includes(term)) {
      return { ok: false, reason: "Username contains inappropriate content." };
    }
  }

  return { ok: true };
}
