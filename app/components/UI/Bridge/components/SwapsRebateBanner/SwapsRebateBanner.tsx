import React from 'react';
import type { QuoteResponse } from '@metamask/bridge-controller';
import RebateBanner from '../../../shared/RebateBanner';
import { useSwapsRebate } from '../../hooks/useSwapsRebate';

export const SWAPS_REBATE_BANNER_TEST_ID = 'swaps-rebate-banner';

interface SwapsRebateBannerProps {
  quote?: QuoteResponse['quote'];
  twClassName?: string;
}

/**
 * Loads the rebate for the selected Swaps quote and renders the shared banner.
 */
const SwapsRebateBanner: React.FC<SwapsRebateBannerProps> = ({
  quote,
  twClassName,
}) => {
  const rebatePercent = useSwapsRebate(quote);

  if (!rebatePercent) {
    return null;
  }

  return (
    <RebateBanner
      rebatePercent={rebatePercent}
      testID={SWAPS_REBATE_BANNER_TEST_ID}
      twClassName={twClassName}
    />
  );
};

export default SwapsRebateBanner;
