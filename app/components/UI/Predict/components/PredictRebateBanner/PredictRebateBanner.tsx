import React from 'react';
import type { RebateQuoteResponse } from '../../../../../core/Engine/controllers/rewards-money-controller/types';
import RebateBanner from '../../../shared/RebateBanner';
import { usePredictRebateQuote } from '../../hooks/usePredictRebateQuote';

export const PREDICT_REBATE_BANNER_TEST_ID = 'predict-rebate-banner';

const BPS_PER_UNIT = 10_000;

/**
 * The rebate to show on a Predict buy, as a percent of the MetaMask fee, or
 * null for no banner.
 *
 * Predict cashback is paid on the eligible fee,
 * `min(shareOfBuilderFee x fee, capBps x notional)`, not on the whole fee, so
 * `rebateBips` alone would overstate it. A quote without `eligibleFee` (a
 * backend that does not send it yet) shows nothing. Floored to 0.01 % so the
 * banner never shows more than the fill earns.
 *
 * @param quote - The rebate quote, when loaded.
 * @param metamaskFeeUsd - The MetaMask fee on this order, in USD.
 * @param notionalUsd - The order amount, in USD.
 * @returns The percent of the MetaMask fee paid back, or null.
 */
export function predictRebatePercent(
  quote: RebateQuoteResponse | undefined,
  metamaskFeeUsd: number,
  notionalUsd: number,
): number | null {
  const terms = quote?.eligibleFee;
  if (
    !quote?.eligible ||
    quote.reason !== null ||
    quote.rebateBips <= 0 ||
    !terms ||
    !(metamaskFeeUsd > 0)
  ) {
    return null;
  }
  const share = Number(terms.shareOfBuilderFee);
  if (!(share > 0 && share <= 1)) {
    return null;
  }
  let feeShare = share;
  if (typeof terms.capBps === 'number') {
    feeShare = Math.min(
      share,
      (terms.capBps * notionalUsd) / (BPS_PER_UNIT * metamaskFeeUsd),
    );
  } else if (terms.capBps !== null) {
    return null;
  }
  const percent =
    Math.floor((quote.rebateBips / 100) * feeShare * 100 + 1e-9) / 100;
  return percent > 0 ? percent : null;
}

interface PredictRebateBannerProps {
  /** The MetaMask fee on this order, in USD. */
  metamaskFeeUsd: number;
  /** The order amount, in USD. */
  notionalUsd: number;
  twClassName?: string;
}

/**
 * Loads the Predict rebate quote and renders the shared banner with the
 * rebate as a share of this order's MetaMask fee.
 */
const PredictRebateBanner: React.FC<PredictRebateBannerProps> = ({
  metamaskFeeUsd,
  notionalUsd,
  twClassName,
}) => {
  const { data } = usePredictRebateQuote();
  const rebatePercent = predictRebatePercent(data, metamaskFeeUsd, notionalUsd);

  if (rebatePercent === null) {
    return null;
  }

  return (
    <RebateBanner
      rebatePercent={rebatePercent}
      testID={PREDICT_REBATE_BANNER_TEST_ID}
      twClassName={twClassName}
    />
  );
};

export default PredictRebateBanner;
