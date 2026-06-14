import { strings } from '../../../../../locales/i18n';

const I18N_PREFIX = 'predict.outcome_groups';

/**
 * Resolves a group key to a display label via i18n.
 * Falls back to title-casing the key if no translation exists.
 */
export const getOutcomeGroupLabel = (key: string): string => {
  const i18nKey = `${I18N_PREFIX}.${key}`;
  const label = strings(i18nKey);
  if (label !== i18nKey) {
    return label;
  }
  return key
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};
