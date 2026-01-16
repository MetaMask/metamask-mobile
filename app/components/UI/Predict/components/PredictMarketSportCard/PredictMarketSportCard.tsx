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
  const game = market.game;
  const isEnded = game?.status === 'ended';

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
        awayColor={game?.awayTeam.color ?? '#1a2942'}
        homeColor={game?.homeTeam.color ?? '#3d2621'}
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

          {game && (
            <PredictSportScoreboard
              game={game}
              testID={testID ? `${testID}-scoreboard` : undefined}
            />
          )}

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
