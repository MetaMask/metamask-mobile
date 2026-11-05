export const SOCIAL_V1_HOT_TOKENS_CAROUSEL_TEST_ID =
  'social-v1-hot-tokens-carousel';

/** The marquee row holding the track and its loop copy. */
export const SOCIAL_V1_HOT_TOKENS_RAIL_TEST_ID = 'social-v1-hot-tokens-rail';

export const SOCIAL_V1_HOT_TOKENS_TRACK_TEST_ID = 'social-v1-hot-tokens-track';

export const getSocialV1HotTokenChipTestId = (id: string) =>
  `social-v1-hot-token-chip-${id}`;

/** The chip docked at the rail's left edge while it filters the feed. */
export const getSocialV1HotTokenSelectedChipTestId = (id: string) =>
  `social-v1-hot-token-selected-chip-${id}`;

/** Deliberately not a `chip-` prefix, so chip lookups do not also match the close icon. */
export const getSocialV1HotTokenCloseTestId = (id: string) =>
  `social-v1-hot-token-close-${id}`;
