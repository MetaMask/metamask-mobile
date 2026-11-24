import { useSyncExternalStore } from 'react';
import { createFormatters, type Formatters } from '@metamask/client-utils';
import I18n from '../../../locales/i18n';
import {
  getFormattingLocale,
  subscribeToLocaleChanges,
} from '../../util/locale';

export const getLocaleLanguageCode = () => I18n.locale.split('-')[0];

let cachedFormatters: Formatters | undefined;
let cachedLocale: string | undefined;

/**
 * Returns formatters for the app language and device region, memoized per
 * locale. Safe to call outside React; prefer {@link useFormatters} in
 * components.
 */
export function getFormatters(): Formatters {
  const locale = getFormattingLocale();
  if (!cachedFormatters || cachedLocale !== locale) {
    cachedLocale = locale;
    cachedFormatters = createFormatters({ locale });
  }
  return cachedFormatters;
}

export function useFormatters(): Formatters {
  return useSyncExternalStore(subscribeToLocaleChanges, getFormatters);
}
