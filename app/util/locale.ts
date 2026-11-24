import { AppState } from 'react-native';
import { getLocales } from 'expo-localization';
import I18n from '../../locales/i18n';

let cachedDeviceRegion: string | null | undefined;

function getDeviceRegion() {
  if (cachedDeviceRegion === undefined) {
    cachedDeviceRegion =
      getLocales().find((loc) => loc.regionCode)?.regionCode ?? null;
  }
  return cachedDeviceRegion;
}

const localeListeners = new Set<() => void>();

AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    cachedDeviceRegion = undefined;
    localeListeners.forEach((listener) => listener());
  }
});

export function subscribeToLocaleChanges(listener: () => void) {
  localeListeners.add(listener);
  return () => {
    localeListeners.delete(listener);
  };
}

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

export function getFormattingLocale() {
  return resolveFormattingLocale(getResolvedAppLanguage(), getDeviceRegion());
}
