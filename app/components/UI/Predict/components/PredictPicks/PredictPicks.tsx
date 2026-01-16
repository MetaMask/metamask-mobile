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
import { useLivePositions } from '../../hooks/useLivePositions';
import { formatPrice } from '../../utils/format';
import { PredictEventValues } from '../../constants/eventNames';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { usePredictActionGuard } from '../../hooks/usePredictActionGuard';
import { PredictMarket, PredictPosition } from '../../types';
import Routes from '../../../../../constants/navigation/Routes';
import { PredictNavigationParamList } from '../../types/navigation';
import { strings } from '../../../../../../locales/i18n';

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
  const { livePositions } = useLivePositions(positions);
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

  const hasPositions = livePositions.length > 0;

  if (!hasPositions) {
    return null;
  }

  return (
    <Box testID={testID} twClassName="flex-col">
      <Text variant={TextVariant.HeadingMd} twClassName="font-medium py-2">
        {strings('predict.market_details.your_picks')}
      </Text>
      {livePositions.map((position) => (
        <Box
          testID={testID}
          twClassName="flex-row justify-between items-center py-3"
          key={position.id}
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
          </Box>
          <Button
            variant={ButtonVariant.Secondary}
            twClassName="py-3 px-4 light:bg-muted/5"
            onPress={() => onCashOut(position)}
            testID={`predict-picks-cash-out-button-${position.id}`}
          >
            <Text variant={TextVariant.BodyMd} twClassName="font-medium">
              {strings('predict.cash_out')}
            </Text>
          </Button>
        </Box>
      ))}
    </Box>
  );
};

export default PredictPicks;
