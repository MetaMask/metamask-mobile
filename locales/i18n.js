import ReactNative from 'react-native';
import AsyncStorage from '@react-native-community/async-storage';
import I18n from 'react-native-i18n';
import { LANGUAGE } from '../app/constants/storage';

// Import all locales
import en from './en.json';
import es from './es.json';

// Should the app fallback to English if user locale doesn't exists
I18n.fallbacks = true;
I18n.defaultLocale = 'en';
// Define the supported translations
I18n.translations = {
	en,
	es
};
// If language selected get locale
getUserPreferableLocale();

const currentLocale = I18n.currentLocale();

// Is it a RTL language?
export const isRTL = currentLocale.indexOf('he') === 0 || currentLocale.indexOf('ar') === 0;

// Set locale
export async function setLocale(locale) {
	I18n.locale = locale;
	await AsyncStorage.setItem(LANGUAGE, locale);
}

// Get languages
export function getLanguages() {
	return { en: 'English', es: 'Spanish' };
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
