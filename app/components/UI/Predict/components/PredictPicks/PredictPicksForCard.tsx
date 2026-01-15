import React from 'react';
import {
  Box,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';

import { usePredictPositions } from '../../hooks/usePredictPositions';
import { formatPrice } from '../../utils/format';

interface PredictPicksForCardProps {
  marketId: string;
  testID?: string;
}
const PredictPicksForCard: React.FC<PredictPicksForCardProps> = ({
  marketId,
  testID = 'predict-picks-for-card',
}) => {
  const { positions } = usePredictPositions({
    marketId,
    autoRefreshTimeout: 10000,
  });

  return (
    <Box testID={testID} twClassName="flex-col gap-2">
      {positions.map((position) => (
        <Box
          testID={testID}
          twClassName="flex-row justify-between items-center gap-2"
          key={position.id}
        >
          <Text>{`${formatPrice(position.size, { maximumDecimals: 2 })} on ${position.outcome} to win`}</Text>
          <Box twClassName="flex-row gap-2">
            <Text
              color={
                position.cashPnl > 0
                  ? TextColor.SuccessDefault
                  : TextColor.ErrorDefault
              }
              variant={TextVariant.BodyMd}
            >
              {formatPrice(position.cashPnl, { maximumDecimals: 2 })}
            </Text>
            <Text color={TextColor.TextDefault}>
              {formatPrice(position.amount, { maximumDecimals: 2 })}
            </Text>
          </Box>
        </Box>
      ))}
    </Box>
  );
};

export default PredictPicksForCard;
