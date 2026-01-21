import { Box, Text, TextVariant } from '@metamask/design-system-react-native';
import React from 'react';
import { usePredictPositions } from '../../hooks/usePredictPositions';
import { useLivePositions } from '../../hooks/useLivePositions';
import { PredictEventValues } from '../../constants/eventNames';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { usePredictActionGuard } from '../../hooks/usePredictActionGuard';
import { PredictMarket, PredictPosition } from '../../types';
import Routes from '../../../../../constants/navigation/Routes';
import { PredictNavigationParamList } from '../../types/navigation';
import { strings } from '../../../../../../locales/i18n';
import PredictPickItem from './PredictPickItem';

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

  if (livePositions.length === 0) {
    return null;
  }

  return (
    <Box testID={testID} twClassName="flex-col">
      <Text variant={TextVariant.HeadingMd} twClassName="font-medium py-2">
        {strings('predict.market_details.your_picks')}
      </Text>
      {livePositions.map((position) => (
        <PredictPickItem
          key={position.id}
          position={position}
          onCashOut={onCashOut}
          testID={`${testID}-item-${position.id}`}
        />
      ))}
    </Box>
  );
};

export default PredictPicks;
