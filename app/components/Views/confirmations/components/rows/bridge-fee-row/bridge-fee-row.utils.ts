import { BigNumber } from 'bignumber.js';

/**
 * The provider fee split into its on-ramp and remaining (relay) portions.
 */
export interface ProviderFeeSplit {
  /**
   * Fiat on-ramp provider fee, or `undefined` when the quote reports none.
   * `undefined` means the on-ramp row should not render at all.
   */
  onRampFee?: BigNumber;
  /**
   * Provider fee left after removing the on-ramp portion. Never negative.
   */
  remainingProviderFee: BigNumber;
}

/**
 * Splits the combined provider fee into its on-ramp and remaining portions.
 *
 * `fees.provider` is the total of the relay provider fee and the fiat on-ramp
 * provider fee, and `fees.providerFiat` is the on-ramp portion on its own. The
 * two rows must still sum to the combined provider fee so the itemised
 * tooltip agrees with the single transaction-fee total on the first screen.
 *
 * Both inputs come from quote data, so neither is trusted: a missing,
 * non-finite, or negative on-ramp fee is treated as absent, and one larger
 * than the combined provider fee is capped so the remaining fee cannot render
 * as a negative amount.
 *
 * @param providerFeeUsd - Combined provider fee in USD.
 * @param providerFiatFeeUsd - On-ramp provider fee in USD, if reported.
 * @returns The on-ramp fee and the remaining provider fee.
 */
export function splitProviderFee(
  providerFeeUsd: string,
  providerFiatFeeUsd?: string,
): ProviderFeeSplit {
  const providerFeeRaw = new BigNumber(providerFeeUsd);
  const providerFee = providerFeeRaw.isFinite()
    ? BigNumber.maximum(providerFeeRaw, 0)
    : new BigNumber(0);

  const onRampFeeRaw = new BigNumber(providerFiatFeeUsd ?? 0);
  const hasOnRampFee = onRampFeeRaw.isFinite() && onRampFeeRaw.isGreaterThan(0);
  const onRampFee = hasOnRampFee
    ? BigNumber.minimum(onRampFeeRaw, providerFee)
    : new BigNumber(0);

  return {
    onRampFee: onRampFee.isGreaterThan(0) ? onRampFee : undefined,
    remainingProviderFee: providerFee.minus(onRampFee),
  };
}
