import ReactNative from 'react-native';
import AsyncStorage from '@react-native-community/async-storage';
import I18n from 'react-native-i18n';
import { LANGUAGE } from '../app/constants/storage';

// Import all locales
import en from './languages/en.json';
import es from './languages/es.json';
import hi from './languages/hi-in.json';
import id from './languages/id-id.json';
import ja from './languages/ja-jp.json';
import ko from './languages/ko-kr.json';
import pt from './languages/pt-br.json';
import ru from './languages/ru-ru.json';
import tl from './languages/tl.json';
import vi from './languages/vi-vn.json';
import zh from './languages/zh-cn.json';
// Should the app fallback to English if user locale doesn't exists
I18n.fallbacks = true;
I18n.defaultLocale = 'en';
// Define the supported translations
I18n.translations = {
	en,
	es,
	hi,
	id,
	ja,
	ko,
	pt,
	ru,
	tl,
	vi,
	zh,
};
// If language selected get locale
getUserPreferableLocale();

// Uncomment this for using RTL
//const currentLocale = I18n.currentLocale();

// Is it a RTL language?
export const isRTL = false; // currentLocale.indexOf('jaJp') === 0;

// Set locale
export async function setLocale(locale) {
	I18n.locale = locale;
	await AsyncStorage.setItem(LANGUAGE, locale);
}

// Get languages
export function getLanguages() {
	return {
		en: 'English',
		es: 'Spanish',
		hi: 'Hindi',
		id: 'Bahasa Indonesian',
		ja: 'Japanese',
		ko: 'Korean',
		pt: 'Portuguese - Brazil',
		ru: 'Russian',
		tl: 'Filipino',
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
