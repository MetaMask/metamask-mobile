import {
  Box,
  Button,
  ButtonVariant,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import React from 'react';
import { usePredictPositions } from '../../hooks/usePredictPositions';
import { formatPrice } from '../../utils/format';

interface PredictPicksProps {
  marketId: string;
  /**
   * TestID for the component
   */
  testID?: string;
}

const PredictPicks: React.FC<PredictPicksProps> = ({
  marketId,
  testID = 'predict-picks',
}) => {
  const { positions } = usePredictPositions({
    marketId,
    autoRefreshTimeout: 10000,
  });

  const hasPositions = positions.length > 0;

  if (!hasPositions) {
    return null;
  }

  return (
    <Box testID={testID} twClassName="flex-col">
      <Text variant={TextVariant.HeadingMd} twClassName="font-medium py-2">
        Your Picks
      </Text>
      {positions.map((position) => (
        <Box
          testID={testID}
          twClassName="flex-row justify-between items-center py-3"
          key={position.id}
        >
          <Box>
            <Text variant={TextVariant.BodyMd} twClassName="font-medium">
              {formatPrice(position.size, { maximumDecimals: 2 })} on{' '}
              {position.outcome}
            </Text>
            <Text
              variant={TextVariant.BodyMd}
              color={
                position.cashPnl > 0
                  ? TextColor.SuccessDefault
                  : TextColor.ErrorDefault
              }
              twClassName="font-medium"
            >
              {formatPrice(position.cashPnl, { maximumDecimals: 2 })}
            </Text>
          </Box>
          <Button
            variant={ButtonVariant.Secondary}
            twClassName="py-3 px-4 bg-muted/5"
          >
            <Text variant={TextVariant.BodyMd} twClassName="font-medium">
              Cash Out
            </Text>
          </Button>
        </Box>
      ))}
    </Box>
  );
};

export default PredictPicks;
