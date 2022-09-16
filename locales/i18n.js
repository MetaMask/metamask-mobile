import ReactNative from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import I18n from 'react-native-i18n';
// eslint-disable-next-line import/no-nodejs-modules
import { EventEmitter } from 'events';

import { LANGUAGE } from '../app/constants/storage';
// Polyfill Intl & include fallback locale (en) for Hermes iOS
// import 'intl';
// import 'intl/locale-data/jsonp/en.js';

// Import all locales
import de from './languages/de';
import el from './languages/el';
import en from './languages/en';
import es from './languages/es';
import fr from './languages/fr';
import hi from './languages/hi';
import id from './languages/id';
import ja from './languages/ja';
import ko from './languages/ko';
import pt from './languages/pt';
import ru from './languages/ru';
import tl from './languages/tl';
import tr from './languages/tr';
import vi from './languages/vi';
import zh from './languages/zh';

export const supportedTranslations = {
  de,
  el,
  en,
  es,
  fr,
  hi,
  id,
  ja,
  ko,
  pt,
  ru,
  tl,
  tr,
  vi,
  zh,
};

export const I18nEvents = new EventEmitter();

// Should the app fallback to English if user locale doesn't exists
I18n.fallbacks = true;
I18n.defaultLocale = 'en';
// Define the supported translations
I18n.translations = supportedTranslations;
// If language selected get locale
getUserPreferableLocale();

// Uncomment this for using RTL
//const currentLocale = I18n.currentLocale();

// /**
//  * Dynamically require locale data based on whatever language is selected.
//  * Required as part of Intl polyfill implementation. Only applies to Hermes iOS.
//  *
//  * @param {string} locale locale based on I18n.locale type
//  */
// export function getLocaleData(locale) {
//   switch (locale) {
//     case 'es':
//       return require(`intl/locale-data/jsonp/es.js`);
//     case 'hi':
//       return require(`intl/locale-data/jsonp/hi.js`);
//     case 'id':
//       return require(`intl/locale-data/jsonp/id.js`);
//     case 'ja':
//       return require(`intl/locale-data/jsonp/ja.js`);
//     case 'ko':
//       return require(`intl/locale-data/jsonp/ko.js`);
//     case 'pt':
//       return require(`intl/locale-data/jsonp/pt.js`);
//     case 'ru':
//       return require(`intl/locale-data/jsonp/ru.js`);
//     case 'tl':
//       // intl polyfill doesn't support tl at the moment, fallback to en
//       // This is consistent between pre and post polyfill behavior
//       return require(`intl/locale-data/jsonp/en.js`);
//     case 'vi':
//       return require(`intl/locale-data/jsonp/vi.js`);
//     case 'zh':
//       return require(`intl/locale-data/jsonp/zh.js`);
//     default:
//   }
// }

// Is it a RTL language?
export const isRTL = false; // currentLocale.indexOf('jaJp') === 0;

// Set locale
export async function setLocale(locale) {
  I18n.locale = locale;
  // Platform.OS === 'ios' && getLocaleData(locale);
  await AsyncStorage.setItem(LANGUAGE, locale);
  I18nEvents.emit('localeChanged', locale);
}

// Get languages
export function getLanguages() {
  return {
    de: 'German',
    el: 'Greek',
    en: 'English',
    es: 'Spanish',
    fr: 'French',
    hi: 'Hindi',
    id: 'Bahasa Indonesian',
    ja: 'Japanese',
    ko: 'Korean',
    pt: 'Portuguese - Brazil',
    ru: 'Russian',
    tl: 'Filipino',
    tr: 'Turkish',
    vi: 'Vietnamese',
    zh: 'Chinese - China',
  };
}

// Allow RTL alignment in RTL languages
ReactNative.I18nManager.allowRTL(isRTL);

// The method we'll use instead of a regular string
export function strings(name, params = {}) {
  return I18n.t(name, params);
}

// Allow persist locale after app closed
async function getUserPreferableLocale() {
  const locale = await AsyncStorage.getItem(LANGUAGE);
  if (locale) {
    I18n.locale = locale;
  }
}

export default I18n;
