import { useMemo } from 'react';
import { createFormatters } from '@metamask/client-utils';
import I18n from '../../../locales/i18n';

export const getLocaleLanguageCode = () => I18n.locale.split('-')[0];

/**
 * Non-hook accessor for the formatters {@link useFormatters} returns, for plain
 * functions that cannot call hooks. Cheap to call — `createFormatters` only binds
 * functions and `@metamask/client-utils` caches the `Intl` instances globally.
 * Prefer {@link useFormatters} inside components.
 */
export function getFormatters() {
  return createFormatters({ locale: getLocaleLanguageCode() });
}

export function useFormatters() {
  const locale = getLocaleLanguageCode();
  return useMemo(() => createFormatters({ locale }), [locale]);
}
