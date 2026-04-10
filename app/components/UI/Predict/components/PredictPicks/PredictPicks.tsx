import { Box } from '@metamask/design-system-react-native';
import React from 'react';
import { usePredictLivePositions } from '../../hooks/usePredictLivePositions';
import { PredictEventValues } from '../../constants/eventNames';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { usePredictActionGuard } from '../../hooks/usePredictActionGuard';
import { PredictMarket, PredictPosition } from '../../types';
import Routes from '../../../../../constants/navigation/Routes';
import { PredictNavigationParamList } from '../../types/navigation';
import PredictPickItem from './PredictPickItem';
import {
  PREDICT_PICKS_TEST_ID,
  PREDICT_PICKS_TEST_IDS,
} from './PredictPicks.testIds';

interface PredictPicksProps {
  market: PredictMarket;
  positions: PredictPosition[];
  claimablePositions: PredictPosition[];
  testID?: string;
}

const PredictPicks: React.FC<PredictPicksProps> = ({
  market,
  positions,
  claimablePositions,
  testID = PREDICT_PICKS_TEST_ID,
}) => {
  const { livePositions } = usePredictLivePositions(positions);
  const navigation =
    useNavigation<NavigationProp<PredictNavigationParamList>>();
  const { navigate } = navigation;
  const { executeGuardedAction } = usePredictActionGuard({
    navigation,
  });

  const onCashOut = (position: PredictPosition) => {
    executeGuardedAction(
      () => {
        const outcome = market?.outcomes.find(
          (o) => o.id === position.outcomeId,
        );
        navigate(Routes.PREDICT.MODALS.SELL_PREVIEW, {
          market,
          position,
          outcome,
          entryPoint: PredictEventValues.ENTRY_POINT.PREDICT_MARKET_DETAILS,
        });
      },
      { attemptedAction: PredictEventValues.ATTEMPTED_ACTION.CASHOUT },
    );
  };

  return (
    <Box testID={testID} twClassName="flex-col">
      {livePositions.map((position) => (
        <PredictPickItem
          key={position.id}
          position={position}
          onCashOut={onCashOut}
          testID={`${testID}${PREDICT_PICKS_TEST_IDS.ITEM}${position.id}`}
        />
      ))}
      {claimablePositions.map((position) => (
        <PredictPickItem
          key={position.id}
          position={position}
          onCashOut={onCashOut}
          testID={`${testID}${PREDICT_PICKS_TEST_IDS.ITEM}${position.id}`}
        />
      ))}
    </Box>
  );
};

export default PredictPicks;
