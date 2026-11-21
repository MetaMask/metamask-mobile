import { AppState } from 'react-native';
import { getLocales, type Locale } from 'expo-localization';
import I18n from '../../locales/i18n';

interface CachedLocaleData {
  locales: Locale[];
  region: string | null;
  localCurrency: string | null;
  currencyDisplay: 'narrowSymbol' | 'symbol';
}

let cachedLocaleData: CachedLocaleData | undefined;

function refreshDeviceLocales() {
  const locales = getLocales();
  const firstWithRegion = locales.find((loc) => loc.regionCode);
  const region = firstWithRegion?.regionCode ?? null;
  const localCurrency = firstWithRegion?.currencyCode ?? null;
  cachedLocaleData = {
    locales,
    region,
    localCurrency,
    currencyDisplay: 'narrowSymbol',
  };
  return cachedLocaleData;
}

AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    cachedLocaleData = undefined;
  }
});

function getResolvedAppLanguage() {
  const bare = I18n.locale.split('-')[0];
  return I18n.translations && bare in I18n.translations ? bare : 'en';
}

interface ResolveParams {
  appLanguage: string;
  deviceLocales: Locale[];
  deviceRegion: string | null;
}

function resolveFormattingLocale({
  appLanguage,
  deviceLocales,
  deviceRegion,
}: ResolveParams) {
  if (!deviceRegion) {
    return appLanguage;
  }

  const firstWithRegion = deviceLocales.find((loc) => loc.regionCode);
  if (firstWithRegion?.languageCode === appLanguage) {
    const candidate = firstWithRegion.languageTag;
    try {
      Intl.getCanonicalLocales(candidate);
      return candidate;
    } catch {
      return appLanguage;
    }
  }

  const withRegion = `${appLanguage}-${deviceRegion}`;
  try {
    Intl.getCanonicalLocales(withRegion);
    return withRegion;
  } catch {
    return appLanguage;
  }
}

function getLocalCurrencyNarrowSymbol(
  locale: string,
  currency: string,
): string | null {
  try {
    const formatter = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      currencyDisplay: 'narrowSymbol',
    });
    if (typeof formatter.formatToParts !== 'function') {
      return null;
    }
    const parts = formatter.formatToParts(1);
    return parts.find((p) => p.type === 'currency')?.value ?? null;
  } catch {
    return null;
  }
}

function computeCurrencyDisplay(
  locale: string,
  localCurrency: string | null,
): 'narrowSymbol' | 'symbol' {
  if (!localCurrency) {
    return 'symbol';
  }

  const symbol = getLocalCurrencyNarrowSymbol(locale, localCurrency);

  if (!symbol) {
    return 'symbol';
  }

  if (symbol === '$') {
    return 'symbol';
  }

  return 'narrowSymbol';
}

export function getCurrencyDisplay(): 'narrowSymbol' | 'symbol' {
  const data = cachedLocaleData ?? refreshDeviceLocales();
  return data.currencyDisplay;
}

export function getFormattingLocale() {
  const data = cachedLocaleData ?? refreshDeviceLocales();
  const appLanguage = getResolvedAppLanguage();
  const locale = resolveFormattingLocale({
    appLanguage,
    deviceLocales: data.locales,
    deviceRegion: data.region,
  });

  if (data.currencyDisplay === 'narrowSymbol') {
    data.currencyDisplay = computeCurrencyDisplay(locale, data.localCurrency);
  }

  return locale;
}
