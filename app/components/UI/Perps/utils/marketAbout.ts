import {
  MarketCategory,
  PERPS_EVENT_PROPERTY,
  type PerpsMarketData,
} from '@metamask/perps-controller';

/**
 * `interaction_type` values for the market About section (TAT-2308).
 *
 * These are not (yet) part of `PERPS_EVENT_VALUE.INTERACTION_TYPE` in
 * `@metamask/perps-controller`, so they are declared here as the single source
 * of truth for the Mixpanel contract — mirroring the sibling `relatedMarkets.ts`
 * pattern — until they are promoted to the shared enum.
 *
 * TODO: promote to `@metamask/perps-controller` `PERPS_EVENT_VALUE` once the
 * package exposes an About-section interaction type.
 */
export const MARKET_ABOUT_INTERACTION_TYPE = {
  DISPLAYED: 'market_about_section_displayed',
} as const;

/**
 * Custom analytics property keys for the About section that do not have a
 * dedicated `PERPS_EVENT_PROPERTY` constant.
 */
export const MARKET_ABOUT_EVENT_PROPERTY = {
  DESCRIPTION_LENGTH: 'description_length',
} as const;

/**
 * Analytics `market_category` bucket for HIP-3 markets, which are reported
 * separately from their underlying `marketType`.
 */
export const MARKET_ABOUT_HIP3_CATEGORY = 'hip3';

/**
 * Resolves the analytics market category for a market, bucketing HIP-3 markets
 * into a dedicated `hip3` value and defaulting to the crypto category.
 */
export const getMarketAboutMarketCategory = (
  market: PerpsMarketData,
): string => {
  if (market.isHip3) {
    return MARKET_ABOUT_HIP3_CATEGORY;
  }
  return market.marketType ?? MarketCategory.CryptoCurrency;
};

/**
 * Builds the `PERPS_UI_INTERACTION` properties for the About section
 * "displayed" event, using canonical `PERPS_EVENT_PROPERTY` keys.
 */
export const getMarketAboutDisplayedEventProperties = (
  market: PerpsMarketData,
  description: string,
): Record<string, unknown> => ({
  [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
    MARKET_ABOUT_INTERACTION_TYPE.DISPLAYED,
  [PERPS_EVENT_PROPERTY.ASSET]: market.symbol ?? '',
  [PERPS_EVENT_PROPERTY.MARKET_CATEGORY]: getMarketAboutMarketCategory(market),
  [MARKET_ABOUT_EVENT_PROPERTY.DESCRIPTION_LENGTH]: description.length,
});
