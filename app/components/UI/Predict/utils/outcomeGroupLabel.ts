import { strings } from '../../../../../locales/i18n';
import {
  isMissingI18nLabel,
  toReadableMarketLabel,
} from './readableMarketLabel';

const I18N_PREFIX = 'predict.outcome_groups';

/**
 * Resolves a group key to a display label via i18n.
 * Falls back to a humanized key if no translation exists.
 */
export const getOutcomeGroupLabel = (key: string): string => {
  const i18nKey = `${I18N_PREFIX}.${key}`;
  const label = strings(i18nKey);
  if (typeof label === 'string' && !isMissingI18nLabel(label, i18nKey)) {
    return label;
  }
  return toReadableMarketLabel(key);
};
