import {
  NavigationProp,
  RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { useTheme } from '../../../../../util/theme';
import { PredictNavigationParamList } from '../../types/navigation';
import { PredictEventValues } from '../../constants/eventNames';
import { formatVolume } from '../../utils/format';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import PredictGameChart, {
  GameChartSeries,
} from '../../components/PredictGameChart';
import { usePredictMarket } from '../../hooks/usePredictMarket';
import { usePredictLiveMarket } from '../../hooks/usePredictLiveMarket';
import { usePredictPriceHistory } from '../../hooks/usePredictPriceHistory';
import { usePredictPositions } from '../../hooks/usePredictPositions';
import {
  PredictPriceHistoryInterval,
  PredictOutcomeToken,
  PredictMarketGame,
  PredictPosition,
} from '../../types';
import { usePredictActionGuard } from '../../hooks/usePredictActionGuard';
import PredictShareButton from '../../components/PredictShareButton/PredictShareButton';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import TeamHelmet from '../../components/TeamHelmet';
import FootballIcon from '../../components/FootballIcon';
import { formatPeriodDisplay } from '../../utils/gameParser';

const ONE_WEEK_FIDELITY = 168;

const parseScore = (score: string): { away: string; home: string } => {
  if (!score) {
    return { away: '0', home: '0' };
  }
  const [away, home] = score.split('-');
  return { away: away || '0', home: home || '0' };
};

const formatGameTime = (startTime: string): string => {
  const date = new Date(startTime);

  const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][
    date.getDay()
  ];
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
  const month = months[date.getMonth()];
  const day = date.getDate();

  let hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;

  return `${weekday}, ${month} ${day} @ ${hours}:${minutes} ${ampm}`;
};

const formatCurrency = (value: number): string => {
  const absValue = Math.abs(value);
  const formatted = absValue < 0.01 ? absValue.toFixed(3) : absValue.toFixed(2);
  const prefix = value >= 0 ? '+$' : '-$';
  return `${prefix}${formatted}`;
};

interface ScoreHeaderProps {
  game: PredictMarketGame;
  awayScore: string;
  homeScore: string;
}

const ScoreHeader: React.FC<ScoreHeaderProps> = ({
  game,
  awayScore,
  homeScore,
}) => {
  const tw = useTailwind();

  const awayHasPossession =
    game.turn?.toLowerCase() === game.awayTeam.abbreviation.toLowerCase();
  const homeHasPossession =
    game.turn?.toLowerCase() === game.homeTeam.abbreviation.toLowerCase();

  return (
    <Box twClassName="px-2 py-4">
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Start}
        justifyContent={BoxJustifyContent.Between}
      >
        <Box twClassName="items-start">
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            twClassName="gap-3"
          >
            <TeamHelmet color={game.awayTeam.color} size={56} flipped />
            <Text
              variant={TextVariant.DisplayMd}
              color={TextColor.TextDefault}
              style={tw.style('font-bold')}
            >
              {awayScore}
            </Text>
            {awayHasPossession && <FootballIcon size={20} />}
          </Box>
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.TextAlternative}
            twClassName="mt-1"
          >
            {game.awayTeam.alias}
          </Text>
        </Box>

        <Box twClassName="items-end">
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            twClassName="gap-3"
          >
            {homeHasPossession && <FootballIcon size={20} />}
            <Text
              variant={TextVariant.DisplayMd}
              color={TextColor.TextDefault}
              style={tw.style('font-bold')}
            >
              {homeScore}
            </Text>
            <TeamHelmet color={game.homeTeam.color} size={56} />
          </Box>
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.TextAlternative}
            twClassName="mt-1"
          >
            {game.homeTeam.alias}
          </Text>
        </Box>
      </Box>
    </Box>
  );
};

interface PercentageHeaderProps {
  game: PredictMarketGame;
  awayPercentage: number;
  homePercentage: number;
}

const PercentageHeader: React.FC<PercentageHeaderProps> = ({
  game,
  awayPercentage,
  homePercentage,
}) => {
  const tw = useTailwind();

  return (
    <Box twClassName="px-2 py-4">
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Start}
        justifyContent={BoxJustifyContent.Between}
      >
        <Box twClassName="items-start">
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            twClassName="gap-3"
          >
            <TeamHelmet color={game.awayTeam.color} size={56} flipped />
            <Text
              variant={TextVariant.DisplayMd}
              color={TextColor.TextDefault}
              style={tw.style('font-bold')}
            >
              {awayPercentage}%
            </Text>
          </Box>
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.TextAlternative}
            twClassName="mt-1"
          >
            {game.awayTeam.alias}
          </Text>
        </Box>

        <Box twClassName="items-end">
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
              {homePercentage}%
            </Text>
            <TeamHelmet color={game.homeTeam.color} size={56} />
          </Box>
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.TextAlternative}
            twClassName="mt-1"
          >
            {game.homeTeam.alias}
          </Text>
        </Box>
      </Box>
    </Box>
  );
};

interface GameStatusBadgeProps {
  game: PredictMarketGame;
}

const GameStatusBadge: React.FC<GameStatusBadgeProps> = ({ game }) => {
  const tw = useTailwind();

  if (game.status === 'scheduled') {
    return (
      <Text
        variant={TextVariant.BodyMd}
        color={TextColor.TextDefault}
        style={tw.style('text-center font-bold')}
      >
        {formatGameTime(game.startTime)}
      </Text>
    );
  }

  if (game.status === 'ended') {
    return (
      <Box twClassName="px-3 py-1 rounded-full bg-muted">
        <Text
          variant={TextVariant.BodySm}
          color={TextColor.TextDefault}
          style={tw.style('font-medium')}
        >
          {formatPeriodDisplay(game.period || 'FT')}
        </Text>
      </Box>
    );
  }

  const periodText = formatPeriodDisplay(game.period || '');

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      twClassName="gap-2 px-3 py-1 rounded-full bg-error-muted"
    >
      <Box twClassName="w-2 h-2 rounded-full bg-error-default" />
      <Text
        variant={TextVariant.BodySm}
        color={TextColor.ErrorDefault}
        style={tw.style('font-medium')}
      >
        {periodText}
        {game.elapsed ? ` ${game.elapsed}` : ''}
      </Text>
    </Box>
  );
};

interface PositionRowProps {
  position: PredictPosition;
  game: PredictMarketGame;
  onPress: () => void;
}

const PositionRow: React.FC<PositionRowProps> = ({
  position,
  game,
  onPress,
}) => {
  const tw = useTailwind();

  const teamAbbr =
    position.outcomeIndex === 0
      ? game.awayTeam.abbreviation
      : game.homeTeam.abbreviation;

  const teamColor =
    position.outcomeIndex === 0 ? game.awayTeam.color : game.homeTeam.color;

  const isPnlPositive = position.cashPnl >= 0;

  return (
    <Pressable onPress={onPress}>
      {({ pressed }) => (
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Between}
          twClassName="py-3"
          style={pressed ? tw.style('opacity-70') : undefined}
        >
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            twClassName="gap-2"
          >
            <Box
              twClassName="w-2 h-2 rounded-full"
              style={{ backgroundColor: teamColor }}
            />
            <Text variant={TextVariant.BodyMd} color={TextColor.TextDefault}>
              ${position.initialValue.toFixed(2)} on {teamAbbr.toUpperCase()} to
              win
            </Text>
          </Box>
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            twClassName="gap-2"
          >
            <Text
              variant={TextVariant.BodyMd}
              color={
                isPnlPositive
                  ? TextColor.SuccessDefault
                  : TextColor.ErrorDefault
              }
              style={tw.style('font-medium')}
            >
              {formatCurrency(position.cashPnl)}
            </Text>
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextDefault}
              style={tw.style('font-medium')}
            >
              ${position.currentValue.toFixed(2)}
            </Text>
          </Box>
        </Box>
      )}
    </Pressable>
  );
};

const GameDetailsSkeleton: React.FC = () => {
  const { colors } = useTheme();
  const tw = useTailwind();
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView
      style={tw.style('flex-1 bg-default')}
      edges={['left', 'right', 'bottom']}
    >
      <Box twClassName="flex-1 px-3" style={{ paddingTop: insets.top + 12 }}>
        <SkeletonPlaceholder
          backgroundColor={colors.background.alternative}
          highlightColor={colors.background.default}
        >
          <SkeletonPlaceholder.Item gap={16}>
            <SkeletonPlaceholder.Item
              flexDirection="row"
              justifyContent="space-between"
              alignItems="center"
            >
              <SkeletonPlaceholder.Item
                width={24}
                height={24}
                borderRadius={12}
              />
              <SkeletonPlaceholder.Item
                width={180}
                height={20}
                borderRadius={4}
              />
              <SkeletonPlaceholder.Item
                width={24}
                height={24}
                borderRadius={12}
              />
            </SkeletonPlaceholder.Item>

            <SkeletonPlaceholder.Item
              flexDirection="row"
              justifyContent="space-between"
              alignItems="center"
              paddingVertical={16}
            >
              <SkeletonPlaceholder.Item
                flexDirection="row"
                alignItems="center"
                gap={12}
              >
                <SkeletonPlaceholder.Item
                  width={48}
                  height={48}
                  borderRadius={8}
                />
                <SkeletonPlaceholder.Item
                  width={60}
                  height={40}
                  borderRadius={4}
                />
              </SkeletonPlaceholder.Item>
              <SkeletonPlaceholder.Item
                width={20}
                height={24}
                borderRadius={4}
              />
              <SkeletonPlaceholder.Item
                flexDirection="row"
                alignItems="center"
                gap={12}
              >
                <SkeletonPlaceholder.Item
                  width={60}
                  height={40}
                  borderRadius={4}
                />
                <SkeletonPlaceholder.Item
                  width={48}
                  height={48}
                  borderRadius={8}
                />
              </SkeletonPlaceholder.Item>
            </SkeletonPlaceholder.Item>

            <SkeletonPlaceholder.Item
              height={160}
              borderRadius={8}
              marginTop={24}
            />

            <SkeletonPlaceholder.Item
              flexDirection="row"
              justifyContent="space-between"
              marginTop={24}
            >
              <SkeletonPlaceholder.Item
                width={80}
                height={16}
                borderRadius={4}
              />
              <SkeletonPlaceholder.Item
                width={100}
                height={16}
                borderRadius={4}
              />
            </SkeletonPlaceholder.Item>

            <SkeletonPlaceholder.Item
              flexDirection="row"
              gap={12}
              marginTop={12}
            >
              <SkeletonPlaceholder.Item
                flex={1}
                height={48}
                borderRadius={12}
              />
              <SkeletonPlaceholder.Item
                flex={1}
                height={48}
                borderRadius={12}
              />
            </SkeletonPlaceholder.Item>
          </SkeletonPlaceholder.Item>
        </SkeletonPlaceholder>
      </Box>
    </SafeAreaView>
  );
};

const PredictGameDetails: React.FC = () => {
  const navigation =
    useNavigation<NavigationProp<PredictNavigationParamList>>();
  const { colors } = useTheme();
  const route =
    useRoute<RouteProp<PredictNavigationParamList, 'PredictMarketDetails'>>();
  const tw = useTailwind();
  const insets = useSafeAreaInsets();
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const { marketId, entryPoint } = route.params || {};
  const providerId = 'polymarket';

  const { executeGuardedAction } = usePredictActionGuard({
    providerId,
    navigation,
  });

  const {
    market,
    isFetching: isMarketFetching,
    refetch: refetchMarket,
  } = usePredictMarket({
    id: marketId,
    providerId,
    enabled: Boolean(marketId),
  });

  const { liveMarket } = usePredictLiveMarket(market);

  const game = liveMarket?.game;

  const {
    positions,
    isLoading: isPositionsLoading,
    loadPositions,
  } = usePredictPositions({
    marketId,
    claimable: false,
    loadOnMount: false,
  });

  useEffect(() => {
    if (!isMarketFetching && marketId) {
      loadPositions();
    }
  }, [isMarketFetching, marketId, loadPositions]);

  const outcome = liveMarket?.outcomes?.[0];
  const awayToken = outcome?.tokens?.[0];
  const homeToken = outcome?.tokens?.[1];

  const chartTokenIds = useMemo(() => {
    const ids: string[] = [];
    if (awayToken?.id) ids.push(awayToken.id);
    if (homeToken?.id) ids.push(homeToken.id);
    return ids;
  }, [awayToken?.id, homeToken?.id]);

  const {
    priceHistories,
    isFetching: isPriceHistoryFetching,
    refetch: refetchPriceHistory,
  } = usePredictPriceHistory({
    marketIds: chartTokenIds,
    interval: PredictPriceHistoryInterval.ONE_WEEK,
    providerId,
    fidelity: ONE_WEEK_FIDELITY,
    enabled: chartTokenIds.length > 0,
  });

  const chartData: GameChartSeries[] = useMemo(() => {
    if (!game) {
      return [];
    }

    const series: GameChartSeries[] = [];

    if (priceHistories[0]?.length) {
      series.push({
        label: game.awayTeam.abbreviation.toUpperCase(),
        color: game.awayTeam.color || colors.primary.default,
        data: priceHistories[0].map((point) => ({
          timestamp: point.timestamp,
          value: Number((point.price * 100).toFixed(2)),
        })),
      });
    }

    if (priceHistories[1]?.length) {
      series.push({
        label: game.homeTeam.abbreviation.toUpperCase(),
        color: game.homeTeam.color || colors.error.default,
        data: priceHistories[1].map((point) => ({
          timestamp: point.timestamp,
          value: Number((point.price * 100).toFixed(2)),
        })),
      });
    }

    return series;
  }, [game, priceHistories, colors.primary.default, colors.error.default]);

  const handleBackPress = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate(Routes.PREDICT.ROOT);
    }
  };

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.allSettled([
      refetchMarket(),
      refetchPriceHistory(),
      loadPositions({ isRefresh: true }),
    ]);
    setIsRefreshing(false);
  }, [refetchMarket, refetchPriceHistory, loadPositions]);

  const handleBuyPress = (token: PredictOutcomeToken) => {
    if (!liveMarket || !outcome) return;

    executeGuardedAction(
      () => {
        navigation.navigate(Routes.PREDICT.MODALS.BUY_PREVIEW, {
          market: liveMarket,
          outcome,
          outcomeToken: token,
          entryPoint:
            entryPoint || PredictEventValues.ENTRY_POINT.PREDICT_MARKET_DETAILS,
        });
      },
      {
        checkBalance: true,
        attemptedAction: PredictEventValues.ATTEMPTED_ACTION.PREDICT,
      },
    );
  };

  const getOddsPercentage = (token?: PredictOutcomeToken): number =>
    token ? Math.round(token.price * 100) : 0;

  const renderHeader = () => {
    if (!game) {
      return null;
    }

    const { away: awayScore, home: homeScore } = parseScore(game.score);
    const isScheduled = game.status === 'scheduled';

    return (
      <Box twClassName="gap-2" style={{ paddingTop: insets.top + 12 }}>
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Between}
          twClassName="px-1"
        >
          <Pressable
            onPress={handleBackPress}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={strings('predict.buttons.back')}
            style={tw.style('items-center justify-center rounded-full')}
          >
            <Icon
              name={IconName.ArrowLeft}
              size={IconSize.Lg}
              color={colors.icon.default}
            />
          </Pressable>
          <GameStatusBadge game={game} />
          <PredictShareButton marketId={market?.id} />
        </Box>

        {isScheduled ? (
          <PercentageHeader
            game={game}
            awayPercentage={getOddsPercentage(awayToken)}
            homePercentage={getOddsPercentage(homeToken)}
          />
        ) : (
          <ScoreHeader
            game={game}
            awayScore={awayScore}
            homeScore={homeScore}
          />
        )}
      </Box>
    );
  };

  const handlePositionPress = useCallback(
    (position: PredictPosition) => {
      if (!liveMarket) return;

      executeGuardedAction(
        () => {
          const positionOutcome = liveMarket.outcomes.find(
            (o) => o.id === position.outcomeId,
          );
          navigation.navigate(Routes.PREDICT.MODALS.SELL_PREVIEW, {
            market: liveMarket,
            position,
            outcome: positionOutcome,
            entryPoint:
              entryPoint ||
              PredictEventValues.ENTRY_POINT.PREDICT_MARKET_DETAILS,
          });
        },
        { attemptedAction: PredictEventValues.ATTEMPTED_ACTION.CASHOUT },
      );
    },
    [liveMarket, executeGuardedAction, navigation, entryPoint],
  );

  const renderPositions = () => {
    if (isPositionsLoading || positions.length === 0 || !game) {
      return null;
    }

    return (
      <Box twClassName="mb-4">
        <Text
          variant={TextVariant.HeadingSm}
          color={TextColor.TextDefault}
          twClassName="mb-2"
        >
          Your picks
        </Text>
        <Box twClassName="border-t border-muted">
          {positions.map((position) => (
            <PositionRow
              key={position.id}
              position={position}
              game={game}
              onPress={() => handlePositionPress(position)}
            />
          ))}
        </Box>
      </Box>
    );
  };

  const renderActionButtons = () => {
    if (!game || !awayToken || !homeToken) {
      return null;
    }

    if (game.status === 'ended') {
      return null;
    }

    const awayOdds = getOddsPercentage(awayToken);
    const homeOdds = getOddsPercentage(homeToken);

    return (
      <Box twClassName="w-full">
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Between}
          twClassName="mb-3"
        >
          <Text variant={TextVariant.BodySm} color={TextColor.TextDefault}>
            Pick a winner
          </Text>
          <Text variant={TextVariant.BodySm} color={TextColor.TextDefault}>
            ${formatVolume(market?.volume || 0)} Vol
          </Text>
        </Box>
        <Box flexDirection={BoxFlexDirection.Row} twClassName="gap-3">
          <Pressable
            onPress={() => handleBuyPress(awayToken)}
            style={tw.style('flex-1')}
          >
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
                  {game.awayTeam.abbreviation.toUpperCase()} {awayOdds}¢
                </Text>
              </Box>
            )}
          </Pressable>
          <Pressable
            onPress={() => handleBuyPress(homeToken)}
            style={tw.style('flex-1')}
          >
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
                  {game.homeTeam.abbreviation.toUpperCase()} {homeOdds}¢
                </Text>
              </Box>
            )}
          </Pressable>
        </Box>
      </Box>
    );
  };

  if (isMarketFetching && !market) {
    return <GameDetailsSkeleton />;
  }

  if (!market || !game) {
    return <GameDetailsSkeleton />;
  }

  const gradientColors = [
    `${game.awayTeam.color}40`,
    `${game.homeTeam.color}20`,
    colors.background.default,
  ];

  return (
    <View style={tw.style('flex-1')}>
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0.5 }}
        style={tw.style('absolute inset-0')}
      />
      <SafeAreaView
        style={tw.style('flex-1')}
        edges={['left', 'right', 'bottom']}
      >
        <Box twClassName="px-3">{renderHeader()}</Box>

        <ScrollView
          showsVerticalScrollIndicator={false}
          style={tw.style('flex-1')}
          contentContainerStyle={tw.style('flex-grow')}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary.default}
              colors={[colors.primary.default]}
            />
          }
        >
          <Box twClassName="px-3 flex-1 justify-center mt-8">
            <PredictGameChart
              data={chartData}
              isLoading={isPriceHistoryFetching}
            />
          </Box>
        </ScrollView>

        <Box twClassName="px-3 py-4">
          {renderPositions()}
          {renderActionButtons()}
        </Box>
      </SafeAreaView>
    </View>
  );
};

export default PredictGameDetails;
