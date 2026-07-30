/**
 * Analytics constants for the market "About" section.
 *
 * These `interaction_type` values and property keys are not yet part of the
 * shipped `@metamask/perps-controller` constants, so they are declared locally.
 * Once upstream adds them, prefer importing from the package instead.
 */
export const PERPS_MARKET_ABOUT_INTERACTION_TYPE = {
  DISPLAYED: 'market_about_section_displayed',
  VIEWED: 'market_about_section_viewed',
} as const;

export const PERPS_MARKET_ABOUT_EVENT_PROPERTY = {
  MARKET_SYMBOL: 'market_symbol',
  MARKET_TYPE: 'market_type',
  DESCRIPTION_LENGTH: 'description_length',
} as const;

/**
 * Fraction of the section's height that must be visible before it counts as
 * "viewed". Mirrors the threshold used by the Perps home section tracking.
 */
export const PERPS_MARKET_ABOUT_VISIBILITY_THRESHOLD = 0.2;

/** Collapsed description is limited to this many lines before "Read more". */
export const PERPS_MARKET_ABOUT_COLLAPSED_LINES = 3;
