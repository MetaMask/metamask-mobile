import { Box } from '@metamask/design-system-react-native';
import React from 'react';
import { useSelector } from 'react-redux';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { usePredictLivePositions } from '../../hooks/usePredictLivePositions';
import { PredictEventValues } from '../../constants/eventNames';
import { usePredictActionGuard } from '../../hooks/usePredictActionGuard';
import {
  PredictMarket,
  PredictMarketStatus,
  PredictPosition,
} from '../../types';
import Routes from '../../../../../constants/navigation/Routes';
import { PredictNavigationParamList } from '../../types/navigation';
import { selectExtendedSportsMarketsLeagues } from '../../selectors/featureFlags';
import PredictPickItem from './PredictPickItem';
import PredictPositionDetail from '../PredictPositionDetail';
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

  const extendedLeagues = useSelector(selectExtendedSportsMarketsLeagues);
  const usePositionDetail = market.game?.league
    ? extendedLeagues.includes(market.game.league)
    : false;

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

  if (usePositionDetail) {
    return (
      <Box testID={testID} twClassName="flex-col pt-3">
        {livePositions.map((position) => (
          <PredictPositionDetail
            key={position.id}
            position={position}
            market={market}
            marketStatus={market.status as PredictMarketStatus}
          />
        ))}
        {claimablePositions.map((position) => (
          <PredictPositionDetail
            key={position.id}
            position={position}
            market={market}
            marketStatus={PredictMarketStatus.CLOSED}
          />
        ))}
      </Box>
    );
  }

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
