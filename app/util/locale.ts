import { AppState } from 'react-native';
import { getLocales, type Locale } from 'expo-localization';
import I18n from '../../locales/i18n';

interface CachedLocaleData {
  firstWithRegion: Locale | undefined;
  currencyDisplay: 'narrowSymbol' | 'symbol';
}

let cachedLocaleData: CachedLocaleData | undefined;

// Regions whose own currency is written as $, so USD needs marking (US$).
// Copied from the extension; moves to core later.
const dollarRegions = new Set(['CA', 'AU', 'NZ', 'SG', 'HK', 'MX', 'AR']);

function computeCurrencyDisplay(firstWithRegion: Locale | undefined) {
  const region = firstWithRegion?.regionCode;
  return region && dollarRegions.has(region) ? 'symbol' : 'narrowSymbol';
}

function refreshDeviceLocales() {
  const locales = getLocales();
  const firstWithRegion = locales.find((loc) => loc.regionCode);
  cachedLocaleData = {
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

const traditionalZhRegions = new Set(['TW', 'HK', 'MO']);

function getDefaultScriptForZh(region: string) {
  return traditionalZhRegions.has(region.toUpperCase()) ? 'Hant' : 'Hans';
}

function resolveFormattingLocale(
  appLanguage: string,
  deviceRegion: string | null,
) {
  if (!deviceRegion) {
    return appLanguage;
  }

  const parts = [appLanguage];

  // Keep app's Simplified (Hans) script for Chinese when region default differs
  if (appLanguage === 'zh') {
    const appScript = 'Hans';
    const regionDefaultScript = getDefaultScriptForZh(deviceRegion);
    if (appScript !== regionDefaultScript) {
      parts.push(appScript);
    }
  }

  parts.push(deviceRegion);

  try {
    return Intl.getCanonicalLocales(parts.join('-'))[0];
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
  const deviceRegion = data.firstWithRegion?.regionCode ?? null;
  return resolveFormattingLocale(appLanguage, deviceRegion);
}
