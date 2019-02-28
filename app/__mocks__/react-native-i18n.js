// @flow

// eslint-disable-next-line import/no-extraneous-dependencies
import I18nJs from 'i18n-js';

I18nJs.locale = 'en'; // a locale from your available translations
export const getLanguages = (): Promise<string[]> => Promise.resolve(['en']);
export default I18nJs;
