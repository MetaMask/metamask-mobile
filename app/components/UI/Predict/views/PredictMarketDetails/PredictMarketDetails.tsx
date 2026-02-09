import {
  NavigationProp,
  RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { InteractionManager, RefreshControl, ScrollView } from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { useTheme } from '../../../../../util/theme';
import { TraceName } from '../../../../../util/trace';
import { PredictNavigationParamList } from '../../types/navigation';
import { PredictEventValues } from '../../constants/eventNames';
import { estimateLineCount } from '../../utils/format';
import { usePredictMeasurement } from '../../hooks/usePredictMeasurement';
import Engine from '../../../../../core/Engine';
import { PredictMarketDetailsSelectorsIDs } from '../../Predict.testIds';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import PredictDetailsChart from '../../components/PredictDetailsChart/PredictDetailsChart';

import { usePredictMarket } from '../../hooks/usePredictMarket';
import { PredictMarketStatus, PredictOutcomeToken } from '../../types';
import { usePredictPositions } from '../../hooks/usePredictPositions';
import { usePredictClaim } from '../../hooks/usePredictClaim';
import { usePredictActionGuard } from '../../hooks/usePredictActionGuard';
import PredictDetailsContentSkeleton from '../../components/PredictDetailsContentSkeleton';
import PredictGameDetailsContent from '../../components/PredictGameDetailsContent';
import PredictMarketDetailsStatus from './components/PredictMarketDetailsStatus';
import PredictMarketDetailsHeader from './components/PredictMarketDetailsHeader';
import PredictMarketDetailsTabBar from './components/PredictMarketDetailsTabBar';
import PredictMarketDetailsActions from './components/PredictMarketDetailsActions';
import PredictMarketDetailsTabContent from './components/PredictMarketDetailsTabContent';
import { useChartData } from './hooks/useChartData';
import { useOutcomeResolution } from './hooks/useOutcomeResolution';
import { useOpenOutcomes } from './hooks/useOpenOutcomes';

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
  const [activeTab, setActiveTab] = useState<number | null>(null);
  const [userSelectedTab, setUserSelectedTab] = useState<boolean>(false);
  const insets = useSafeAreaInsets();
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isResolvedExpanded, setIsResolvedExpanded] = useState<boolean>(false);

  const {
    marketId,
    providerId: routeProviderId,
    entryPoint,
    title,
    image,
  } = route.params || {};
  const resolvedMarketId = marketId;
  const providerId = routeProviderId || 'polymarket';

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

  const {
    winningOutcomeToken,
    losingOutcomeToken,
    resolutionStatus,
    winningOutcome,
    losingOutcome,
    hasAnyOutcomeToken,
    multipleOutcomes,
    singleOutcomeMarket,
    multipleOpenOutcomesPartiallyResolved,
  } = useOutcomeResolution({ market });

  const {
    chartOpenOutcomes,
    chartData,
    chartEmptyLabel,
    selectedTimeframe,
    handleTimeframeChange,
    isPriceHistoryFetching,
    refetchPriceHistory,
    timeframes,
  } = useChartData({ market, hasAnyOutcomeToken, providerId });

  const { closedOutcomes, openOutcomes, yesPercentage } = useOpenOutcomes({
    market,
    providerId,
    isMarketFetching,
  });

  const handleBackPress = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      // If we can't go back, navigate to the main predict screen
      navigation.navigate(Routes.PREDICT.ROOT);
    }
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
          entryPoint:
            entryPoint || PredictEventValues.ENTRY_POINT.PREDICT_MARKET_DETAILS,
        });
      },
      {
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
        marketSlug: market.slug,
        gameId: market.game?.id,
        gameStartTime: market.game?.startTime,
        gameLeague: market.game?.league,
        gameStatus: market.game?.status,
        gamePeriod: market.game?.period,
        gameClock: market.game?.elapsed,
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

  // see if there are any positions with positive percentPnl
  const hasPositivePnl = claimablePositions.some(
    (position) => position.percentPnl > 0,
  );
  if (market?.game) {
    return (
      <PredictGameDetailsContent
        market={market}
        onBack={handleBackPress}
        onRefresh={handleRefresh}
        refreshing={isRefreshing}
        onBetPress={handleBuyPress}
        onClaimPress={handleClaimPress}
        claimableAmount={claimablePositions.reduce(
          (sum, p) => sum + (p.currentValue ?? 0),
          0,
        )}
        isLoading={isClaimablePositionsLoading}
      />
    );
  }

  return (
    <SafeAreaView
      style={tw.style('flex-1 bg-default', isFeeExemption ? 'pb-6' : '')}
      edges={['left', 'right', 'bottom']}
      testID={PredictMarketDetailsSelectorsIDs.SCREEN}
    >
      <Box twClassName="px-3 gap-4">
        <PredictMarketDetailsHeader
          isLoading={isMarketFetching && !market}
          market={market}
          title={title}
          image={image}
          titleLineCount={titleLineCount}
          insetsTop={insets.top}
          onBackPress={handleBackPress}
        />
      </Box>

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
          <PredictMarketDetailsStatus
            winningOutcomeToken={winningOutcomeToken}
            multipleOpenOutcomesPartiallyResolved={
              multipleOpenOutcomesPartiallyResolved
            }
            resolutionStatus={resolutionStatus}
            marketStatus={market?.status as PredictMarketStatus | undefined}
          />
          {chartOpenOutcomes.length > 0 && (
            <PredictDetailsChart
              data={chartData}
              timeframes={timeframes}
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
          <PredictMarketDetailsTabBar
            tabs={tabs}
            activeTab={activeTab}
            onTabPress={handleTabPress}
          />
        )}

        {/* Tab content - only show when market is loaded */}
        {!isMarketFetching && market && (
          <PredictMarketDetailsTabContent
            activeTab={activeTab}
            tabsReady={tabsReady}
            tabs={tabs}
            market={market}
            activePositions={activePositions}
            claimablePositions={claimablePositions}
            onPolymarketResolution={handlePolymarketResolution}
            singleOutcomeMarket={singleOutcomeMarket}
            multipleOutcomes={multipleOutcomes}
            multipleOpenOutcomesPartiallyResolved={
              multipleOpenOutcomesPartiallyResolved
            }
            winningOutcome={winningOutcome}
            losingOutcome={losingOutcome}
            winningOutcomeToken={winningOutcomeToken}
            losingOutcomeToken={losingOutcomeToken}
            openOutcomes={openOutcomes}
            closedOutcomes={closedOutcomes}
            entryPoint={entryPoint}
            isResolvedExpanded={isResolvedExpanded}
            onResolvedExpandedToggle={setIsResolvedExpanded}
          />
        )}
      </ScrollView>

      <Box twClassName="px-3 bg-default border-t border-muted">
        <PredictMarketDetailsActions
          isClaimablePositionsLoading={isClaimablePositionsLoading}
          hasPositivePnl={hasPositivePnl}
          marketStatus={market?.status as PredictMarketStatus | undefined}
          singleOutcomeMarket={singleOutcomeMarket}
          isMarketFetching={isMarketFetching}
          market={market}
          openOutcomes={openOutcomes}
          yesPercentage={yesPercentage}
          onClaimPress={handleClaimPress}
          onBuyPress={handleBuyPress}
        />
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
