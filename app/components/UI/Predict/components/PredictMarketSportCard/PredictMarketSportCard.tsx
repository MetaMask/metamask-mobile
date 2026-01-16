import {
  Box,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import React, { useCallback } from 'react';
import { TouchableOpacity } from 'react-native';
import {
  PredictMarket as PredictMarketType,
  PredictOutcomeToken,
} from '../../types';
import {
  PredictNavigationParamList,
  PredictEntryPoint,
} from '../../types/navigation';
import { PredictEventValues } from '../../constants/eventNames';
import Routes from '../../../../../constants/navigation/Routes';
import TrendingFeedSessionManager from '../../../Trending/services/TrendingFeedSessionManager';
import PredictSportTeamGradient from '../PredictSportTeamGradient/PredictSportTeamGradient';
import PredictSportScoreboard from '../PredictSportScoreboard/PredictSportScoreboard';
import { PredictActionButtons } from '../PredictActionButtons';
import { usePredictActionGuard } from '../../hooks/usePredictActionGuard';
import { formatGameStartTime } from '../../utils/format';

interface PredictMarketSportCardProps {
  market: PredictMarketType;
  testID?: string;
  entryPoint?: PredictEntryPoint;
}

const PredictMarketSportCard: React.FC<PredictMarketSportCardProps> = ({
  market,
  testID,
  entryPoint = PredictEventValues.ENTRY_POINT.PREDICT_FEED,
}) => {
  const resolvedEntryPoint = TrendingFeedSessionManager.getInstance()
    .isFromTrending
    ? PredictEventValues.ENTRY_POINT.TRENDING
    : entryPoint;

  const navigation =
    useNavigation<NavigationProp<PredictNavigationParamList>>();
  const tw = useTailwind();

  const { executeGuardedAction } = usePredictActionGuard({
    providerId: market.providerId,
    navigation,
  });

  const outcome = market.outcomes?.[0];

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

  const { date: gameDate, time: gameTime } = formatGameStartTime(
    market.game?.startTime,
  );

  // Derive game state for conditional props
  // Use resolved gameStatus to ensure consistency when market.game is undefined
  // Use case-insensitive comparison for halftime since API may return 'ht', 'HT', or 'Ht'
  const gameStatus = market.game?.status ?? 'scheduled';
  const isScheduled = gameStatus === 'scheduled';
  const isOngoing = gameStatus === 'ongoing';
  const isEnded = gameStatus === 'ended';
  const isHalftime = isOngoing && market.game?.period?.toUpperCase() === 'HT';
  const isInProgress = isOngoing && !isHalftime;

  return (
    <TouchableOpacity
      testID={testID}
      onPress={() => {
        navigation.navigate(Routes.PREDICT.ROOT, {
          screen: Routes.PREDICT.MARKET_DETAILS,
          params: {
            marketId: market.id,
            entryPoint: resolvedEntryPoint,
            title: market.title,
            image: market.image,
          },
        });
      }}
    >
      <PredictSportTeamGradient
        awayColor={market.game?.awayTeam.color ?? '#1a2942'}
        homeColor={market.game?.homeTeam.color ?? '#3d2621'}
        borderRadius={16}
        style={tw.style('w-full')}
      >
        <Box twClassName="p-4">
          <Text
            variant={TextVariant.HeadingSm}
            color={TextColor.TextDefault}
            twClassName="text-center font-medium"
          >
            {market.title}
          </Text>

          <PredictSportScoreboard
            awayTeam={{
              abbreviation: market.game?.awayTeam.abbreviation ?? 'TBD',
              color: market.game?.awayTeam.color ?? '#1D4E9B',
            }}
            homeTeam={{
              abbreviation: market.game?.homeTeam.abbreviation ?? 'TBD',
              color: market.game?.homeTeam.color ?? '#FC4C02',
            }}
            gameStatus={gameStatus}
            period={market.game?.period}
            homeScore={market.game?.score?.home}
            awayScore={market.game?.score?.away}
            // Pre-game: show scheduled date/time; In-progress: show quarter/elapsed
            date={isScheduled ? gameDate : undefined}
            time={
              isScheduled
                ? gameTime
                : isInProgress
                  ? (market.game?.elapsed ?? undefined)
                  : undefined
            }
            quarter={
              isInProgress ? (market.game?.period ?? undefined) : undefined
            }
            turn={market.game?.turn}
            testID={testID ? `${testID}-scoreboard` : undefined}
          />

          {outcome && !isEnded && (
            <PredictActionButtons
              market={market}
              outcome={outcome}
              onBetPress={handleBetPress}
              testID={testID ? `${testID}-action-buttons` : undefined}
            />
          )}
        </Box>
      </PredictSportTeamGradient>
    </TouchableOpacity>
  );
};

export default PredictMarketSportCard;
