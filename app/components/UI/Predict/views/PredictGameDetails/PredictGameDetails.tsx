import {
  NavigationProp,
  RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { Image, Pressable, RefreshControl, ScrollView } from 'react-native';
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
import PredictDetailsChart, {
  ChartSeries,
} from '../../components/PredictDetailsChart/PredictDetailsChart';
import { usePredictMarket } from '../../hooks/usePredictMarket';
import { usePredictPriceHistory } from '../../hooks/usePredictPriceHistory';
import {
  PredictPriceHistoryInterval,
  PredictOutcomeToken,
  PredictMarketGame,
  PredictSportTeam,
} from '../../types';
import { usePredictActionGuard } from '../../hooks/usePredictActionGuard';
import PredictShareButton from '../../components/PredictShareButton/PredictShareButton';

const LIVE_POLLING_INTERVAL = 5000;

const PRICE_HISTORY_TIMEFRAMES: PredictPriceHistoryInterval[] = [
  PredictPriceHistoryInterval.ONE_HOUR,
  PredictPriceHistoryInterval.SIX_HOUR,
  PredictPriceHistoryInterval.ONE_DAY,
  PredictPriceHistoryInterval.ONE_WEEK,
  PredictPriceHistoryInterval.ONE_MONTH,
  PredictPriceHistoryInterval.MAX,
];

const DEFAULT_FIDELITY_BY_INTERVAL: Partial<
  Record<PredictPriceHistoryInterval, number>
> = {
  [PredictPriceHistoryInterval.ONE_HOUR]: 5,
  [PredictPriceHistoryInterval.SIX_HOUR]: 15,
  [PredictPriceHistoryInterval.ONE_DAY]: 60,
  [PredictPriceHistoryInterval.ONE_WEEK]: 240,
  [PredictPriceHistoryInterval.ONE_MONTH]: 720,
  [PredictPriceHistoryInterval.MAX]: 1440,
};

const parseScore = (score: string): { away: string; home: string } => {
  if (!score) {
    return { away: '0', home: '0' };
  }
  const [away, home] = score.split('-');
  return { away: away || '0', home: home || '0' };
};

const formatGameTime = (startTime: string): string => {
  const date = new Date(startTime);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

interface TeamHeaderRowProps {
  team: PredictSportTeam;
  score: string;
  showScore: boolean;
}

const TeamHeaderRow: React.FC<TeamHeaderRowProps> = ({
  team,
  score,
  showScore,
}) => {
  const tw = useTailwind();

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      twClassName="gap-3 py-2"
    >
      <Box twClassName="w-12 h-12 rounded-lg overflow-hidden bg-muted">
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
        variant={TextVariant.HeadingMd}
        color={TextColor.TextDefault}
        style={tw.style('flex-1 font-bold')}
        numberOfLines={1}
      >
        {team.name}
      </Text>
      {showScore && (
        <Text
          variant={TextVariant.DisplayMd}
          color={TextColor.TextDefault}
          style={tw.style('font-bold min-w-12 text-right')}
        >
          {score}
        </Text>
      )}
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
        variant={TextVariant.BodySm}
        color={TextColor.TextAlternative}
        style={tw.style('text-center')}
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
          color={TextColor.TextAlternative}
          style={tw.style('font-medium')}
        >
          Final
        </Text>
      </Box>
    );
  }

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
        {game.period}
        {game.elapsed ? ` ${game.elapsed}` : ''}
      </Text>
    </Box>
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
  const [selectedTimeframe, setSelectedTimeframe] =
    useState<PredictPriceHistoryInterval>(
      PredictPriceHistoryInterval.ONE_MONTH,
    );
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const { marketId, entryPoint } = route.params || {};
  const providerId = 'polymarket';

  const { executeGuardedAction } = usePredictActionGuard({
    providerId,
    navigation,
  });

  const isGameOngoing = (game?: PredictMarketGame) =>
    game?.status === 'ongoing';

  const {
    market,
    isFetching: isMarketFetching,
    refetch: refetchMarket,
  } = usePredictMarket({
    id: marketId,
    providerId,
    enabled: Boolean(marketId),
    pollingInterval: isGameOngoing(undefined)
      ? LIVE_POLLING_INTERVAL
      : undefined,
  });

  const game = market?.game;
  const pollingInterval = isGameOngoing(game)
    ? LIVE_POLLING_INTERVAL
    : undefined;

  useEffect(() => {
    if (pollingInterval && market) {
      const interval = setInterval(() => {
        refetchMarket();
      }, pollingInterval);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [pollingInterval, refetchMarket, market]);

  const outcome = market?.outcomes?.[0];
  const awayToken = outcome?.tokens?.[0];
  const homeToken = outcome?.tokens?.[1];

  const chartOutcomeTokenId = awayToken?.id;

  const selectedFidelity = useMemo(
    () => DEFAULT_FIDELITY_BY_INTERVAL[selectedTimeframe],
    [selectedTimeframe],
  );

  const {
    priceHistories,
    isFetching: isPriceHistoryFetching,
    errors,
    refetch: refetchPriceHistory,
  } = usePredictPriceHistory({
    marketIds: chartOutcomeTokenId ? [chartOutcomeTokenId] : [],
    interval: selectedTimeframe,
    providerId,
    fidelity: selectedFidelity,
    enabled: Boolean(chartOutcomeTokenId),
  });

  const chartData: ChartSeries[] = useMemo(() => {
    if (!game || !priceHistories[0]) {
      return [];
    }

    return [
      {
        label: game.awayTeam.name,
        color: game.awayTeam.color || colors.primary.default,
        data: (priceHistories[0] ?? []).map((point) => ({
          timestamp: point.timestamp,
          value: Number((point.price * 100).toFixed(2)),
        })),
      },
    ];
  }, [game, priceHistories, colors.primary.default]);

  const chartEmptyLabel = chartOutcomeTokenId
    ? (errors.find(Boolean) ?? undefined)
    : '';

  const handleTimeframeChange = (timeframe: string) => {
    if (
      PRICE_HISTORY_TIMEFRAMES.includes(
        timeframe as PredictPriceHistoryInterval,
      )
    ) {
      setSelectedTimeframe(timeframe as PredictPriceHistoryInterval);
    }
  };

  const handleBackPress = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate(Routes.PREDICT.ROOT);
    }
  };

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.allSettled([refetchMarket(), refetchPriceHistory()]);
    setIsRefreshing(false);
  }, [refetchMarket, refetchPriceHistory]);

  const handleBuyPress = (token: PredictOutcomeToken) => {
    if (!market || !outcome) return;

    executeGuardedAction(
      () => {
        navigation.navigate(Routes.PREDICT.MODALS.BUY_PREVIEW, {
          market,
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
    const showScore = game.status !== 'scheduled';

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

        <Box twClassName="px-2">
          <TeamHeaderRow
            team={game.awayTeam}
            score={awayScore}
            showScore={showScore}
          />
          <TeamHeaderRow
            team={game.homeTeam}
            score={homeScore}
            showScore={showScore}
          />
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

    return (
      <Box flexDirection={BoxFlexDirection.Row} twClassName="w-full gap-3">
        <Pressable
          onPress={() => handleBuyPress(awayToken)}
          style={({ pressed }) =>
            tw.style(
              'flex-1 py-3 rounded-xl items-center',
              pressed && 'opacity-80',
            )
          }
        >
          <Box
            twClassName="flex-1 w-full py-3 rounded-xl items-center"
            style={{ backgroundColor: `${game.awayTeam.color}33` }}
          >
            <Text
              variant={TextVariant.BodyMd}
              style={tw.style('font-semibold')}
            >
              {game.awayTeam.abbreviation.toUpperCase()}{' '}
              {getOddsPercentage(awayToken)}%
            </Text>
          </Box>
        </Pressable>
        <Pressable
          onPress={() => handleBuyPress(homeToken)}
          style={({ pressed }) =>
            tw.style(
              'flex-1 py-3 rounded-xl items-center',
              pressed && 'opacity-80',
            )
          }
        >
          <Box
            twClassName="flex-1 w-full py-3 rounded-xl items-center"
            style={{ backgroundColor: `${game.homeTeam.color}33` }}
          >
            <Text
              variant={TextVariant.BodyMd}
              style={tw.style('font-semibold')}
            >
              {game.homeTeam.abbreviation.toUpperCase()}{' '}
              {getOddsPercentage(homeToken)}%
            </Text>
          </Box>
        </Pressable>
      </Box>
    );
  };

  const renderAboutSection = () => (
    <Box twClassName="gap-6 mt-4">
      <Box twClassName="gap-4">
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Between}
          twClassName="gap-3"
        >
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            twClassName="gap-3"
          >
            <Icon
              name={IconName.Chart}
              size={IconSize.Md}
              color={colors.text.muted}
            />
            <Text
              variant={TextVariant.BodyMd}
              twClassName="font-medium"
              color={TextColor.TextDefault}
            >
              {strings('predict.market_details.volume')}
            </Text>
          </Box>
          <Text
            variant={TextVariant.BodyMd}
            twClassName="font-medium"
            color={TextColor.TextDefault}
          >
            ${formatVolume(market?.volume || 0)}
          </Text>
        </Box>
      </Box>
      <Box twClassName="w-full border-t border-muted" />
      <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
        {market?.description}
      </Text>
      <Box twClassName="w-full border-t border-muted" />
      <Text variant={TextVariant.BodyXs} color={TextColor.TextAlternative}>
        {strings('predict.market_details.disclaimer')}
      </Text>
    </Box>
  );

  if (!market || !game) {
    return (
      <SafeAreaView
        style={tw.style('flex-1 bg-default')}
        edges={['left', 'right', 'bottom']}
      >
        <Box twClassName="flex-1 items-center justify-center">
          <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
            Loading...
          </Text>
        </Box>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={tw.style('flex-1 bg-default')}
      edges={['left', 'right', 'bottom']}
    >
      <Box twClassName="px-3">{renderHeader()}</Box>

      <ScrollView
        showsVerticalScrollIndicator={false}
        style={tw.style('flex-1')}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary.default}
            colors={[colors.primary.default]}
          />
        }
      >
        <Box twClassName="px-3 gap-4 pt-4">
          {chartData.length > 0 && (
            <PredictDetailsChart
              data={chartData}
              timeframes={PRICE_HISTORY_TIMEFRAMES}
              selectedTimeframe={selectedTimeframe}
              onTimeframeChange={handleTimeframeChange}
              isLoading={isPriceHistoryFetching}
              emptyLabel={chartEmptyLabel}
            />
          )}
          {renderAboutSection()}
        </Box>
      </ScrollView>

      <Box twClassName="px-3 py-4 bg-default border-t border-muted">
        {renderActionButtons()}
      </Box>
    </SafeAreaView>
  );
};

export default PredictGameDetails;
