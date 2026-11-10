import React from 'react';
import { Box } from '@metamask/design-system-react-native';
import RebateBanner from '../../../shared/RebateBanner';
import {
  usePerpsRebateQuote,
  type UsePerpsRebateQuoteParams,
} from '../../hooks/usePerpsRebateQuote';

export const PERPS_REBATE_BANNER_TEST_ID = 'perps-rebate-banner';
export const PERPS_REBATE_BANNER_CONTAINER_TEST_ID =
  'perps-rebate-banner-container';

type PerpsRebateBannerProps = Omit<UsePerpsRebateQuoteParams, 'enabled'> & {
  containerTwClassName?: string;
  textTwClassName?: string;
  twClassName?: string;
};

/**
 * Loads the current Perps rebate quote and renders the shared banner when
 * eligibility is confirmed.
 */
const PerpsRebateBanner: React.FC<PerpsRebateBannerProps> = ({
  coin,
  containerTwClassName,
  direction,
  notionalUsd,
  textTwClassName,
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

  const banner = (
    <RebateBanner
      rebatePercent={rebatePercent}
      testID={PERPS_REBATE_BANNER_TEST_ID}
      textTwClassName={textTwClassName}
      twClassName={twClassName}
    />
  );

  return containerTwClassName ? (
    <Box
      testID={PERPS_REBATE_BANNER_CONTAINER_TEST_ID}
      twClassName={containerTwClassName}
    >
      {banner}
    </Box>
  ) : (
    banner
  );
};

export default PerpsRebateBanner;
