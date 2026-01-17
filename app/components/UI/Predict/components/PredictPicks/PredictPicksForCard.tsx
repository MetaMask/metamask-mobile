import React from 'react';
import {
  Box,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';

import { usePredictPositions } from '../../hooks/usePredictPositions';
import { formatPrice } from '../../utils/format';
import { strings } from '../../../../../../locales/i18n';

interface PredictPicksForCardProps {
  marketId: string;
  testID?: string;
  /**
   * When true, renders a separator line above the positions list
   * Only renders if there are positions to display
   */
  showSeparator?: boolean;
}
const PredictPicksForCard: React.FC<PredictPicksForCardProps> = ({
  marketId,
  testID = 'predict-picks-for-card',
  showSeparator = false,
}) => {
  const { positions } = usePredictPositions({
    marketId,
    autoRefreshTimeout: 10000,
  });

  if (positions.length === 0) {
    return null;
  }

  return (
    <Box testID={testID} twClassName="flex-col gap-2">
      {showSeparator && (
        <Box
          testID={`${testID}-separator`}
          twClassName="h-px bg-border-muted my-2"
        />
      )}
      {positions.map((position) => (
        <Box
          testID={testID}
          twClassName="flex-row justify-between items-center gap-2"
          key={position.id}
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
              {formatPrice(position.currentValue, { maximumDecimals: 2 })}
            </Text>
          </Box>
        </Box>
      ))}
    </Box>
  );
};

export default PredictPicksForCard;
