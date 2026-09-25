import { useSyncExternalStore } from 'react';
import I18n, { I18nEvents } from '../../../../../locales/i18n';

const DEFAULT_PERPS_LOCALE = 'en-US';

const subscribeToPerpsLocale = (onLocaleChanged: () => void) => {
  I18nEvents.addListener('localeChanged', onLocaleChanged);
  return () => I18nEvents.removeListener('localeChanged', onLocaleChanged);
};

const getPerpsLocaleSnapshot = () => I18n?.locale || DEFAULT_PERPS_LOCALE;

/**
 * Keeps Perps displays in sync with the app language without adding locale
 * state to Redux.
 */
export const usePerpsLocale = (): string =>
  useSyncExternalStore(
    subscribeToPerpsLocale,
    getPerpsLocaleSnapshot,
    getPerpsLocaleSnapshot,
  );
