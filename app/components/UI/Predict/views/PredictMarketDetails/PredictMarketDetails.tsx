import {
  NavigationProp,
  RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  Image,
  InteractionManager,
  Pressable,
  RefreshControl,
  ScrollView,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { strings } from '../../../../../../locales/i18n';
import Button, {
  ButtonVariants,
  ButtonSize,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import Routes from '../../../../../constants/navigation/Routes';
import { useTheme } from '../../../../../util/theme';
import { TraceName } from '../../../../../util/trace';
import { PredictNavigationParamList } from '../../types/navigation';
import { PredictEventValues } from '../../constants/eventNames';
import { formatVolume, estimateLineCount } from '../../utils/format';
import { usePredictMeasurement } from '../../hooks/usePredictMeasurement';
import Engine from '../../../../../core/Engine';
import { PredictMarketDetailsSelectorsIDs } from '../../../../../../e2e/selectors/Predict/Predict.selectors';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
  ButtonSize as ButtonSizeHero,
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
import {
  DAY_IN_MS,
  getTimestampInMs,
} from '../../components/PredictDetailsChart/utils';
import PredictPositionDetail from '../../components/PredictPositionDetail';
import { usePredictMarket } from '../../hooks/usePredictMarket';
import { usePredictPriceHistory } from '../../hooks/usePredictPriceHistory';
import { usePredictPrices } from '../../hooks/usePredictPrices';
import {
  PriceQuery,
  PredictPriceHistoryInterval,
  PredictMarketStatus,
  PredictOutcome,
  PredictOutcomeToken,
} from '../../types';
import PredictMarketOutcome from '../../components/PredictMarketOutcome';
import PredictMarketOutcomeResolved from '../../components/PredictMarketOutcomeResolved';
import { usePredictPositions } from '../../hooks/usePredictPositions';
import { usePredictClaim } from '../../hooks/usePredictClaim';
import { usePredictActionGuard } from '../../hooks/usePredictActionGuard';
import ButtonHero from '../../../../../component-library/components-temp/Buttons/ButtonHero';
import PredictDetailsHeaderSkeleton from '../../components/PredictDetailsHeaderSkeleton';
import PredictDetailsContentSkeleton from '../../components/PredictDetailsContentSkeleton';
import PredictDetailsButtonsSkeleton from '../../components/PredictDetailsButtonsSkeleton';
import PredictShareButton from '../../components/PredictShareButton/PredictShareButton';

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
  [PredictPriceHistoryInterval.ONE_HOUR]: 5, // 5-minute resolution for 1-hour window
  [PredictPriceHistoryInterval.SIX_HOUR]: 15, // 15-minute resolution for 6-hour window
  [PredictPriceHistoryInterval.ONE_DAY]: 60, // 1-hour resolution for 1-day window
  [PredictPriceHistoryInterval.ONE_WEEK]: 240, // 4-hour resolution for 7-day window
  [PredictPriceHistoryInterval.ONE_MONTH]: 720, // 12-hour resolution for month-long window
  [PredictPriceHistoryInterval.MAX]: 1440, // 24-hour resolution for max window
};

const MAX_INTERVAL_SHORT_RANGE_THRESHOLD_DAYS = 30;
const MAX_INTERVAL_SHORT_RANGE_MS =
  MAX_INTERVAL_SHORT_RANGE_THRESHOLD_DAYS * DAY_IN_MS;
const MAX_INTERVAL_SHORT_RANGE_FIDELITY =
  DEFAULT_FIDELITY_BY_INTERVAL[PredictPriceHistoryInterval.ONE_WEEK] ?? 240;

// Use theme tokens instead of hex values for multi-series charts

interface PredictMarketDetailsProps {}

const PredictMarketDetails: React.FC<PredictMarketDetailsProps> = () => {
  const navigation =
    useNavigation<NavigationProp<PredictNavigationParamList>>();
  const { colors } = useTheme();
  const { claim } = usePredictClaim();
  const route =
    useRoute<RouteProp<PredictNavigationParamList, 'PredictMarketDetails'>>();
  const tw = useTailwind();
  const [selectedTimeframe, setSelectedTimeframe] =
    useState<PredictPriceHistoryInterval>(PredictPriceHistoryInterval.ONE_DAY);
  const [maxIntervalAdaptiveFidelity, setMaxIntervalAdaptiveFidelity] =
    useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<number | null>(null);
  const [userSelectedTab, setUserSelectedTab] = useState<boolean>(false);
  const insets = useSafeAreaInsets();
  const [isResolvedExpanded, setIsResolvedExpanded] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const { marketId, entryPoint, title, image } = route.params || {};
  const resolvedMarketId = marketId;
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
    id: resolvedMarketId,
    providerId,
    enabled: Boolean(resolvedMarketId),
  });

  // Track screen load performance (market details + chart)
  usePredictMeasurement({
    traceName: TraceName.PredictMarketDetailsView,
    conditions: [!isMarketFetching, !!market, !isRefreshing],
    debugContext: {
      marketId: market?.id,
      hasMarket: !!market,
      loadingStates: { isMarketFetching, isRefreshing },
    },
  });

  // calculate sticky header indices based on content structure
  const stickyHeaderIndices = useMemo(() => {
    if (isMarketFetching && !market) {
      return [];
    }
    return [1];
  }, [isMarketFetching, market]);

  const titleLineCount = useMemo(
    () => estimateLineCount(title ?? market?.title),
    [title, market?.title],
  );

  // active positions
  const {
    positions: activePositions,
    isLoading: isActivePositionsLoading,
    loadPositions: loadActivePositions,
  } = usePredictPositions({
    marketId: resolvedMarketId,
    claimable: false,
    loadOnMount: false,
  });

  // "claimable" positions
  const {
    positions: claimablePositions,
    isLoading: isClaimablePositionsLoading,
    loadPositions: loadClaimablePositions,
  } = usePredictPositions({
    marketId: resolvedMarketId,
    claimable: true,
    loadOnMount: false,
  });

  // Load positions when market is ready
  useEffect(() => {
    if (!isMarketFetching && resolvedMarketId) {
      loadActivePositions();
      loadClaimablePositions();
    }
  }, [
    isMarketFetching,
    resolvedMarketId,
    loadActivePositions,
    loadClaimablePositions,
  ]);

  useEffect(() => {
    // if market is closed
    if (market?.status === PredictMarketStatus.CLOSED) {
      // set the setSelectedTimeframe to PredictPriceHistoryInterval.MAX
      setSelectedTimeframe(PredictPriceHistoryInterval.MAX);
    }
  }, [market?.status]);

  // check if market has fee exemption (note: worth moveing to a const or util at some point))
  const isFeeExemption = market?.tags?.includes('Middle East') ?? false;

  // Tabs become ready when both market and positions queries have resolved
  const tabsReady = useMemo(
    () =>
      !isMarketFetching &&
      !isActivePositionsLoading &&
      !isClaimablePositionsLoading,
    [isMarketFetching, isActivePositionsLoading, isClaimablePositionsLoading],
  );

  const { winningOutcomeToken, losingOutcomeToken, resolutionStatus } =
    useMemo(() => {
      // early return if no market or outcomes
      if (!market?.outcomes?.length) {
        return {
          winningOutcomeToken: undefined,
          losingOutcomeToken: undefined,
          resolutionStatus: undefined,
        };
      }

      let winningToken: PredictOutcomeToken | undefined;
      let losingToken: PredictOutcomeToken | undefined;
      let winningOutcome: PredictOutcome | undefined;

      // single iteration through outcomes to find winning/losing tokens and outcome
      for (const outcome of market.outcomes) {
        if (!outcome.tokens?.length) continue;

        for (const token of outcome.tokens) {
          if (token.price === 1 && !winningToken) {
            winningToken = token;
            winningOutcome = outcome;
          } else if (token.price === 0 && !losingToken) {
            losingToken = token;
          }
        }

        // early exit if we found both tokens
        if (winningToken && losingToken) break;
      }

      return {
        winningOutcomeToken: winningToken,
        losingOutcomeToken: losingToken,
        resolutionStatus: winningOutcome?.resolutionStatus,
      };
    }, [market]);

  // Determine the winning outcome (the outcome that contains the winning token)
  const winningOutcome = useMemo(
    () =>
      winningOutcomeToken
        ? market?.outcomes.find((outcome) =>
            outcome.tokens.some((token) => token.id === winningOutcomeToken.id),
          )
        : undefined,
    [market?.outcomes, winningOutcomeToken],
  );

  const losingOutcome = useMemo(
    () =>
      losingOutcomeToken
        ? market?.outcomes.find((outcome) =>
            outcome.tokens.some((token) => token.id === losingOutcomeToken.id),
          )
        : undefined,
    [market?.outcomes, losingOutcomeToken],
  );

  const outcomeSlices = useMemo(
    () => (market?.outcomes ?? []).slice(0, 3),
    [market?.outcomes],
  );

  const outcomeTokenIds = useMemo(
    () =>
      [0, 1, 2].map(
        (index) => outcomeSlices[index]?.tokens?.[0]?.id ?? undefined,
      ),
    [outcomeSlices],
  );

  const loadedOutcomeTokenIds = useMemo(
    () =>
      outcomeTokenIds.filter((tokenId): tokenId is string => Boolean(tokenId)),
    [outcomeTokenIds],
  );

  const hasAnyOutcomeToken = loadedOutcomeTokenIds.length > 0;
  const multipleOutcomes = loadedOutcomeTokenIds.length > 1;
  const singleOutcomeMarket = loadedOutcomeTokenIds.length === 1;
  const multipleOpenOutcomesPartiallyResolved =
    loadedOutcomeTokenIds.length > 1 &&
    !!market?.outcomes?.some(
      (outcome) => outcome.resolutionStatus === 'resolved',
    );

  // Chart-specific data preparation (pending a larger refactor)
  // Isolated from the rest of the component for now to avoid regressions
  const chartOpenOutcomes = useMemo(
    () =>
      (market?.outcomes ?? [])
        .filter((outcome) => outcome.status === 'open')
        .slice(0, 3),
    [market?.outcomes],
  );

  const chartOutcomeTokenIds = useMemo(
    () =>
      chartOpenOutcomes
        .map((outcome) => outcome?.tokens?.[0]?.id)
        .filter((tokenId): tokenId is string => Boolean(tokenId)),
    [chartOpenOutcomes],
  );

  const selectedFidelity = useMemo(() => {
    if (
      selectedTimeframe === PredictPriceHistoryInterval.MAX &&
      maxIntervalAdaptiveFidelity
    ) {
      return maxIntervalAdaptiveFidelity;
    }

    return DEFAULT_FIDELITY_BY_INTERVAL[selectedTimeframe];
  }, [selectedTimeframe, maxIntervalAdaptiveFidelity]);
  const {
    priceHistories,
    isFetching: isPriceHistoryFetching,
    errors,
    refetch: refetchPriceHistory,
  } = usePredictPriceHistory({
    marketIds: chartOutcomeTokenIds,
    interval: selectedTimeframe,
    providerId,
    fidelity: selectedFidelity,
    enabled: chartOutcomeTokenIds.length > 0,
  });

  const maxIntervalRangeMs = useMemo(() => {
    if (selectedTimeframe !== PredictPriceHistoryInterval.MAX) {
      return null;
    }

    const timestamps = priceHistories.flatMap((history) =>
      history.map((point) => getTimestampInMs(point.timestamp)),
    );

    if (!timestamps.length) {
      return null;
    }

    return Math.max(...timestamps) - Math.min(...timestamps);
  }, [priceHistories, selectedTimeframe]);

  useEffect(() => {
    if (selectedTimeframe !== PredictPriceHistoryInterval.MAX) {
      if (maxIntervalAdaptiveFidelity !== null) {
        setMaxIntervalAdaptiveFidelity(null);
      }
      return;
    }

    if (
      typeof maxIntervalRangeMs === 'number' &&
      maxIntervalRangeMs > 0 &&
      maxIntervalRangeMs < MAX_INTERVAL_SHORT_RANGE_MS
    ) {
      if (maxIntervalAdaptiveFidelity !== MAX_INTERVAL_SHORT_RANGE_FIDELITY) {
        setMaxIntervalAdaptiveFidelity(MAX_INTERVAL_SHORT_RANGE_FIDELITY);
      }
      return;
    }

    if (
      maxIntervalAdaptiveFidelity !== null &&
      (maxIntervalRangeMs === null ||
        maxIntervalRangeMs >= MAX_INTERVAL_SHORT_RANGE_MS)
    ) {
      setMaxIntervalAdaptiveFidelity(null);
    }
  }, [maxIntervalRangeMs, maxIntervalAdaptiveFidelity, selectedTimeframe]);

  const chartData: ChartSeries[] = useMemo(() => {
    const palette = [
      colors.primary.default,
      colors.error.default,
      colors.success.default,
    ];
    return chartOutcomeTokenIds.map((_tokenId, index) => ({
      label:
        chartOpenOutcomes[index]?.groupItemTitle ||
        chartOpenOutcomes[index]?.title ||
        `Outcome ${index + 1}`,
      color:
        chartOutcomeTokenIds.length === 1
          ? colors.success.default
          : (palette[index] ?? colors.success.default),
      data: (priceHistories[index] ?? []).map((point) => ({
        timestamp: point.timestamp,
        value: Number((point.price * 100).toFixed(2)),
      })),
    }));
  }, [
    chartOutcomeTokenIds,
    chartOpenOutcomes,
    priceHistories,
    colors.primary.default,
    colors.error.default,
    colors.success.default,
  ]);

  const chartEmptyLabel = hasAnyOutcomeToken
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
      // If we can't go back, navigate to the main predict screen
      navigation.navigate(Routes.PREDICT.ROOT);
    }
  };

  // Real-time price updates for open outcomes
  const closedOutcomes = useMemo(
    () =>
      market?.outcomes?.filter((outcome) => outcome.status === 'closed') ?? [],
    [market?.outcomes],
  );
  const openOutcomesBase = useMemo(
    () =>
      market?.outcomes?.filter((outcome) => outcome.status === 'open') ?? [],
    [market?.outcomes],
  );

  // build price queries for fetching prices
  const priceQueries: PriceQuery[] = useMemo(
    () =>
      openOutcomesBase.flatMap((outcome) =>
        outcome.tokens.map((token) => ({
          marketId: outcome.marketId,
          outcomeId: outcome.id,
          outcomeTokenId: token.id,
        })),
      ),
    [openOutcomesBase],
  );

  // fetch real-time prices once after market loads
  const { prices } = usePredictPrices({
    queries: priceQueries,
    providerId,
    enabled: !isMarketFetching && priceQueries.length > 0,
  });

  // create open outcomes with updated prices from real-time data
  const openOutcomes = useMemo(() => {
    if (!prices.results.length) {
      return openOutcomesBase;
    }

    return openOutcomesBase.map((outcome) => ({
      ...outcome,
      tokens: outcome.tokens.map((token) => {
        const priceResult = prices.results.find(
          (r) => r.outcomeTokenId === token.id,
        );
        const realTimePrice = priceResult?.entry.sell;
        return {
          ...token,
          // use real-time (CLOB) price if available, otherwise keep existing price
          price: realTimePrice ?? token.price,
        };
      }),
    }));
  }, [openOutcomesBase, prices]);

  const getYesPercentage = (): number => {
    // Use real-time price if available from open outcomes
    const firstOpenOutcome = openOutcomes[0];
    const firstTokenPrice = firstOpenOutcome?.tokens?.[0]?.price;

    if (typeof firstTokenPrice === 'number') {
      return Math.round(firstTokenPrice * 100);
    }

    // Fallback to original market data
    const firstOutcomePrice = market?.outcomes?.[0]?.tokens?.[0]?.price;
    if (typeof firstOutcomePrice === 'number') {
      return Math.round(firstOutcomePrice * 100);
    }
    return 0;
  };

  const handleBuyPress = (token: PredictOutcomeToken) => {
    executeGuardedAction(
      () => {
        // Use open outcomes with updated prices if available
        const firstOpenOutcome = openOutcomes[0];
        navigation.navigate(Routes.PREDICT.MODALS.BUY_PREVIEW, {
          market,
          outcome: firstOpenOutcome ?? market?.outcomes?.[0],
          outcomeToken: token,
          entryPoint: PredictEventValues.ENTRY_POINT.PREDICT_MARKET_DETAILS,
        });
      },
      {
        checkBalance: true,
        attemptedAction: PredictEventValues.ATTEMPTED_ACTION.PREDICT,
      },
    );
  };

  const handleClaimPress = async () => {
    await executeGuardedAction(
      async () => {
        await claim();
      },
      { attemptedAction: PredictEventValues.ATTEMPTED_ACTION.CLAIM },
    );
  };

  const handleTabPress = (tabIndex: number) => {
    if (!tabsReady) return;
    setUserSelectedTab(true);
    setActiveTab(tabIndex);
  };

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.allSettled([
      refetchMarket(),
      refetchPriceHistory(),
      loadActivePositions({ isRefresh: true }),
      loadClaimablePositions({ isRefresh: true }),
    ]);
    setIsRefreshing(false);
  }, [
    loadActivePositions,
    refetchMarket,
    refetchPriceHistory,
    loadClaimablePositions,
  ]);

  const handlePolymarketResolution = useCallback(() => {
    InteractionManager.runAfterInteractions(() => {
      navigation.navigate('Webview', {
        screen: 'SimpleWebview',
        params: {
          url: 'https://docs.polymarket.com/polymarket-learn/markets/how-are-markets-resolved',
          title: strings('predict.market_details.resolution_details'),
        },
      });
    });
  }, [navigation]);

  type TabKey = 'positions' | 'outcomes' | 'about';

  const trackMarketDetailsOpened = useCallback(
    (tabKey: TabKey) => {
      if (!market) return;

      Engine.context.PredictController.trackMarketDetailsOpened({
        marketId: market.id,
        marketTitle: market.title,
        marketCategory: market.category,
        marketTags: market.tags,
        entryPoint: entryPoint || PredictEventValues.ENTRY_POINT.PREDICT_FEED,
        marketDetailsViewed: tabKey,
      });
    },
    [market, entryPoint],
  );
  const tabs = useMemo(() => {
    const result: { label: string; key: TabKey }[] = [];
    // positions first if user has any
    if (activePositions.length > 0 || claimablePositions.length > 0) {
      result.push({
        label: strings('predict.tabs.positions'),
        key: 'positions',
      });
    }
    // outcomes next if market has multiple outcomes or is closed
    if (multipleOutcomes || market?.status === PredictMarketStatus.CLOSED) {
      result.push({ label: strings('predict.tabs.outcomes'), key: 'outcomes' });
    }
    // about last (always present)
    result.push({ label: strings('predict.tabs.about'), key: 'about' });
    return result;
  }, [
    activePositions.length,
    claimablePositions.length,
    multipleOutcomes,
    market?.status,
  ]);

  useEffect(() => {
    if (!tabsReady) return;

    const outcomesIndex = tabs.findIndex((t) => t.key === 'outcomes');

    // for closed markets, display 'outcomes' by default until the user selects a tab
    if (market?.status === PredictMarketStatus.CLOSED) {
      if (!userSelectedTab) {
        setActiveTab(outcomesIndex >= 0 ? outcomesIndex : 0);
        return;
      }
      // if user selected but current index is out of bounds after tabs change
      if (activeTab !== null && activeTab >= tabs.length) {
        setActiveTab(outcomesIndex >= 0 ? outcomesIndex : 0);
      }
      return;
    }

    // non-closed markets: initialize to first tab if not set yet
    if (activeTab === null) {
      setActiveTab(0);
      return;
    }

    // Guard against out-of-bounds when tabs change
    if (activeTab >= tabs.length) {
      setActiveTab(0);
    }
  }, [tabsReady, tabs, activeTab, market?.status, userSelectedTab]);

  // Track market details opened on initial load and tab changes
  useEffect(() => {
    if (!tabsReady || activeTab === null || !market) return;

    const tabKey = tabs[activeTab]?.key;
    if (tabKey) {
      trackMarketDetailsOpened(tabKey);
    }
  }, [market, tabsReady, activeTab, tabs, trackMarketDetailsOpened]);

  const renderCustomTabBar = () => (
    <Box
      twClassName="bg-default border-b border-muted pt-4"
      testID={PredictMarketDetailsSelectorsIDs.TAB_BAR}
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="px-3"
      >
        {tabs.map((tab, index) => (
          <Pressable
            key={tab.key}
            onPress={() => handleTabPress(index)}
            style={tw.style(
              'w-1/3 py-3',
              activeTab === index ? 'border-b-2 border-default' : '',
            )}
            testID={`${PredictMarketDetailsSelectorsIDs.TAB_BAR}-tab-${index}`}
          >
            <Text
              variant={TextVariant.BodyMd}
              twClassName="font-medium"
              color={
                activeTab === index
                  ? TextColor.TextDefault
                  : TextColor.TextAlternative
              }
              style={tw.style('text-center')}
            >
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </Box>
    </Box>
  );

  const renderHeader = () => {
    // Show skeleton header if no title/market data available
    if (!title && !market?.title) {
      return <PredictDetailsHeaderSkeleton />;
    }

    // Show real header
    return (
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Start}
        twClassName="gap-3 pb-4"
        style={{ paddingTop: insets.top + 12 }}
      >
        <Box twClassName="flex-row items-center gap-3 px-1">
          <Pressable
            onPress={handleBackPress}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={strings('predict.buttons.back')}
            style={tw.style('items-center justify-center rounded-full')}
            testID={PredictMarketDetailsSelectorsIDs.BACK_BUTTON}
          >
            <Icon
              name={IconName.ArrowLeft}
              size={IconSize.Lg}
              color={colors.icon.default}
            />
          </Pressable>
          <Box twClassName="w-10 h-10 rounded-lg bg-muted overflow-hidden">
            {image || market?.image ? (
              <Image
                source={{ uri: image || market?.image }}
                style={tw.style('w-full h-full')}
                resizeMode="cover"
              />
            ) : (
              <Box twClassName="w-full h-full bg-muted" />
            )}
          </Box>
        </Box>
        <Box
          twClassName="flex-1 min-h-[40px]"
          justifyContent={
            titleLineCount >= 2 ? undefined : BoxJustifyContent.Center
          }
          style={titleLineCount >= 2 ? tw.style('mt-[-5px]') : undefined}
        >
          <Text variant={TextVariant.HeadingMd} color={TextColor.TextDefault}>
            {title || market?.title || ''}
          </Text>
        </Box>
        <Box twClassName="pr-2">
          <PredictShareButton marketId={market?.id} />
        </Box>
      </Box>
    );
  };

  const renderMarketStatus = () => (
    <Box twClassName="gap-2">
      <Box flexDirection={BoxFlexDirection.Column} twClassName="gap-2">
        {winningOutcomeToken && !multipleOpenOutcomesPartiallyResolved && (
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            twClassName="gap-2"
          >
            {resolutionStatus === 'resolved' ? (
              <>
                <Icon
                  name={IconName.CheckBold}
                  size={IconSize.Md}
                  color={colors.text.alternative}
                />
                <Text
                  variant={TextVariant.BodyMd}
                  twClassName="font-medium"
                  color={TextColor.TextAlternative}
                >
                  {strings('predict.market_details.market_resulted_to', {
                    outcome: winningOutcomeToken.title,
                  })}
                </Text>
              </>
            ) : (
              <>
                <Icon
                  name={IconName.CheckBold}
                  size={IconSize.Md}
                  color={colors.text.alternative}
                />
                <Text
                  variant={TextVariant.BodyMd}
                  twClassName="font-medium"
                  color={TextColor.TextAlternative}
                >
                  {strings('predict.market_details.market_ended_on', {
                    outcome: winningOutcomeToken.title,
                  })}
                </Text>
              </>
            )}
          </Box>
        )}
        {market?.status === PredictMarketStatus.CLOSED &&
          resolutionStatus !== 'resolved' && (
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              twClassName="gap-2"
            >
              <Icon
                name={IconName.Clock}
                size={IconSize.Md}
                color={colors.text.default}
              />
              <Text
                variant={TextVariant.BodyMd}
                twClassName="font-medium"
                color={TextColor.TextDefault}
              >
                {strings('predict.market_details.waiting_for_final_resolution')}
              </Text>
            </Box>
          )}
      </Box>
    </Box>
  );

  const renderPositionsSection = () => {
    if (
      (activePositions.length > 0 || claimablePositions.length > 0) &&
      market
    ) {
      return (
        <Box twClassName="space-y-4">
          {activePositions.map((position) => (
            <PredictPositionDetail
              key={position.id}
              position={position}
              market={market}
              marketStatus={market?.status as PredictMarketStatus}
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
      <Box twClassName="space-y-4">
        <Text
          variant={TextVariant.BodyMd}
          twClassName="font-medium"
          color={TextColor.TextAlternative}
        >
          {strings('predict.market_details.no_positions_found')}
        </Text>
      </Box>
    );
  };

  const renderAboutSection = () => (
    <Box twClassName="gap-6">
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
            ${formatVolume(market?.outcomes[0].volume || 0)}
          </Text>
        </Box>
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
              name={IconName.Clock}
              size={IconSize.Md}
              color={colors.text.muted}
            />
            <Text
              variant={TextVariant.BodyMd}
              twClassName="font-medium"
              color={TextColor.TextDefault}
            >
              {strings('predict.market_details.end_date')}
            </Text>
          </Box>
          <Text
            variant={TextVariant.BodyMd}
            twClassName="font-medium"
            color={TextColor.TextDefault}
          >
            {market?.endDate
              ? new Date(market?.endDate).toLocaleDateString()
              : 'N/A'}
          </Text>
        </Box>
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
              name={IconName.Bank}
              size={IconSize.Md}
              color={colors.text.muted}
            />
            <Text
              variant={TextVariant.BodyMd}
              twClassName="font-medium"
              color={TextColor.TextDefault}
            >
              {strings('predict.market_details.resolution_details')}
            </Text>
          </Box>
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            twClassName="gap-1"
          >
            <Pressable onPress={handlePolymarketResolution}>
              <Text
                variant={TextVariant.BodyMd}
                twClassName="font-medium"
                color={TextColor.PrimaryDefault}
              >
                Polymarket
              </Text>
            </Pressable>
            <Icon
              name={IconName.Export}
              size={IconSize.Sm}
              color={colors.primary.default}
            />
          </Box>
        </Box>
      </Box>
      <Box twClassName="w-full border-t border-muted" />
      <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
        {market?.description}
      </Text>
    </Box>
  );

  // see if there are any positions with positive percentPnl
  const hasPositivePnl = claimablePositions.some(
    (position) => position.percentPnl > 0,
  );

  const renderActionButtons = () => (
    <>
      {(() => {
        if (market?.status === PredictMarketStatus.CLOSED && hasPositivePnl) {
          return (
            <ButtonHero
              size={ButtonSizeHero.Lg}
              style={tw.style('w-full')}
              onPress={handleClaimPress}
            >
              <Text
                variant={TextVariant.BodyMd}
                style={tw.style('text-white font-medium')}
              >
                {strings('confirm.predict_claim.button_label')}
              </Text>
            </ButtonHero>
          );
        }

        if (
          market?.status === PredictMarketStatus.OPEN &&
          singleOutcomeMarket
        ) {
          // use openOutcomes for real-time (CLOB) prices
          const firstOpenOutcome = openOutcomes[0];
          return (
            <Box
              flexDirection={BoxFlexDirection.Row}
              justifyContent={BoxJustifyContent.Between}
              alignItems={BoxAlignItems.Center}
              twClassName="w-full mt-4 gap-3"
            >
              <Button
                variant={ButtonVariants.Secondary}
                size={ButtonSize.Lg}
                width={ButtonWidthTypes.Full}
                style={tw.style('flex-1 bg-success-muted')}
                label={
                  <Text
                    style={tw.style('font-bold')}
                    color={TextColor.SuccessDefault}
                  >
                    {firstOpenOutcome?.tokens[0].title} • {getYesPercentage()}¢
                  </Text>
                }
                onPress={() =>
                  handleBuyPress(
                    firstOpenOutcome?.tokens[0] ??
                      market?.outcomes[0].tokens[0],
                  )
                }
              />
              <Button
                variant={ButtonVariants.Secondary}
                size={ButtonSize.Lg}
                width={ButtonWidthTypes.Full}
                style={tw.style('flex-1 bg-error-muted')}
                label={
                  <Text
                    style={tw.style('font-bold')}
                    color={TextColor.ErrorDefault}
                  >
                    {firstOpenOutcome?.tokens[1].title} •{' '}
                    {100 - getYesPercentage()}¢
                  </Text>
                }
                onPress={() =>
                  handleBuyPress(
                    firstOpenOutcome?.tokens[1] ??
                      market?.outcomes[0].tokens[1],
                  )
                }
              />
            </Box>
          );
        }

        // Show skeleton buttons while loading
        if (isMarketFetching && !market) {
          return <PredictDetailsButtonsSkeleton />;
        }

        return null;
      })()}
    </>
  );

  const renderOutcomesContent = () => {
    // Closed market with single outcome (binary)
    if (market?.status === PredictMarketStatus.CLOSED && singleOutcomeMarket) {
      return (
        <Box>
          {winningOutcome && (
            <PredictMarketOutcome
              market={market}
              outcome={winningOutcome}
              outcomeToken={winningOutcomeToken}
              isClosed
            />
          )}
          {losingOutcome && (
            <PredictMarketOutcome
              market={market}
              outcome={losingOutcome}
              outcomeToken={losingOutcomeToken}
              isClosed
            />
          )}
        </Box>
      );
    }

    // Closed market with multiple outcomes
    if (market?.status === PredictMarketStatus.CLOSED && multipleOutcomes) {
      return closedOutcomes.map((outcome) => (
        <PredictMarketOutcomeResolved key={outcome.id} outcome={outcome} />
      ));
    }

    // Open market with partially resolved outcomes
    if (
      market?.status === PredictMarketStatus.OPEN &&
      multipleOutcomes &&
      multipleOpenOutcomesPartiallyResolved
    ) {
      return (
        <Box>
          {openOutcomes.map((outcome) => (
            <PredictMarketOutcome
              key={outcome.id}
              market={market}
              outcome={outcome}
            />
          ))}
          <Pressable
            onPress={() => setIsResolvedExpanded((prev) => !prev)}
            style={({ pressed }) =>
              tw.style(
                'w-full rounded-xl bg-default px-4 py-3 mt-2 mb-4 bg-muted',
                pressed && 'bg-pressed',
              )
            }
            accessibilityRole="button"
          >
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              justifyContent={BoxJustifyContent.Between}
              twClassName="gap-3"
            >
              <Box
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
                twClassName="gap-2"
              >
                <Text
                  variant={TextVariant.BodyMd}
                  twClassName="font-medium"
                  color={TextColor.TextDefault}
                >
                  {strings('predict.resolved_outcomes')}
                </Text>
                <Box twClassName="px-2 py-0.5 rounded bg-muted">
                  <Text
                    variant={TextVariant.BodySm}
                    color={TextColor.TextAlternative}
                  >
                    {closedOutcomes.length}
                  </Text>
                </Box>
              </Box>
              <Icon
                name={
                  isResolvedExpanded ? IconName.ArrowUp : IconName.ArrowDown
                }
                size={IconSize.Md}
                color={colors.text.alternative}
              />
            </Box>
            {isResolvedExpanded &&
              closedOutcomes.map((outcome) => (
                <PredictMarketOutcomeResolved
                  key={outcome.id}
                  outcome={outcome}
                  noContainer
                />
              ))}
          </Pressable>
        </Box>
      );
    }

    // Default: show all outcomes
    return (
      <Box>
        {market &&
          (market.status === PredictMarketStatus.OPEN
            ? openOutcomes
            : (market.outcomes ?? [])
          ).map((outcome, index) => (
            <PredictMarketOutcome
              key={
                outcome?.id ??
                outcome?.tokens?.[0]?.id ??
                outcome?.title ??
                `outcome-${index}`
              }
              market={market}
              outcome={outcome}
            />
          ))}
      </Box>
    );
  };

  const renderTabContent = () => {
    if (activeTab === null || !tabsReady) {
      return null;
    }
    const currentKey = tabs[activeTab]?.key;
    if (currentKey === 'about') {
      return (
        <Box
          twClassName="px-3 pt-4 pb-8"
          testID={PredictMarketDetailsSelectorsIDs.ABOUT_TAB}
        >
          {renderAboutSection()}
        </Box>
      );
    }
    if (currentKey === 'positions') {
      return (
        <Box
          twClassName="px-3 pt-4 pb-8"
          testID={PredictMarketDetailsSelectorsIDs.POSITIONS_TAB}
        >
          {renderPositionsSection()}
        </Box>
      );
    }
    if (currentKey === 'outcomes') {
      return (
        <Box
          twClassName="px-3 pt-4 pb-8"
          testID={PredictMarketDetailsSelectorsIDs.OUTCOMES_TAB}
        >
          {renderOutcomesContent()}
        </Box>
      );
    }
    return null;
  };

  return (
    <SafeAreaView
      style={tw.style('flex-1 bg-default', isFeeExemption ? 'pb-6' : '')}
      edges={['left', 'right', 'bottom']}
      testID={PredictMarketDetailsSelectorsIDs.SCREEN}
    >
      <Box twClassName="px-3 gap-4">{renderHeader()}</Box>

      <ScrollView
        testID={PredictMarketDetailsSelectorsIDs.SCROLLABLE_TAB_VIEW}
        stickyHeaderIndices={stickyHeaderIndices}
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
        {/* Header content - scrollable */}
        <Box twClassName="px-3 gap-4">
          {renderMarketStatus()}
          {chartOpenOutcomes.length > 0 && (
            <PredictDetailsChart
              data={chartData}
              timeframes={PRICE_HISTORY_TIMEFRAMES}
              selectedTimeframe={selectedTimeframe}
              onTimeframeChange={handleTimeframeChange}
              isLoading={isPriceHistoryFetching}
              emptyLabel={chartEmptyLabel}
            />
          )}
        </Box>

        {/* Show content skeleton while initial market data is fetching */}
        {isMarketFetching && !market ? (
          <Box twClassName="px-3">
            <PredictDetailsContentSkeleton />
          </Box>
        ) : (
          /* Sticky tab bar */
          renderCustomTabBar()
        )}

        {/* Tab content - only show when market is loaded */}
        {!isMarketFetching && market && renderTabContent()}
      </ScrollView>

      <Box twClassName="px-3 bg-default border-t border-muted">
        {renderActionButtons()}
      </Box>
      {isFeeExemption && (
        <Box
          style={tw`absolute inset-x-0 bottom-4 pb-3`}
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Center}
          twClassName="gap-1"
        >
          <Text variant={TextVariant.BodyXs} color={TextColor.TextAlternative}>
            {strings('predict.market_details.fee_exemption')}
          </Text>
        </Box>
      )}
    </SafeAreaView>
  );
};

export default PredictMarketDetails;
