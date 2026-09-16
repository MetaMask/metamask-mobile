import React from 'react';
import { useSelector } from 'react-redux';
import { Box } from '@metamask/design-system-react-native';
import { selectSourceAmount } from '../../../../../core/redux/slices/bridge';
import ExpirationRow from './ExpirationRow';
import { LimitOrderDetailsSelectorsIDs } from './testIds';
import type { LimitOrderDetailsProps } from './types';
import CostToleranceRow from './CostToleranceRow';

const LimitOrderDetails: React.FC<LimitOrderDetailsProps> = ({
  expiration,
  onExpirationPress,
  costTolerance,
  onCostTolerancePress,
  testID = LimitOrderDetailsSelectorsIDs.CONTAINER,
}) => {
  const sourceAmount = useSelector(selectSourceAmount);
  const isZeroState = !sourceAmount || !(Number(sourceAmount) > 0);

  if (isZeroState) {
    return null;
  }

  return (
    <Box testID={testID} twClassName="w-full pb-3 gap-3">
      <ExpirationRow value={expiration} onPress={onExpirationPress} />
      <CostToleranceRow value={costTolerance} onPress={onCostTolerancePress} />
    </Box>
  );
};

export default LimitOrderDetails;
