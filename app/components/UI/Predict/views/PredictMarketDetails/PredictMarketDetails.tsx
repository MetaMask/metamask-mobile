import {
  NavigationProp,
  RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  InteractionManager,
  Image as RNImage,
  RefreshControl,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { useTheme } from '../../../../../util/theme';
import { TraceName } from '../../../../../util/trace';
import { PredictNavigationParamList } from '../../types/navigation';
import { PredictEventValues } from '../../constants/eventNames';
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
import HeaderStandardAnimated from '../../../../../component-library/components-temp/HeaderStandardAnimated/HeaderStandardAnimated';
import useHeaderStandardAnimated from '../../../../../component-library/components-temp/HeaderStandardAnimated/useHeaderStandardAnimated';
import TitleSubpage from '../../../../../component-library/components-temp/TitleSubpage/TitleSubpage';
import Skeleton from '../../../../../component-library/components/Skeleton/Skeleton';
import PredictMarketDetailsStatus from './components/PredictMarketDetailsStatus';
import PredictShareButton from '../../components/PredictShareButton/PredictShareButton';
import PredictMarketDetailsTabBar from './components/PredictMarketDetailsTabBar';
import PredictMarketDetailsActions from './components/PredictMarketDetailsActions';
import PredictMarketDetailsTabContent from './components/PredictMarketDetailsTabContent';
import { useChartData } from './hooks/useChartData';
import { useOutcomeResolution } from './hooks/useOutcomeResolution';
import { useOpenOutcomes } from './hooks/useOpenOutcomes';
import { useSelector } from 'react-redux';
import { selectPredictFeeCollectionFlag } from '../../selectors/featureFlags';

// Use theme tokens instead of hex values for multi-series charts

interface PredictMarketDetailsProps {}

const PredictMarketDetails: React.FC<PredictMarketDetailsProps> = () => {
  const navigation =
    useNavigation<NavigationProp<PredictNavigationParamList>>();
  const { colors } = useTheme();
  const { claim, isClaimPending } = usePredictClaim();
  const route =
    useRoute<RouteProp<PredictNavigationParamList, 'PredictMarketDetails'>>();
  const tw = useTailwind();
  const [activeTab, setActiveTab] = useState<number | null>(null);
  const [userSelectedTab, setUserSelectedTab] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const {
    scrollY: scrollYAnimated,
    onScroll,
    setTitleSectionHeight,
    titleSectionHeightSv,
  } = useHeaderStandardAnimated();
  const [isResolvedExpanded, setIsResolvedExpanded] = useState<boolean>(false);

  const { marketId, entryPoint, title, image } = route.params || {};
  const resolvedMarketId = marketId;

  const { executeGuardedAction } = usePredictActionGuard({
    navigation,
  });

  const {
    data: marketData,
    isLoading: isMarketLoading,
    isFetching: isMarketFetching,
    refetch: refetchMarket,
  } = usePredictMarket({
    id: resolvedMarketId ?? '',
    enabled: Boolean(resolvedMarketId),
  });
  const market = marketData ?? null;

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

  const showingContentSkeletonAtStickyIndex = Boolean(
    isMarketFetching && !market,
  );

  const stickyHeaderIndices = useMemo(() => {
    if (showingContentSkeletonAtStickyIndex) {
      return [];
    }
    return [2];
  }, [showingContentSkeletonAtStickyIndex]);

  const displayTitle = title ?? market?.title ?? '';

  // active positions
  const {
    data: activePositions = [],
    isLoading: isActivePositionsLoading,
    refetch: refetchActivePositions,
  } = usePredictPositions({
    marketId: resolvedMarketId,
    claimable: false,
    enabled: !isMarketLoading && Boolean(resolvedMarketId),
  });

  // "claimable" positions
  const {
    data: claimablePositions = [],
    isLoading: isClaimablePositionsLoading,
    refetch: refetchClaimablePositions,
  } = usePredictPositions({
    marketId: resolvedMarketId,
    claimable: true,
    enabled: !isMarketLoading && Boolean(resolvedMarketId),
  });

  const feeCollectionConfig = useSelector(selectPredictFeeCollectionFlag);
  const isFeeExemption =
    market?.tags?.some((slug) =>
      feeCollectionConfig.waiveList?.includes(slug),
    ) ?? false;

  // Tabs become ready when both market and positions queries have resolved
  const tabsReady = useMemo(
    () =>
      !isMarketLoading &&
      !isActivePositionsLoading &&
      !isClaimablePositionsLoading,
    [isMarketLoading, isActivePositionsLoading, isClaimablePositionsLoading],
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
  } = useChartData({ market, hasAnyOutcomeToken });

  const { closedOutcomes, openOutcomes, yesPercentage } = useOpenOutcomes({
    market,
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
      refetchActivePositions(),
      refetchClaimablePositions(),
    ]);
    setIsRefreshing(false);
  }, [
    refetchActivePositions,
    refetchMarket,
    refetchPriceHistory,
    refetchClaimablePositions,
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
        isClaimPending={isClaimPending}
      />
    );
  }

  const predictionsImageUri = image ?? market?.image;

  return (
    <SafeAreaView
      style={tw.style('flex-1 bg-default', isFeeExemption ? 'pb-6' : '')}
      edges={['left', 'right', 'bottom']}
      testID={PredictMarketDetailsSelectorsIDs.SCREEN}
    >
      <HeaderStandardAnimated
        scrollY={scrollYAnimated}
        titleSectionHeight={titleSectionHeightSv}
        title={displayTitle}
        onBack={handleBackPress}
        backButtonProps={{
          testID: PredictMarketDetailsSelectorsIDs.BACK_BUTTON,
        }}
        endAccessory={
          <PredictShareButton
            marketId={market?.id ?? marketId}
            marketSlug={market?.slug}
          />
        }
        includesTopInset
      />
      <Animated.ScrollView
        testID={PredictMarketDetailsSelectorsIDs.SCROLLABLE_TAB_VIEW}
        onScroll={onScroll}
        scrollEventThrottle={16}
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
        <Box
          onLayout={(e) => setTitleSectionHeight(e.nativeEvent.layout.height)}
          twClassName="px-4 pb-4"
        >
          {isMarketFetching && !market ? (
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              twClassName="gap-3"
              testID={PredictMarketDetailsSelectorsIDs.TITLE_SECTION_SKELETON}
            >
              <Skeleton width={40} height={40} style={tw.style('rounded-lg')} />
              <Skeleton
                width="60%"
                height={20}
                style={tw.style('rounded-md flex-1')}
              />
            </Box>
          ) : (
            <TitleSubpage
              title={displayTitle}
              startAccessory={
                predictionsImageUri ? (
                  <Box twClassName="w-10 h-10 rounded-lg bg-muted overflow-hidden">
                    <RNImage
                      source={{ uri: predictionsImageUri }}
                      style={tw.style('w-full h-full')}
                      resizeMode="cover"
                    />
                  </Box>
                ) : (
                  <Box twClassName="w-10 h-10 rounded-lg bg-muted" />
                )
              }
              twClassName="flex-1"
            />
          )}
        </Box>

        {/* Status and chart - scrollable */}
        <Box twClassName="gap-4 px-4">
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
          <Box twClassName="px-4">
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
        {!isMarketLoading && market && (
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
      </Animated.ScrollView>

      <Box twClassName="px-4 bg-default border-t border-muted">
        <PredictMarketDetailsActions
          isClaimablePositionsLoading={isClaimablePositionsLoading}
          hasPositivePnl={hasPositivePnl}
          marketStatus={market?.status as PredictMarketStatus | undefined}
          singleOutcomeMarket={singleOutcomeMarket}
          isMarketLoading={isMarketLoading}
          market={market}
          openOutcomes={openOutcomes}
          yesPercentage={yesPercentage}
          onClaimPress={handleClaimPress}
          onBuyPress={handleBuyPress}
          isClaimPending={isClaimPending}
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
