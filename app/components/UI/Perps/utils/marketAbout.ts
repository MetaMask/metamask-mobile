import {
  PERPS_EVENT_PROPERTY,
  type PerpsMarketData,
} from '@metamask/perps-controller';

/**
 * Default number of lines the market About description is collapsed to before
 * the "Read more" toggle is shown.
 */
export const ABOUT_COLLAPSED_NUMBER_OF_LINES = 3;

/**
 * `interaction_type` values for the market About section (TAT-2308).
 *
 * These are not (yet) part of `PERPS_EVENT_VALUE.INTERACTION_TYPE` in
 * `@metamask/perps-controller`, so they are declared here as the single source
 * of truth for the Mixpanel contract until they are promoted to the shared enum.
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
 * Resolves the analytics market category for a market, bucketing HIP-3 markets
 * into a dedicated `hip3` value.
 */
export const getMarketAboutMarketType = (market: PerpsMarketData): string => {
  if (market?.isHip3) {
    return 'hip3';
  }
  return market?.marketType ?? 'crypto';
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
  [PERPS_EVENT_PROPERTY.ASSET]: market?.symbol ?? '',
  [PERPS_EVENT_PROPERTY.MARKET_CATEGORY]: getMarketAboutMarketType(market),
  [MARKET_ABOUT_EVENT_PROPERTY.DESCRIPTION_LENGTH]: description.length,
});
