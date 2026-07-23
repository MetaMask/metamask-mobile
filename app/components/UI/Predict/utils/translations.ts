import { strings } from '../../../../../locales/i18n';

export const MISSING_TRANSLATION_PREFIX = '[missing';

export const isMissingTranslation = (value: string, key: string): boolean =>
  value === key || value.startsWith(MISSING_TRANSLATION_PREFIX);

export const translateIfPresent = (key: string): string | undefined => {
  const value = strings(key);
  return isMissingTranslation(value, key) ? undefined : value;
};
