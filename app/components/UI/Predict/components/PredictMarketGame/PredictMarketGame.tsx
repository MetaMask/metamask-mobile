import React from 'react';
import { Image, Pressable } from 'react-native';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { usePredictActionGuard } from '../../hooks/usePredictActionGuard';
import {
  PredictMarket as PredictMarketType,
  PredictOutcomeToken,
  PredictSportTeam,
  PredictGameStatus,
} from '../../types';
import {
  PredictNavigationParamList,
  PredictEntryPoint,
} from '../../types/navigation';
import { formatVolume } from '../../utils/format';
import { PredictEventValues } from '../../constants/eventNames';
import TrendingFeedSessionManager from '../../../Trending/services/TrendingFeedSessionManager';

interface PredictMarketGameProps {
  market: PredictMarketType;
  testID?: string;
  entryPoint?: PredictEntryPoint;
  isCarousel?: boolean;
}

const formatGameTime = (startTime: string): string => {
  const date = new Date(startTime);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const parseScore = (score: string): { away: string; home: string } => {
  if (!score) {
    return { away: '0', home: '0' };
  }
  const [away, home] = score.split('-');
  return { away: away || '0', home: home || '0' };
};

const getOddsPercentage = (token: PredictOutcomeToken): number =>
  Math.round(token.price * 100);

interface TeamRowProps {
  team: PredictSportTeam;
  score: string;
  odds: number;
  teamColor: string;
  status: PredictGameStatus;
  onOddsPress: () => void;
}

const TeamRow: React.FC<TeamRowProps> = ({
  team,
  score,
  odds,
  teamColor,
  status,
  onOddsPress,
}) => {
  const tw = useTailwind();

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Between}
      twClassName="w-full py-2"
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="flex-1 gap-3"
      >
        <Box twClassName="w-10 h-10 rounded-lg overflow-hidden bg-muted">
          {team.logo ? (
            <Image
              source={{ uri: team.logo }}
              style={tw.style('w-full h-full')}
              resizeMode="contain"
            />
          ) : (
            <Box twClassName="w-full h-full bg-muted" />
          )}
        </Box>
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextDefault}
          style={tw.style('font-medium flex-1')}
          numberOfLines={1}
        >
          {team.name}
        </Text>
        {status !== 'scheduled' && (
          <Text
            variant={TextVariant.HeadingMd}
            color={TextColor.TextDefault}
            style={tw.style('font-bold min-w-8 text-center')}
          >
            {score}
          </Text>
        )}
      </Box>
      <Pressable
        onPress={onOddsPress}
        style={({ pressed }) =>
          tw.style(
            'min-w-16 px-4 py-2 rounded-lg items-center justify-center ml-3',
            pressed && 'opacity-80',
          )
        }
      >
        {({ pressed }) => (
          <Box
            twClassName="min-w-16 px-4 py-2 rounded-lg items-center justify-center"
            style={{
              backgroundColor: `${teamColor}33`,
              opacity: pressed ? 0.8 : 1,
            }}
          >
            <Text
              variant={TextVariant.BodyMd}
              style={tw.style('font-semibold')}
            >
              {odds}%
            </Text>
          </Box>
        )}
      </Pressable>
    </Box>
  );
};

interface GameStatusDisplayProps {
  status: PredictGameStatus;
  startTime: string;
  period: string;
  elapsed: string;
}

const GameStatusDisplay: React.FC<GameStatusDisplayProps> = ({
  status,
  startTime,
  period,
  elapsed,
}) => {
  const tw = useTailwind();

  if (status === 'scheduled') {
    return (
      <Text
        variant={TextVariant.BodySm}
        color={TextColor.TextAlternative}
        style={tw.style('text-center')}
      >
        {formatGameTime(startTime)}
      </Text>
    );
  }

  if (status === 'ended') {
    return (
      <Text
        variant={TextVariant.BodySm}
        color={TextColor.TextAlternative}
        style={tw.style('text-center font-medium')}
      >
        Final
      </Text>
    );
  }

  const periodDisplay = period || '';
  const elapsedDisplay = elapsed ? ` ${elapsed}` : '';

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      twClassName="gap-1"
    >
      <Box twClassName="w-2 h-2 rounded-full bg-error-default" />
      <Text
        variant={TextVariant.BodySm}
        color={TextColor.TextAlternative}
        style={tw.style('font-medium')}
      >
        {periodDisplay}
        {elapsedDisplay}
      </Text>
    </Box>
  );
};

const PredictMarketGame: React.FC<PredictMarketGameProps> = ({
  market,
  testID,
  entryPoint = PredictEventValues.ENTRY_POINT.PREDICT_FEED,
  isCarousel = false,
}) => {
  const tw = useTailwind();
  const navigation =
    useNavigation<NavigationProp<PredictNavigationParamList>>();

  const resolvedEntryPoint = TrendingFeedSessionManager.getInstance()
    .isFromTrending
    ? PredictEventValues.ENTRY_POINT.TRENDING
    : entryPoint;

  const { executeGuardedAction } = usePredictActionGuard({
    providerId: market.providerId,
    navigation,
  });

  const game = market.game;
  if (!game) {
    return null;
  }

  const outcome = market.outcomes[0];
  if (!outcome || outcome.tokens.length < 2) {
    return null;
  }

  const { away: awayScore, home: homeScore } = parseScore(game.score);
  const awayToken = outcome.tokens[0];
  const homeToken = outcome.tokens[1];

  const handleBuy = (token: PredictOutcomeToken) => {
    executeGuardedAction(
      () => {
        navigation.navigate(Routes.PREDICT.ROOT, {
          screen: Routes.PREDICT.MODALS.BUY_PREVIEW,
          params: {
            market,
            outcome,
            outcomeToken: token,
            entryPoint: resolvedEntryPoint,
          },
        });
      },
      {
        checkBalance: true,
        attemptedAction: PredictEventValues.ATTEMPTED_ACTION.PREDICT,
      },
    );
  };

  const handleCardPress = () => {
    navigation.navigate(Routes.PREDICT.ROOT, {
      screen: Routes.PREDICT.MARKET_DETAILS,
      params: {
        marketId: market.id,
        entryPoint: resolvedEntryPoint,
        title: market.title,
        image: market.image,
      },
    });
  };

  return (
    <Pressable testID={testID} onPress={handleCardPress}>
      {({ pressed }) => (
        <Box
          twClassName={`w-full rounded-2xl p-4 bg-background-section ${
            isCarousel ? 'h-full' : 'my-2'
          } ${pressed ? 'opacity-90' : ''}`}
        >
          <TeamRow
            team={game.awayTeam}
            score={awayScore}
            odds={getOddsPercentage(awayToken)}
            teamColor={game.awayTeam.color}
            status={game.status}
            onOddsPress={() => handleBuy(awayToken)}
          />

          <Box twClassName="items-center py-2">
            <GameStatusDisplay
              status={game.status}
              startTime={game.startTime}
              period={game.period}
              elapsed={game.elapsed}
            />
          </Box>

          <TeamRow
            team={game.homeTeam}
            score={homeScore}
            odds={getOddsPercentage(homeToken)}
            teamColor={game.homeTeam.color}
            status={game.status}
            onOddsPress={() => handleBuy(homeToken)}
          />

          <Box
            flexDirection={BoxFlexDirection.Row}
            twClassName="w-full mt-2 justify-end"
          >
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
            >
              ${formatVolume(market.volume ?? 0)}{' '}
              {strings('predict.volume_abbreviated')}
            </Text>
          </Box>
        </Box>
      )}
    </Pressable>
  );
};

export default PredictMarketGame;
