import React, { useCallback } from 'react';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { Box, BoxFlexDirection } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  PredictMarket as PredictMarketType,
  PredictMarketStatus,
  PredictOutcomeToken,
} from '../../types';
import {
  PredictNavigationParamList,
  PredictEntryPoint,
} from '../../types/navigation';
import { PredictEventValues } from '../../constants/eventNames';
import Routes from '../../../../../constants/navigation/Routes';
import TrendingFeedSessionManager from '../../../Trending/services/TrendingFeedSessionManager';
import Skeleton from '../../../../../component-library/components/Skeleton/Skeleton';
import { PredictActionButtons } from '../PredictActionButtons';
import { PredictPicksForCard } from '../PredictPicks';
import { usePredictPositions } from '../../hooks/usePredictPositions';
import { usePredictActionGuard } from '../../hooks/usePredictActionGuard';
import { usePredictClaim } from '../../hooks/usePredictClaim';

interface PredictSportCardFooterProps {
  market: PredictMarketType;
  testID?: string;
  entryPoint?: PredictEntryPoint;
}

const PredictSportCardFooter: React.FC<PredictSportCardFooterProps> = ({
  market,
  testID,
  entryPoint = PredictEventValues.ENTRY_POINT.PREDICT_FEED,
}) => {
  const tw = useTailwind();
  const navigation =
    useNavigation<NavigationProp<PredictNavigationParamList>>();

  const resolvedEntryPoint = TrendingFeedSessionManager.getInstance()
    .isFromTrending
    ? PredictEventValues.ENTRY_POINT.TRENDING
    : entryPoint;

  const { positions, isLoading } = usePredictPositions({
    marketId: market.id,
    autoRefreshTimeout: 10000,
  });

  const { positions: claimablePositions } = usePredictPositions({
    marketId: market.id,
    claimable: true,
  });

  const { executeGuardedAction } = usePredictActionGuard({
    providerId: market.providerId,
    navigation,
  });

  const { claim } = usePredictClaim({
    providerId: market.providerId,
  });

  const outcome = market.outcomes?.[0];
  const isMarketOpen =
    market.status === PredictMarketStatus.OPEN &&
    market.game?.status !== 'ended';

  const handleBetPress = useCallback(
    (token: PredictOutcomeToken) => {
      executeGuardedAction(
        () => {
          navigation.navigate(Routes.PREDICT.MODALS.BUY_PREVIEW, {
            market,
            outcome,
            outcomeToken: token,
            entryPoint: resolvedEntryPoint,
          });
        },
        {
          checkBalance: true,
          attemptedAction: PredictEventValues.ATTEMPTED_ACTION.PREDICT,
        },
      );
    },
    [executeGuardedAction, navigation, market, outcome, resolvedEntryPoint],
  );

  const handleClaimPress = useCallback(async () => {
    await executeGuardedAction(
      async () => {
        await claim();
      },
      { attemptedAction: PredictEventValues.ATTEMPTED_ACTION.CLAIM },
    );
  }, [executeGuardedAction, claim]);

  const hasPositions = positions.length > 0;
  const hasClaimablePositions = claimablePositions.length > 0;
  const claimableAmount = claimablePositions.reduce(
    (sum, p) => sum + (p.currentValue ?? 0),
    0,
  );

  const showBetButtons = isMarketOpen && !hasPositions && outcome;
  const showClaimButton = hasClaimablePositions && outcome;

  if (isLoading) {
    return (
      <Box
        flexDirection={BoxFlexDirection.Row}
        twClassName="w-full gap-3"
        testID={testID ? `${testID}-skeleton` : 'footer-skeleton'}
      >
        <Box twClassName="flex-1">
          <Skeleton
            width="100%"
            height={48}
            style={tw.style('rounded-md')}
            testID={testID ? `${testID}-skeleton-1` : 'footer-skeleton-1'}
          />
        </Box>
        <Box twClassName="flex-1">
          <Skeleton
            width="100%"
            height={48}
            style={tw.style('rounded-md')}
            testID={testID ? `${testID}-skeleton-2` : 'footer-skeleton-2'}
          />
        </Box>
      </Box>
    );
  }

  return (
    <>
      {hasPositions && (
        <PredictPicksForCard
          marketId={market.id}
          positions={positions}
          showSeparator
          testID={testID ? `${testID}-picks` : undefined}
        />
      )}

      {showClaimButton && (
        <PredictActionButtons
          market={market}
          outcome={outcome}
          onBetPress={handleBetPress}
          onClaimPress={handleClaimPress}
          claimableAmount={claimableAmount}
          testID={testID ? `${testID}-action-buttons` : undefined}
        />
      )}

      {showBetButtons && !showClaimButton && (
        <PredictActionButtons
          market={market}
          outcome={outcome}
          onBetPress={handleBetPress}
          testID={testID ? `${testID}-action-buttons` : undefined}
        />
      )}
    </>
  );
};

export default PredictSportCardFooter;
