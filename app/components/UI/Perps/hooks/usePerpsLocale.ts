import { useEffect, useState } from 'react';
import I18n, { I18nEvents } from '../../../../../locales/i18n';

const DEFAULT_PERPS_LOCALE = 'en-US';

/**
 * Keeps Perps displays in sync with the app language without adding locale
 * state to Redux.
 */
export const usePerpsLocale = (): string => {
  const [locale, setLocale] = useState(
    () => I18n?.locale || DEFAULT_PERPS_LOCALE,
  );

  useEffect(() => {
    const handleLocaleChanged = (nextLocale: string) => {
      setLocale(nextLocale);
    };

    I18nEvents.addListener('localeChanged', handleLocaleChanged);

    return () => {
      I18nEvents.removeListener('localeChanged', handleLocaleChanged);
    };
  }, []);

  return locale;
};
