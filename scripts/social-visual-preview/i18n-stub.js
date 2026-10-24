import en from '../../locales/languages/en.json';

const lookup = (name, params = {}) => {
  const value = name.split('.').reduce((node, part) => node?.[part], en);
  if (typeof value !== 'string') {
    return name;
  }
  return value.replace(
    /\{\{(.*?)\}\}/g,
    (_, token) => String(params[token.trim()] ?? ''),
  );
};

const I18n = {
  locale: 'en',
  t: lookup,
};

export const strings = (name, params) => lookup(name, params);
export default I18n;
