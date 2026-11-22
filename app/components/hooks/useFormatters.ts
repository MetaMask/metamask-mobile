import { createFormatters, type Formatters } from '@metamask/client-utils';
import I18n from '../../../locales/i18n';
import { getFormattingLocale, getCurrencyDisplay } from '../../util/locale';

export const getLocaleLanguageCode = () => I18n.locale.split('-')[0];

let cachedFormatters: Formatters | undefined;
let cachedLocale: string | undefined;
let cachedCurrencyDisplay: 'narrowSymbol' | 'symbol' | undefined;

/**
 * Returns formatters for the app language and device region, memoized per
 * locale. Safe to call outside React; prefer {@link useFormatters} in
 * components.
 */
export function getFormatters(): Formatters {
  const locale = getFormattingLocale();
  const currencyDisplay = getCurrencyDisplay();

  if (
    !cachedFormatters ||
    cachedLocale !== locale ||
    cachedCurrencyDisplay !== currencyDisplay
  ) {
    cachedLocale = locale;
    cachedCurrencyDisplay = currencyDisplay;
    cachedFormatters = createFormatters({ locale, currencyDisplay });
  }
  return cachedFormatters;
}

export function useFormatters(): Formatters {
  return getFormatters();
}
