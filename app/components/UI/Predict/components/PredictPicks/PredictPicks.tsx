import { Box } from '@metamask/design-system-react-native';
import React, { useContext } from 'react';
import { useSelector } from 'react-redux';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { strings } from '../../../../../../locales/i18n';
import { IconName } from '../../../../../component-library/components/Icons/Icon';
import {
  ToastContext,
  ToastVariants,
} from '../../../../../component-library/components/Toast';
import Logger from '../../../../../util/Logger';
import { usePredictLivePositions } from '../../hooks/usePredictLivePositions';
import { PredictEventValues } from '../../constants/eventNames';
import { usePredictActionGuard } from '../../hooks/usePredictActionGuard';
import { usePredictPreviewSheet } from '../../contexts';
import {
  PredictMarket,
  PredictMarketStatus,
  PredictPosition,
} from '../../types';
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
  const { executeGuardedAction } = usePredictActionGuard({
    navigation,
  });
  const { openSellSheet } = usePredictPreviewSheet();
  const { toastRef } = useContext(ToastContext);

  const extendedLeagues = useSelector(selectExtendedSportsMarketsLeagues);
  const usePositionDetail = market.game?.league
    ? extendedLeagues.includes(market.game.league)
    : false;

  const onCashOut = (position: PredictPosition) => {
    executeGuardedAction(
      () => {
        try {
          const outcome = market?.outcomes.find(
            (o) => o.id === position.outcomeId,
          );
          if (!outcome) {
            throw new Error(
              `Outcome not found for position ${position.id} (outcomeId: ${position.outcomeId})`,
            );
          }
          openSellSheet({
            market,
            position,
            outcome,
            entryPoint: PredictEventValues.ENTRY_POINT.PREDICT_MARKET_DETAILS,
          });
        } catch (error) {
          Logger.error(error as Error, {
            component: 'PredictPicks',
            positionId: position.id,
            outcomeId: position.outcomeId,
          });
          toastRef?.current?.showToast({
            variant: ToastVariants.Icon,
            iconName: IconName.Danger,
            labelOptions: [
              {
                label: strings('predict.order.cashout_failed'),
                isBold: true,
              },
            ],
            hasNoTimeout: false,
          });
        }
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
