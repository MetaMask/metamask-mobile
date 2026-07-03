import { IconName } from '@metamask/design-system-react-native';

/**
 * Maps perps market category IDs to their corresponding design system icons.
 * Used by both the PerpsProducts grid and PerpsMarketCategoryBadges chips.
 */
export const BADGE_CATEGORY_ICON_MAP: Record<string, IconName> = {
  crypto: IconName.Ethereum,
  stocks: IconName.Diagram,
  forex: IconName.CurrencyPound,
  commodities: IconName.Tint,
  new: IconName.Fire,
  gainers: IconName.TrendUp,
  losers: IconName.TrendDown,
};
