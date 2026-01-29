import {
  Box,
  Button,
  ButtonVariant,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import React from 'react';
import { PredictPosition } from '../../types';
import { formatPrice } from '../../utils/format';
import { strings } from '../../../../../../locales/i18n';
import { Skeleton } from '../../../../../component-library/components/Skeleton';
import { usePredictOptimisticPositionRefresh } from '../../hooks/usePredictOptimisticPositionRefresh';

interface PredictPickItemProps {
  position: PredictPosition;
  onCashOut: (position: PredictPosition) => void;
  testID: string;
}

const PredictPickItem: React.FC<PredictPickItemProps> = ({
  position,
  onCashOut,
  testID,
}) => {
  const currentPosition = usePredictOptimisticPositionRefresh({
    position,
  });

  const isOptimistic = currentPosition.optimistic ?? false;

  return (
    <Box
      testID={testID}
      twClassName="flex-row justify-between items-center py-3"
    >
      <Box>
        <Text variant={TextVariant.BodyMd} twClassName="font-medium">
          {strings('predict.position_pick_info', {
            initialValue: formatPrice(position.initialValue, {
              maximumDecimals: 2,
            }),
            outcome: position.outcome,
          })}
        </Text>
        {isOptimistic ? (
          <Skeleton width={50} height={16} />
        ) : (
          <Text
            variant={TextVariant.BodyMd}
            color={
              position.cashPnl < 0
                ? TextColor.ErrorDefault
                : TextColor.SuccessDefault
            }
            twClassName="font-medium"
            testID={`predict-picks-pnl-${position.id}`}
          >
            {formatPrice(position.cashPnl, { maximumDecimals: 2 })}
          </Text>
        )}
      </Box>
      {!position.claimable && (
        <Button
          variant={ButtonVariant.Secondary}
          twClassName="light:bg-muted/5"
          onPress={() => onCashOut(currentPosition)}
          isDisabled={isOptimistic}
          testID={`predict-picks-cash-out-button-${position.id}`}
        >
          <Text variant={TextVariant.BodyMd} twClassName="font-medium">
            {strings('predict.cash_out')}
          </Text>
        </Button>
      )}
    </Box>
  );
};

export default PredictPickItem;
