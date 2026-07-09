/**
 * Typed contract for the First Predict On Us CMS `localizedText` keys.
 *
 * The CMS returns copy in `FirstPredictOnUsDto.localizedText` as a
 * `Record<string, string>`, so the individual key names are otherwise implicit.
 * Consumers should read values via these constants rather than inline string
 * literals so the key contract is documented, discoverable, and refactor-safe.
 */
export const FIRST_PREDICT_ON_US_CMS_KEYS = {
  splashSkip: 'splashSheet.skip',
  splashDescription: 'splashSheet.description',
  splashRegion: 'splashSheet.region',
  splashTermsApply: 'splashSheet.termsApply',
  tradeConfirm: 'tradeConfirm.confirm',
} as const;

export type FirstPredictOnUsCmsKey =
  (typeof FIRST_PREDICT_ON_US_CMS_KEYS)[keyof typeof FIRST_PREDICT_ON_US_CMS_KEYS];
