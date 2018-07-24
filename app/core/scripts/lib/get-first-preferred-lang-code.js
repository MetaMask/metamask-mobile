const extension = require('extensionizer');
const promisify = require('pify');
const allLocales = require('../../_locales/index.json');

const isSupported = extension.i18n && extension.i18n.getAcceptLanguages;
const getPreferredLocales = isSupported
	? promisify(extension.i18n.getAcceptLanguages, { errorFirst: false })
	: async () => [];

const existingLocaleCodes = allLocales.map(locale => locale.code.toLowerCase().replace('_', '-'));

/**
 * Returns a preferred language code, based on settings within the user's browser. If we have no translations for the
 * users preferred locales, 'en' is returned.
 *
 * @returns {Promise<string>} Promises a locale code, either one from the user's preferred list that we have a translation for, or 'en'
 *
 */
async function getFirstPreferredLangCode() {
	const userPreferredLocaleCodes = await getPreferredLocales();
	const firstPreferredLangCode = userPreferredLocaleCodes
		.map(code => code.toLowerCase())
		.find(code => existingLocaleCodes.includes(code));
	return firstPreferredLangCode || 'en';
}

module.exports = getFirstPreferredLangCode;
