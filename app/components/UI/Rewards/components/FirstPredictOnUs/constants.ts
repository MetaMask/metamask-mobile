/**
 * Typed contract for the First Predict On Us CMS `localizedText` keys.
 *
 * The CMS returns copy in `FirstPredictOnUsDto.localizedText` as a
 * `Record<string, string>`, so the individual key names are otherwise implicit.
 * Consumers should read values via these constants rather than inline string
 * literals so the key contract is documented, discoverable, and refactor-safe.
 *
 * Keep in sync with va-mmcx-rewards `PREDICT_ON_US_LOCALIZED_TEXT_KEYS`.
 *
 * `tradeConfirm.description` may include `{amount}` / `{outcome}` placeholders
 * (see `AMOUNT_PLACEHOLDER` / `OUTCOME_PLACEHOLDER`); interpolate client-side
 * when showing the order success toast.
 */
export const FIRST_PREDICT_ON_US_CMS_KEYS = {
  splashSkip: 'splashSheet.skip',
  splashDescription: 'splashSheet.description',
  splashRegion: 'splashSheet.region',
  splashTermsApply: 'splashSheet.termsApply',
  tradeConfirm: 'tradeConfirm.confirm',
  tradePlaced: 'tradeConfirm.tradePlaced',
  tradeDescription: 'tradeConfirm.description',
} as const;

export type FirstPredictOnUsCmsKey =
  (typeof FIRST_PREDICT_ON_US_CMS_KEYS)[keyof typeof FIRST_PREDICT_ON_US_CMS_KEYS];

/** Mirrors va-mmcx-rewards `AMOUNT_PLACEHOLDER` / VIP `{tierName}` pattern. */
export const AMOUNT_PLACEHOLDER = '{amount}';
/** Mirrors va-mmcx-rewards `OUTCOME_PLACEHOLDER` / VIP `{tierName}` pattern. */
export const OUTCOME_PLACEHOLDER = '{outcome}';

/**
 * Interpolate `{amount}` / `{outcome}` in trade-description CMS copy.
 * Same split/join approach as VIP's `{tierName}` equity interpolation.
 */
export function interpolateFirstPredictOnUsTradeDescription(
  template: string,
  amount: string,
  outcome: string,
): string {
  return template
    .split(AMOUNT_PLACEHOLDER)
    .join(amount)
    .split(OUTCOME_PLACEHOLDER)
    .join(outcome);
}
