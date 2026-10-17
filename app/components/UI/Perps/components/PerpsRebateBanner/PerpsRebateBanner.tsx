import React from 'react';
import RebateBanner from '../../../shared/RebateBanner';
import {
  usePerpsRebateQuote,
  type UsePerpsRebateQuoteParams,
} from '../../hooks/usePerpsRebateQuote';

export const PERPS_REBATE_BANNER_TEST_ID = 'perps-rebate-banner';

type PerpsRebateBannerProps = Omit<UsePerpsRebateQuoteParams, 'enabled'> & {
  twClassName?: string;
};

/**
 * Loads the current Perps rebate quote and renders the shared banner when
 * eligibility is confirmed.
 */
const PerpsRebateBanner: React.FC<PerpsRebateBannerProps> = ({
  coin,
  direction,
  notionalUsd,
  twClassName,
}) => {
  const { data } = usePerpsRebateQuote({
    coin,
    direction,
    notionalUsd,
  });
  const rebatePercent =
    data?.eligible && data.reason === null && data.rebateBips > 0
      ? data.rebateBips / 100
      : null;

  if (!rebatePercent) {
    return null;
  }

  return (
    <RebateBanner
      rebatePercent={rebatePercent}
      testID={PERPS_REBATE_BANNER_TEST_ID}
      twClassName={twClassName}
    />
  );
};

export default PerpsRebateBanner;
