import { AppState } from 'react-native';
import { getLocales, type Locale } from 'expo-localization';
import I18n from '../../locales/i18n';

interface CachedLocaleData {
  locales: Locale[];
  firstWithRegion: Locale | undefined;
  currencyDisplay: 'narrowSymbol' | 'symbol';
}

let cachedLocaleData: CachedLocaleData | undefined;

function computeCurrencyDisplay(firstWithRegion: Locale | undefined) {
  return firstWithRegion?.currencySymbol &&
    firstWithRegion.currencySymbol !== '$'
    ? 'narrowSymbol'
    : 'symbol';
}

function refreshDeviceLocales() {
  const locales = getLocales();
  const firstWithRegion = locales.find((loc) => loc.regionCode);
  cachedLocaleData = {
    locales,
    firstWithRegion,
    currencyDisplay: computeCurrencyDisplay(firstWithRegion),
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
  firstWithRegion: Locale | undefined;
}

function resolveFormattingLocale({
  appLanguage,
  firstWithRegion,
}: ResolveParams) {
  if (!firstWithRegion?.regionCode) {
    return appLanguage;
  }

  if (firstWithRegion.languageCode === appLanguage) {
    const candidate = firstWithRegion.languageTag;
    try {
      Intl.getCanonicalLocales(candidate);
      return candidate;
    } catch {
      return appLanguage;
    }
  }

  const withRegion = `${appLanguage}-${firstWithRegion.regionCode}`;
  try {
    Intl.getCanonicalLocales(withRegion);
    return withRegion;
  } catch {
    return appLanguage;
  }
}

export function getCurrencyDisplay() {
  const data = cachedLocaleData ?? refreshDeviceLocales();
  return data.currencyDisplay;
}

export function getFormattingLocale() {
  const data = cachedLocaleData ?? refreshDeviceLocales();
  const appLanguage = getResolvedAppLanguage();
  return resolveFormattingLocale({
    appLanguage,
    firstWithRegion: data.firstWithRegion,
  });
}
