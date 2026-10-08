export const SOCIAL_V1_HOT_TOKENS_CAROUSEL_TEST_ID =
  'social-v1-hot-tokens-carousel';

export const SOCIAL_V1_HOT_TOKENS_TRACK_TEST_ID = 'social-v1-hot-tokens-track';

export const getSocialV1HotTokenChipTestId = (id: string) =>
  `social-v1-hot-token-chip-${id}`;

/** Deliberately not a `chip-` prefix, so chip lookups do not also match the check. */
export const getSocialV1HotTokenCheckTestId = (id: string) =>
  `social-v1-hot-token-check-${id}`;
