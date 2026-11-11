export const ERROR_BANNER_TW_CLASSNAME =
  'border-l-4 border-error-default bg-error-muted pl-2';
export const WARNING_BANNER_TW_CLASSNAME =
  'border-l-4 border-warning-default bg-warning-muted pl-2';

/**
 * How long a token's fiat rate must stay missing before the missing-price
 * banner appears. A newly selected token's rate is fetched after the
 * selection, so a shorter gap is a pending fetch rather than a missing price.
 */
export const MISSING_PRICE_BANNER_DELAY_MS = 500;
