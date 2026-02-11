import React from 'react';
import {
  Box,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { formatPrice } from '../../utils/format';
import { strings } from '../../../../../../locales/i18n';
import { Skeleton } from '../../../../../component-library/components/Skeleton';
import { usePredictOptimisticPositionRefresh } from '../../hooks/usePredictOptimisticPositionRefresh';
import type { PredictPosition } from '../../types';

interface PredictPicksForCardItemProps {
  position: PredictPosition;
  testID: string;
}

const PredictPicksForCardItem: React.FC<PredictPicksForCardItemProps> = ({
  position,
  testID,
}) => {
  const currentPosition = usePredictOptimisticPositionRefresh({
    position,
  });

  const isOptimistic = currentPosition.optimistic ?? false;

  return (
    <Box
      testID={testID}
      twClassName="flex-row justify-between items-center gap-2"
    >
      <Text>
        {strings('predict.position_pick_info_to_win', {
          initialValue: formatPrice(position.initialValue, {
            maximumDecimals: 2,
          }),
          outcome: position.outcome,
        })}
      </Text>
      <Box twClassName="flex-row gap-2">
        {isOptimistic ? (
          <>
            <Skeleton width={50} height={16} />
            <Skeleton width={50} height={16} />
          </>
        ) : (
          <>
            <Text
              color={
                position.cashPnl < 0
                  ? TextColor.ErrorDefault
                  : TextColor.SuccessDefault
              }
              variant={TextVariant.BodyMd}
              testID={`predict-picks-for-card-pnl-${position.id}`}
            >
              {formatPrice(position.cashPnl, { maximumDecimals: 2 })}
            </Text>
            <Text color={TextColor.TextDefault}>
              {formatPrice(position.currentValue, {
                maximumDecimals: 2,
              })}
            </Text>
          </>
        )}
      </Box>
    </Box>
  );
};

export default PredictPicksForCardItem;
