import React from 'react';
import { Pressable, View } from 'react-native';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
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
import Routes from '../../../../../constants/navigation/Routes';
import { usePredictActionGuard } from '../../hooks/usePredictActionGuard';
import {
  PredictMarket as PredictMarketType,
  PredictOutcomeToken,
  PredictMarketGame as PredictMarketGameType,
} from '../../types';
import {
  PredictNavigationParamList,
  PredictEntryPoint,
} from '../../types/navigation';
import { PredictEventValues } from '../../constants/eventNames';
import TrendingFeedSessionManager from '../../../Trending/services/TrendingFeedSessionManager';
import TeamHelmet from '../TeamHelmet';
import { formatPeriodDisplay } from '../../utils/gameParser';

interface PredictMarketGameProps {
  market: PredictMarketType;
  testID?: string;
  entryPoint?: PredictEntryPoint;
  isCarousel?: boolean;
}

const formatScheduledTime = (
  startTime: string,
): { date: string; time: string } => {
  const dateObj = new Date(startTime);
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];

  const weekday = weekdays[dateObj.getDay()];
  const month = months[dateObj.getMonth()];
  const day = dateObj.getDate();

  let hours = dateObj.getHours();
  const minutes = dateObj.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;

  return {
    date: `${weekday}, ${month} ${day}`,
    time: `${hours}:${minutes} ${ampm}`,
  };
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

interface ScheduledContentProps {
  game: PredictMarketGameType;
  awayToken: PredictOutcomeToken;
  homeToken: PredictOutcomeToken;
  onBuyAway: () => void;
  onBuyHome: () => void;
}

const ScheduledContent: React.FC<ScheduledContentProps> = ({
  game,
  awayToken,
  homeToken,
  onBuyAway,
  onBuyHome,
}) => {
  const tw = useTailwind();
  const { date, time } = formatScheduledTime(game.startTime);
  const awayOdds = getOddsPercentage(awayToken);
  const homeOdds = getOddsPercentage(homeToken);

  return (
    <>
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
        twClassName="w-full py-3"
      >
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="gap-3"
        >
          <TeamHelmet color={game.awayTeam.color} size={48} flipped />
          <Text
            variant={TextVariant.HeadingMd}
            color={TextColor.TextDefault}
            style={tw.style('font-bold')}
          >
            {game.awayTeam.abbreviation.toUpperCase()}
          </Text>
        </Box>

        <Box twClassName="items-center">
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.TextAlternative}
            style={tw.style('text-center')}
          >
            {date}
          </Text>
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.TextAlternative}
            style={tw.style('text-center')}
          >
            {time}
          </Text>
        </Box>

        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="gap-3"
        >
          <Text
            variant={TextVariant.HeadingMd}
            color={TextColor.TextDefault}
            style={tw.style('font-bold')}
          >
            {game.homeTeam.abbreviation.toUpperCase()}
          </Text>
          <TeamHelmet color={game.homeTeam.color} size={48} />
        </Box>
      </Box>

      <Box flexDirection={BoxFlexDirection.Row} twClassName="gap-3 mt-2">
        <Pressable onPress={onBuyAway} style={tw.style('flex-1')}>
          {({ pressed }) => (
            <Box
              twClassName="py-3 rounded-xl items-center justify-center"
              style={{
                backgroundColor: game.awayTeam.color,
                opacity: pressed ? 0.8 : 1,
              }}
            >
              <Text
                variant={TextVariant.BodyMd}
                style={tw.style('font-bold text-white')}
              >
                {game.awayTeam.abbreviation.toUpperCase()} {awayOdds}%
              </Text>
            </Box>
          )}
        </Pressable>
        <Pressable onPress={onBuyHome} style={tw.style('flex-1')}>
          {({ pressed }) => (
            <Box
              twClassName="py-3 rounded-xl items-center justify-center"
              style={{
                backgroundColor: game.homeTeam.color,
                opacity: pressed ? 0.8 : 1,
              }}
            >
              <Text
                variant={TextVariant.BodyMd}
                style={tw.style('font-bold text-white')}
              >
                {game.homeTeam.abbreviation.toUpperCase()} {homeOdds}%
              </Text>
            </Box>
          )}
        </Pressable>
      </Box>
    </>
  );
};

interface OngoingContentProps {
  game: PredictMarketGameType;
}

const OngoingContent: React.FC<OngoingContentProps> = ({ game }) => {
  const tw = useTailwind();
  const { away: awayScore, home: homeScore } = parseScore(game.score);

  const periodDisplay = formatPeriodDisplay(game.period || '');
  const elapsedDisplay = game.elapsed || '';

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Between}
      twClassName="w-full py-3"
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="gap-3"
      >
        <TeamHelmet color={game.awayTeam.color} size={48} flipped />
        <Text
          variant={TextVariant.DisplayMd}
          color={TextColor.TextDefault}
          style={tw.style('font-bold')}
        >
          {awayScore}
        </Text>
      </Box>

      <Box twClassName="items-center">
        <Text
          variant={TextVariant.BodySm}
          color={TextColor.TextAlternative}
          style={tw.style('text-center font-medium')}
        >
          {periodDisplay}
          {elapsedDisplay ? ` ${elapsedDisplay}` : ''}
        </Text>
      </Box>

      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="gap-3"
      >
        <Text
          variant={TextVariant.DisplayMd}
          color={TextColor.TextDefault}
          style={tw.style('font-bold')}
        >
          {homeScore}
        </Text>
        <TeamHelmet color={game.homeTeam.color} size={48} />
      </Box>
    </Box>
  );
};

interface EndedContentProps {
  game: PredictMarketGameType;
}

const EndedContent: React.FC<EndedContentProps> = ({ game }) => {
  const tw = useTailwind();
  const { away: awayScore, home: homeScore } = parseScore(game.score);
  const awayWon = parseInt(awayScore, 10) > parseInt(homeScore, 10);
  const homeWon = parseInt(homeScore, 10) > parseInt(awayScore, 10);

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Between}
      twClassName="w-full py-3"
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="gap-3"
      >
        <TeamHelmet color={game.awayTeam.color} size={48} flipped />
        <Text
          variant={TextVariant.HeadingLg}
          color={awayWon ? TextColor.SuccessDefault : TextColor.TextMuted}
          style={tw.style('font-bold')}
        >
          {awayWon ? 'WIN' : 'LOSE'}
        </Text>
      </Box>

      <Box twClassName="items-center">
        <Text
          variant={TextVariant.BodySm}
          color={TextColor.TextAlternative}
          style={tw.style('text-center font-medium')}
        >
          Final
        </Text>
      </Box>

      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="gap-3"
      >
        <Text
          variant={TextVariant.HeadingLg}
          color={homeWon ? TextColor.SuccessDefault : TextColor.TextMuted}
          style={tw.style('font-bold')}
        >
          {homeWon ? 'WIN' : 'LOSE'}
        </Text>
        <TeamHelmet color={game.homeTeam.color} size={48} />
      </Box>
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
        isGame: true,
      },
    });
  };

  const gradientColors = [
    `${game.awayTeam.color}30`,
    `${game.homeTeam.color}20`,
    'transparent',
  ];

  const renderContent = () => {
    switch (game.status) {
      case 'scheduled':
        return (
          <ScheduledContent
            game={game}
            awayToken={awayToken}
            homeToken={homeToken}
            onBuyAway={() => handleBuy(awayToken)}
            onBuyHome={() => handleBuy(homeToken)}
          />
        );
      case 'ongoing':
        return <OngoingContent game={game} />;
      case 'ended':
        return <EndedContent game={game} />;
      default:
        return null;
    }
  };

  return (
    <Pressable testID={testID} onPress={handleCardPress}>
      {({ pressed }) => (
        <View
          style={tw.style(
            `w-full rounded-2xl overflow-hidden ${isCarousel ? 'h-full' : 'my-2'}`,
            pressed && 'opacity-90',
          )}
        >
          <LinearGradient
            colors={gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={tw.style('absolute inset-0')}
          />
          <Box twClassName="p-4 bg-background-section/80 rounded-2xl">
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextDefault}
              style={tw.style('text-center font-medium mb-1')}
            >
              {market.title}
            </Text>

            {renderContent()}
          </Box>
        </View>
      )}
    </Pressable>
  );
};

export default PredictMarketGame;
