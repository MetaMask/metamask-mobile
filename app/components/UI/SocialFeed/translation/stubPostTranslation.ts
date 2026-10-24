import { normalizeLocale } from './postLanguage';

/**
 * Local stand-in for a translation provider. Known captions return a fixed
 * phrase. Anything else is tagged with the target language so the control is
 * visible, and is not presented as a real translation.
 *
 * The stub never calls the network. A production provider should skip the
 * request when the network tier is `NONE` and wait for an explicit tap on
 * `SLOW_CELLULAR`.
 */
const PHRASES: Record<string, Partial<Record<string, string>>> = {
  'Leverage is a lifestyle.': {
    es: 'El apalancamiento es un estilo de vida.',
    ja: 'レバレッジは生き方だ。',
    fr: "L'effet de levier est un mode de vie.",
    de: 'Hebel ist ein Lebensstil.',
  },
  'Risk managed. Mostly.': {
    es: 'Riesgo controlado. En su mayor parte.',
    ja: 'リスクは管理した。だいたい。',
    fr: 'Risque géré. En grande partie.',
  },
  'El mercado todavía no descuenta esta tesis.': {
    en: 'The market still has not priced in this thesis.',
    ja: '市場はこのテーゼをまだ織り込んでいない。',
  },
  'このトレードはまだ織り込まれていない。': {
    en: 'This trade is not priced in yet.',
    es: 'Esta operación todavía no está descontada.',
  },
};

export interface StubPostTranslation {
  text: string;
  /** True when the stub had a prepared phrase for this caption. */
  matchedPhrase: boolean;
}

export const translatePost = (
  text: string,
  targetLanguage: string,
): StubPostTranslation => {
  const target = normalizeLocale(targetLanguage);
  const phrase = PHRASES[text.trim()]?.[target];
  if (phrase) {
    return { text: phrase, matchedPhrase: true };
  }

  return { text: `[${target}] ${text}`, matchedPhrase: false };
};
