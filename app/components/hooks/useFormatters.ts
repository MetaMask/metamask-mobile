import { createFormatters, type Formatters } from '@metamask/client-utils';
import I18n from '../../../locales/i18n';
import { getFormattingLocale } from '../../util/locale';
import { useFormattingLocale } from './useFormattingLocale';

export const getLocaleLanguageCode = () => I18n.locale.split('-')[0];

let cachedFormatters: Formatters | undefined;
let cachedLocale: string | undefined;

/**
 * Returns formatters for the app language and device region, memoized per
 * locale. Safe to call outside React; prefer {@link useFormatters} in
 * components.
 */
export function getFormatters(locale = getFormattingLocale()): Formatters {
  if (!cachedFormatters || cachedLocale !== locale) {
    cachedLocale = locale;
    cachedFormatters = createFormatters({ locale });
  }
  return cachedFormatters;
}

export function useFormatters(): Formatters {
  return getFormatters(useFormattingLocale());
}
