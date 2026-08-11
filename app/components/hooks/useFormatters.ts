import { createFormatters, type Formatters } from '@metamask/client-utils';
import I18n from '../../../locales/i18n';

export const getLocaleLanguageCode = () => I18n.locale.split('-')[0];

let cachedFormatters: Formatters | undefined;
let cachedLocale: string | undefined;

/**
 * Returns the app-language formatters, memoized per locale. Safe to call
 * outside React; prefer {@link useFormatters} in components.
 */
export function getFormatters(): Formatters {
  const locale = getLocaleLanguageCode();
  if (!cachedFormatters || cachedLocale !== locale) {
    cachedLocale = locale;
    cachedFormatters = createFormatters({ locale });
  }
  return cachedFormatters;
}

export function useFormatters(): Formatters {
  return getFormatters();
}
