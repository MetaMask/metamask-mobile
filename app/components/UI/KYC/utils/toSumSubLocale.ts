/**
 * Locales SumSub uses that differ from the app language code.
 *
 * Settings stores Brazilian Portuguese as `pt` ("Português (Brasil)") and
 * Filipino as `tl`. SumSub questionnaire copy for Brazilian Portuguese is
 * `pt-BR` (`pt` is European Portuguese). SumSub's Filipino code is `fl`,
 * including the device tag `fil`.
 */
const SUMSUB_LOCALE_BY_LANGUAGE: Record<string, string> = {
  pt: 'pt-BR',
  tl: 'fl',
  fil: 'fl',
};

/**
 * Locale to pass to SumSub for the current app language.
 *
 * Device tags such as `es-MX` or `zh-Hans` keep only the ISO 639 language
 * subtag. SumSub leaves an unrecognized region or script tag in English,
 * while the app already shows that language. Portuguese always becomes
 * `pt-BR`, because the app ships Brazilian Portuguese only.
 *
 * @param locale - `I18n.locale`, either a settings code or a device tag.
 * @returns The SumSub locale, or `locale` when it has no language subtag.
 */
export function toSumSubLocale(locale: string): string {
  const match = locale.trim().match(/^([a-zA-Z]{2,3})(?:[-_].*)?$/);
  const language = match?.[1].toLowerCase();
  if (!language) {
    return locale;
  }

  return SUMSUB_LOCALE_BY_LANGUAGE[language] ?? language;
}
