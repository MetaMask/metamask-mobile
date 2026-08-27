import { IconName } from '@metamask/design-system-react-native';

/**
 * Maps perps market category IDs to their corresponding design system icons.
 * Used by PerpsProducts pills and PerpsMarketCategoryBadges filter chips.
 *
 * Category IDs match `MarketTypeFilter` values from `@metamask/perps-controller`
 * (e.g. `"stock"`, `"commodity"`, `"index"`).
 */
export const BADGE_CATEGORY_ICON_MAP: Record<string, IconName> = {
  crypto: IconName.Ethereum,
  stock: IconName.Diagram,
  forex: IconName.Exchange,
  commodity: IconName.Tint,
  index: IconName.Chart,
  etf: IconName.Category,
  'pre-ipo': IconName.Rocket,
  new: IconName.Fire,
  gainers: IconName.TrendUp,
  losers: IconName.TrendDown,
};

export function getCategoryIconName(categoryId: string): IconName {
  return BADGE_CATEGORY_ICON_MAP[categoryId] ?? IconName.Coin;
}
