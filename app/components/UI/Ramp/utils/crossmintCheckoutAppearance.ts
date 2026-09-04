import type { Colors } from '../../../../util/theme/models';

/**
 * Theming for Crossmint's embedded checkout, merged into the URL the on-ramp
 * API returns.
 *
 * The API owns `appearance.rules` (what is hidden) but knows nothing of the
 * app's theme or language, so `variables` and `locale` are merged in here,
 * preserving whatever the API already set. Their whole surface is
 * `{ fonts, variables, rules }` — no control over layout or element order.
 */

/** Locales the embedded checkout ships translations for. */
const SUPPORTED_LOCALES = [
  'en-US',
  'es-ES',
  'fr-FR',
  'ko-KR',
  'de-DE',
  'it-IT',
  'ja-JP',
  'pt-PT',
  'ru-RU',
  'th-TH',
  'tr-TR',
  'uk-UA',
  'vi-VN',
  'zh-CN',
  'zh-TW',
];

const DEFAULT_LOCALE = 'en-US';

/** Languages in common; the rest (el, hi, id, tl) fall back to English. */
const LOCALE_BY_LANGUAGE: Record<string, string> = {
  de: 'de-DE',
  en: 'en-US',
  es: 'es-ES',
  fr: 'fr-FR',
  it: 'it-IT',
  ja: 'ja-JP',
  ko: 'ko-KR',
  pt: 'pt-PT',
  ru: 'ru-RU',
  th: 'th-TH',
  tr: 'tr-TR',
  uk: 'uk-UA',
  vi: 'vi-VN',
  zh: 'zh-CN',
};

/** Mirrors `rounded-xl`, so the button keeps the Continue button's shape. */
const BUTTON_BORDER_RADIUS = '12px';

export interface CrossmintAppearanceVariables {
  borderRadius: string;
  colors: {
    accent: string;
    backgroundPrimary: string;
    borderPrimary: string;
    danger: string;
    textPrimary: string;
    textSecondary: string;
    warning: string;
  };
}

/**
 * Maps an app locale onto one Crossmint accepts. Unknown languages fall back
 * to English rather than pass through, which risks the checkout not rendering.
 */
export function toCrossmintLocale(locale?: string | null): string {
  if (!locale) {
    return DEFAULT_LOCALE;
  }

  const exactMatch = SUPPORTED_LOCALES.find(
    (supported) => supported.toLowerCase() === locale.toLowerCase(),
  );
  if (exactMatch) {
    return exactMatch;
  }

  const language = locale.slice(0, 2).toLowerCase();
  return LOCALE_BY_LANGUAGE[language] ?? DEFAULT_LOCALE;
}

/**
 * Colors only. `fontFamily` is left alone deliberately: the WebView cannot
 * reach the app's bundled fonts, so naming one lands on a system font.
 */
export function buildCrossmintAppearanceVariables(
  colors: Colors,
): CrossmintAppearanceVariables {
  return {
    borderRadius: BUTTON_BORDER_RADIUS,
    colors: {
      accent: colors.primary.default,
      backgroundPrimary: colors.background.default,
      borderPrimary: colors.border.muted,
      danger: colors.error.default,
      textPrimary: colors.text.default,
      textSecondary: colors.text.alternative,
      warning: colors.warning.default,
    },
  };
}

/**
 * Merges theme variables and a locale into the checkout URL. Returns it
 * untouched if unparseable: a mis-themed checkout beats one that never loads.
 */
export function applyCrossmintCheckoutAppearance(
  checkoutUrl: string,
  {
    variables,
    locale,
  }: { variables: CrossmintAppearanceVariables; locale: string },
): string {
  try {
    const url = new URL(checkoutUrl);

    const existingParam = url.searchParams.get('appearance');
    const existing = existingParam
      ? (JSON.parse(existingParam) as Record<string, unknown>)
      : {};
    const existingVariables = (existing.variables ?? {}) as Record<
      string,
      unknown
    >;

    url.searchParams.set(
      'appearance',
      JSON.stringify({
        ...existing,
        variables: { ...existingVariables, ...variables },
      }),
    );
    url.searchParams.set('locale', locale);

    return url.toString();
  } catch {
    return checkoutUrl;
  }
}
