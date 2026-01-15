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
import { PredictEventValues } from '../../constants/eventNames';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { usePredictActionGuard } from '../../hooks/usePredictActionGuard';
import { PredictMarket, PredictPosition } from '../../types';
import Routes from '../../../../../constants/navigation/Routes';
import { PredictNavigationParamList } from '../../types/navigation';

interface PredictPicksProps {
  market: PredictMarket;
  /**
   * TestID for the component
   */
  testID?: string;
}

const PredictPicks: React.FC<PredictPicksProps> = ({
  market,
  testID = 'predict-picks',
}) => {
  const { positions } = usePredictPositions({
    marketId: market.id,
    autoRefreshTimeout: 10000,
  });
  const navigation =
    useNavigation<NavigationProp<PredictNavigationParamList>>();
  const { navigate } = navigation;
  const { executeGuardedAction } = usePredictActionGuard({
    providerId: market.providerId,
    navigation,
  });

  const onCashOut = (position: PredictPosition) => {
    executeGuardedAction(
      () => {
        const _outcome = market?.outcomes.find(
          (o) => o.id === position.outcomeId,
        );
        navigate(Routes.PREDICT.MODALS.SELL_PREVIEW, {
          market,
          position,
          outcome: _outcome,
          entryPoint: PredictEventValues.ENTRY_POINT.PREDICT_MARKET_DETAILS,
        });
      },
      { attemptedAction: PredictEventValues.ATTEMPTED_ACTION.CASHOUT },
    );
  };

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
            onPress={() => onCashOut(position)}
            testID={`predict-picks-cash-out-button-${position.id}`}
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
