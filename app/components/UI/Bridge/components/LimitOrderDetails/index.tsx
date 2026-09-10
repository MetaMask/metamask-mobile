import React from 'react';
import { useSelector } from 'react-redux';
import { Box } from '@metamask/design-system-react-native';
import { selectSourceAmount } from '../../../../../core/redux/slices/bridge';
import ExpirationRow from './ExpirationRow';
import { LimitOrderDetailsSelectorsIDs } from './testIds';
import type { LimitOrderDetailsProps } from './types';
import NetworkFeeRow from './NetworkFeeRow';
import PriceRow from './PriceRow';

const LimitOrderDetails: React.FC<LimitOrderDetailsProps> = ({
  expiration,
  onExpirationPress,
  slippage,
  onPricePress,
  networkFee,
  feeToken,
  onNetworkFeePress,
  testID = LimitOrderDetailsSelectorsIDs.CONTAINER,
}) => {
  const sourceAmount = useSelector(selectSourceAmount);
  const isZeroState = !sourceAmount || !(Number(sourceAmount) > 0);

  if (isZeroState) {
    return null;
  }

  return (
    <Box testID={testID} twClassName="w-full pt-3 gap-3">
      <ExpirationRow value={expiration} onPress={onExpirationPress} />
      <PriceRow value={slippage} onPress={onPricePress} />
      <NetworkFeeRow
        amount={networkFee}
        token={feeToken}
        onPress={onNetworkFeePress}
      />
    </Box>
  );
};

export default LimitOrderDetails;
