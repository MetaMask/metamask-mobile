import { strings } from '../../../../../locales/i18n';

const LOCALIZED_BADGE_LABELS = new Map<string, string>([
  ['stock', 'token.stock'],
]);

/**
 * Resolves a server-provided badge label to display text.
 * Known labels are localized; unknown labels are shown as provided.
 *
 * @param badgeLabel - Badge label from the API, e.g. "Stock".
 * @returns The text to render in the badge.
 */
export const getBadgeLabelText = (badgeLabel: string): string => {
  const localeKey = LOCALIZED_BADGE_LABELS.get(badgeLabel.trim().toLowerCase());
  return localeKey ? strings(localeKey) : badgeLabel;
};
