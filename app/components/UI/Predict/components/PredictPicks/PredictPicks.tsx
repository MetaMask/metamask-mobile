import { Box } from '@metamask/design-system-react-native';
import React from 'react';
import { useSelector } from 'react-redux';
import { usePredictLivePositions } from '../../hooks/usePredictLivePositions';
import { usePredictCashOut } from '../../hooks/usePredictCashOut';
import {
  PredictMarket,
  PredictMarketStatus,
  PredictPosition,
} from '../../types';
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
  const { onCashOut } = usePredictCashOut({
    market,
    callerName: 'PredictPicks',
  });

  const extendedLeagues = useSelector(selectExtendedSportsMarketsLeagues);
  const usePositionDetail = market.game?.league
    ? extendedLeagues.includes(market.game.league)
    : false;

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
