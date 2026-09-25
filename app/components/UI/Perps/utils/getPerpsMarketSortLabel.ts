import { strings } from '../../../../../locales/i18n';

/**
 * Adds the market data interval to a translated Perps sort option label.
 *
 * @param labelKey - Translation key for the sort option.
 * @returns The translated label with its 24-hour interval.
 */
export const getPerpsMarketSortLabel = (labelKey: string) =>
  `${strings(labelKey)} (${strings('trending.24h')})`;
