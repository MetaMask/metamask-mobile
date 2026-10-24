/**
 * Script and lexicon guess for a post caption. This is a local heuristic so
 * the Translate control can appear without a network call. It is not a
 * language detector.
 */

const PRIMARY_SUBTAG = /^[a-z]{2,3}/;

const SCRIPT_LANGUAGES: { language: string; pattern: RegExp }[] = [
  { language: 'ja', pattern: /[\u3040-\u30ff]/ },
  { language: 'ko', pattern: /[\uac00-\ud7af]/ },
  { language: 'zh', pattern: /[\u4e00-\u9fff]/ },
  { language: 'ru', pattern: /[\u0400-\u04ff]/ },
  { language: 'ar', pattern: /[\u0600-\u06ff]/ },
  { language: 'el', pattern: /[\u0370-\u03ff]/ },
  { language: 'hi', pattern: /[\u0900-\u097f]/ },
];

/** Words that, together, distinguish a Latin language from English. */
const LATIN_HINTS: Record<string, readonly string[]> = {
  es: [
    ' el ',
    ' la ',
    ' los ',
    ' las ',
    ' una ',
    ' que ',
    ' por ',
    ' esta ',
    ' mercado ',
    ' todavía ',
    ' tesis ',
  ],
  fr: [
    ' le ',
    ' les ',
    ' une ',
    ' des ',
    ' est ',
    ' pas ',
    ' pour ',
    ' dans ',
    ' encore ',
  ],
  de: [' der ', ' die ', ' das ', ' und ', ' nicht ', ' ein ', ' noch '],
  pt: [' não ', ' uma ', ' para ', ' com ', ' ainda ', ' mercado '],
};

const LATIN_HINT_THRESHOLD = 2;
const ENGLISH_MIN_LETTERS = 12;
const ENGLISH_MIN_WORDS = 3;

/** `en-US` and `EN_us` both become `en`. Empty input becomes `en`. */
export const normalizeLocale = (locale: string | null | undefined): string => {
  const match = (locale ?? '').trim().toLowerCase().match(PRIMARY_SUBTAG);
  return match?.[0] ?? 'en';
};

const scoreLatinLanguage = (text: string): string | null => {
  const padded = ` ${text.toLowerCase().replace(/\s+/g, ' ')} `;
  let bestLanguage: string | null = null;
  let bestScore = 0;

  for (const [language, hints] of Object.entries(LATIN_HINTS)) {
    const score = hints.reduce(
      (total, hint) => total + (padded.includes(hint) ? 1 : 0),
      0,
    );
    if (score > bestScore) {
      bestLanguage = language;
      bestScore = score;
    }
  }

  if (bestLanguage && bestScore >= LATIN_HINT_THRESHOLD) {
    return bestLanguage;
  }

  if (/[ñ¿¡]/i.test(text)) {
    return 'es';
  }

  const letters = text.match(/[A-Za-zÀ-ÿ]/g)?.length ?? 0;
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  if (letters >= ENGLISH_MIN_LETTERS && words >= ENGLISH_MIN_WORDS) {
    return 'en';
  }

  return null;
};

/**
 * Best-effort language of a caption. `null` means the text is too short or
 * too ambiguous to offer translation.
 */
export const detectPostLanguage = (text: string): string | null => {
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }

  for (const { language, pattern } of SCRIPT_LANGUAGES) {
    if (pattern.test(trimmed)) {
      return language;
    }
  }

  return scoreLatinLanguage(trimmed);
};

/** True when the caption looks like a language other than the user's. */
export const postNeedsTranslation = (
  text: string,
  locale: string | null | undefined,
): boolean => {
  const detected = detectPostLanguage(text);
  if (!detected) {
    return false;
  }
  return detected !== normalizeLocale(locale);
};
