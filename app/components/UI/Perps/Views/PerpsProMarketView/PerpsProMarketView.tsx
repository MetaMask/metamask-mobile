import {
  Box,
  SectionDivider,
  Text,
  TextColor,
  TextVariant,
  useHeaderStandardAnimated,
} from '@metamask/design-system-react-native';
import {
  isLimitExecutionOrderType,
  isTriggerOrderType,
  TimeDuration,
  type CandlePeriod,
  type PerpsMarketData,
} from '@metamask/perps-controller';
import {
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
} from '@metamask/perps-controller/constants';
import { AnimationDuration } from '@metamask/design-tokens';
import {
  useNavigation,
  useRoute,
  type NavigationProp,
  type RouteProp,
} from '@react-navigation/native';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useSelector } from 'react-redux';
import { View, type ScrollView } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { strings } from '../../../../../../locales/i18n';
import { useStyles } from '../../../../../component-library/hooks';
import Routes from '../../../../../constants/navigation/Routes';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { useHaptics } from '../../../../../util/haptics';
import { PerpsProMarketViewSelectorsIDs } from '../../Perps.testIds';
import PerpsBalanceBottomSheet from '../../components/PerpsBalanceBottomSheet';
import PerpsCandlePeriodBottomSheet from '../../components/PerpsCandlePeriodBottomSheet';
import PerpsProMarketStatsBar from '../../components/PerpsProMarketStatsBar';
import { usePerpsMarketData } from '../../hooks';
import { usePerpsLiveAccount } from '../../hooks/stream';
import { usePerpsChartInteractions } from '../../hooks/usePerpsChartInteractions';
import { usePerpsEventTracking } from '../../hooks/usePerpsEventTracking';
import {
  type PerpsMarketDetailSectionState,
  usePerpsMarketDetailSession,
} from '../../hooks/usePerpsMarketDetailSession';
import { usePerpsMarketDetailLiveMeasurement } from '../../hooks/usePerpsMarketDetailLiveMeasurement';
import { usePerpsMarkets } from '../../hooks/usePerpsMarkets';
import { usePerpsMarketHeaderActions } from '../../hooks/usePerpsMarketHeaderActions';
import { usePerpsRecordMarketViewed } from '../../hooks/usePerpsRecordMarketViewed';
import { usePerpsMarketContext } from '../../hooks/usePerpsMarketContext';
import { usePerpsSyncedChartPrice } from '../../hooks/usePerpsSyncedChartPrice';
import {
  PerpsOrderProvider,
  usePerpsOrderContext,
} from '../../contexts/PerpsOrderContext';
import { selectPerpsChartPreferredCandlePeriod } from '../../selectors/chartPreferences';
import { selectPerpsAdvancedChartEnabledFlag } from '../../selectors/featureFlags';
import { selectPerpsSelectedAccountAddress } from '../../selectors/selectedAccountAddress';
import type { PerpsStackParamList } from '../../types/navigation';
import {
  getPerpsChartAnalyticsProperties,
  getPerpsChartLibrary,
} from '../../utils/chartAnalytics';
import PerpsProChartPanel from './components/PerpsProChartPanel';
import PerpsMarketHeader, {
  createProMarketHeaderTestIDs,
} from '../../components/PerpsMarketHeader';
import { PRICE_SECTION_HEIGHT } from '../../components/PerpsMarketSummary';
import PerpsProMarketLayout from './components/PerpsProMarketLayout';
import PerpsProOrderBookPanel from './components/PerpsProOrderBookPanel';
import PerpsProOrderFormPanel from './components/PerpsProOrderFormPanel';
import PerpsProPositionsPanel from './components/PerpsProPositionsPanel';
import { createStyles } from './PerpsProMarketView.styles';
import { canonicalizeOrderPrice } from '../../utils/triggerOrderValidation';
import { usePerpsProSectionReadiness } from './hooks/usePerpsProSectionReadiness';

interface PerpsProOrderBookColumnProps {
  symbol: string;
  marketPrice?: number;
  isMarketContextReady: boolean;
  marketContextKey: string;
  onCollapse: () => void;
  onResolvedStateChange?: (
    symbol: string,
    state: PerpsMarketDetailSectionState,
  ) => void;
}

/**
 * Order-book column bridged to the shared order-form state (TAT-3643).
 *
 * Rendered inside `PerpsOrderProvider` (owned by `PerpsProMarketView`) so a
 * bid/ask row tap can prefill the semantic price field for the selected type
 * without changing a trigger placement to plain Limit.
 */
const PerpsProOrderBookColumn = ({
  symbol,
  marketPrice,
  isMarketContextReady,
  marketContextKey,
  onCollapse,
  onResolvedStateChange,
}: PerpsProOrderBookColumnProps) => {
  const { orderForm, commitLimitPrice, setOrderType, commitTriggerPrice } =
    usePerpsOrderContext();
  // Drives the ladder's price precision and base-size decimals — without it
  // every price falls back to magnitude-based formatting.
  const { marketData } = usePerpsMarketData({ asset: symbol });

  const handleSelectPrice = useCallback(
    (price: string) => {
      // Book prices come from the venue already on a valid tick, so canonicalize
      // only once the asset's precision is known. `canonicalizeOrderPrice` falls
      // back to a default `szDecimals` when it is not, which can round a valid
      // price onto an invalid tick and then commit it.
      const selectedPrice =
        marketData?.szDecimals === undefined
          ? price
          : canonicalizeOrderPrice(price, marketData.szDecimals);

      if (isTriggerOrderType(orderForm.type)) {
        if (isLimitExecutionOrderType(orderForm.type)) {
          commitLimitPrice(selectedPrice);
          return;
        }
        commitTriggerPrice(selectedPrice);
        return;
      }

      setOrderType('limit');
      commitLimitPrice(selectedPrice);
    },
    [
      commitLimitPrice,
      commitTriggerPrice,
      marketData?.szDecimals,
      orderForm.type,
      setOrderType,
    ],
  );

  return (
    <PerpsProOrderBookPanel
      symbol={symbol}
      marketPrice={marketPrice}
      isMarketContextReady={isMarketContextReady}
      marketContextKey={marketContextKey}
      szDecimals={marketData?.szDecimals}
      onCollapse={onCollapse}
      onSelectPrice={handleSelectPrice}
      onResolvedStateChange={onResolvedStateChange}
    />
  );
};

interface PerpsProMarketViewProps {
  generationTrigger?: 'initial' | 'market_switch' | 'mode_switch';
}

const resolveProMarketSectionState = (
  hasContent: boolean,
  hasError: boolean,
  isLoading: boolean,
): PerpsMarketDetailSectionState => {
  if (hasContent) return 'content';
  if (hasError) return 'error';
  return isLoading ? 'loading' : 'empty';
};

const resolveProAccountSectionState = (
  isLoading: boolean,
  hasAccount: boolean,
): PerpsMarketDetailSectionState => {
  if (isLoading) return 'loading';
  return hasAccount ? 'content' : 'empty';
};

const resolveProMarketSource = (
  hasRouteMarket: boolean,
  hasEnrichedMarket: boolean,
): 'route' | 'stream_enrichment' | 'unknown' => {
  if (hasRouteMarket) return 'route';
  if (hasEnrichedMarket) return 'stream_enrichment';
  return 'unknown';
};

/**
 * Pro-mode replacement for `PerpsMarketDetailsView`.
 *
 * Lays out the full Pro trading screen (header, chart, stats bar, two-column
 * order form / order book, and positions/orders section). The order book
 * column is live: raw mid/spread on the shared controller socket plus a
 * server-aggregated ladder on a dedicated AggregatedOrderBookConnection
 * (same dual-stream approach as Extension).
 */
const PerpsProMarketView = ({
  generationTrigger = 'initial',
}: PerpsProMarketViewProps) => {
  const { styles } = useStyles(createStyles, {});
  const { playSelection } = useHaptics();
  const navigation =
    useNavigation<NavigationProp<PerpsStackParamList, 'PerpsMarketDetails'>>();
  const route =
    useRoute<RouteProp<PerpsStackParamList, 'PerpsMarketDetails'>>();
  const routeMarket = route.params?.market;
  const source = route.params?.source;
  const sourceSection = route.params?.source_section;
  // Set by entry points that already carry a trade intent (e.g. spot token
  // details Long/Short), so the inline form opens on the right side.
  const initialDirection = route.params?.direction;

  // Some navigation sources (e.g. Recent Activity, deep links) pass minimal
  // market data without `maxLeverage` — fetch the full markets list to
  // enrich it, same as PerpsMarketDetailsView (Lite). Skipped entirely once
  // the route already has a properly formatted value (e.g. "40x").
  const hasFormattedMaxLeverage =
    typeof routeMarket?.maxLeverage === 'string' &&
    routeMarket.maxLeverage.endsWith('x');
  const {
    markets,
    isLoading: areMarketsLoading,
    error: marketsError,
    hasResolvedInitialData: haveMarketsResolved = false,
  } = usePerpsMarkets({
    skipInitialFetch: hasFormattedMaxLeverage,
  });
  const enrichedMarket = useMemo(
    () => markets.find((item) => item.symbol === routeMarket?.symbol),
    [markets, routeMarket?.symbol],
  );
  const market = useMemo(() => {
    if (hasFormattedMaxLeverage) return routeMarket;
    return enrichedMarket ?? routeMarket;
  }, [enrichedMarket, hasFormattedMaxLeverage, routeMarket]);
  const [isOrderBookCollapsed, setIsOrderBookCollapsed] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // Swapping the route param rather than pushing keeps a single Pro screen on
  // the stack, so tapping through positions/orders doesn't build up history.
  const handleSelectMarket = useCallback(
    (
      nextMarket: PerpsMarketData | Partial<PerpsMarketData>,
      panelSourceSection:
        | typeof PERPS_EVENT_VALUE.SOURCE_SECTION.POSITIONS
        | typeof PERPS_EVENT_VALUE.SOURCE_SECTION.ORDERS,
    ) => {
      if (!nextMarket.symbol || nextMarket.symbol === routeMarket?.symbol) {
        return;
      }

      playSelection().catch(() => undefined);

      // POSITION_TAB is the panel-level source; source_section distinguishes
      // which tab the row came from (same pattern as Perps home).
      // `direction` is cleared because `setParams` merges: the side belongs to
      // the entry point that opened this screen, and keeping it would reseed
      // the remounted order form with the previous market's trade intent.
      navigation.setParams({
        market: nextMarket,
        source: PERPS_EVENT_VALUE.SOURCE.POSITION_TAB,
        source_section: panelSourceSection,
        direction: undefined,
      });
    },
    [navigation, playSelection, routeMarket?.symbol],
  );

  // Bring the chart back into view when the active market changes (e.g. the
  // user tapped a positions/orders row while scrolled down). Matches Lite's
  // related-markets behaviour in PerpsMarketDetailsView, including
  // `animated: false` so a near-top scroll doesn't flash an animation.
  useEffect(() => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: false });
  }, [market?.symbol]);

  const handleCollapseOrderBook = useCallback(() => {
    setIsOrderBookCollapsed(true);
  }, []);

  const handleExpandOrderBook = useCallback(() => {
    setIsOrderBookCollapsed(false);
  }, []);

  // Drives the header's subtitle/live-price crossfade (see
  // PerpsProMarketHeader). The price section above the fold has a fixed
  // height, so the threshold is set once instead of measured via onLayout.
  const { scrollY, onScroll, titleSectionHeightSv, setTitleSectionHeight } =
    useHeaderStandardAnimated();
  useEffect(() => {
    setTitleSectionHeight(PRICE_SECTION_HEIGHT);
  }, [setTitleSectionHeight]);

  const handleRequestScrollBy = useCallback(
    (delta: number) => {
      scrollViewRef.current?.scrollTo({
        y: scrollY.get() + delta,
        animated: true,
      });
    },
    [scrollY],
  );

  const selectedCandlePeriod = useSelector(
    selectPerpsChartPreferredCandlePeriod,
  );
  const isAdvancedChartEnabled = useSelector(
    selectPerpsAdvancedChartEnabledFlag,
  );
  const configuredChartLibrary = getPerpsChartLibrary(isAdvancedChartEnabled);
  const [effectiveChartLibrary, setEffectiveChartLibrary] = useState(
    configuredChartLibrary,
  );
  const [isMoreCandlePeriodsVisible, setIsMoreCandlePeriodsVisible] =
    useState(false);

  const [isBalanceSheetVisible, setIsBalanceSheetVisible] = useState(false);
  const currentSymbol = market?.symbol;
  const selectedAddress = useSelector(selectPerpsSelectedAccountAddress);
  const {
    key: marketContextKey,
    isReady: isMarketContextReady,
    isUserReady: isUserContextReady,
  } = usePerpsMarketContext();
  const marketSectionContextKey = `${currentSymbol ?? ''}|${marketContextKey}`;
  const userSectionContextKey = `${marketSectionContextKey}|${selectedAddress ?? ''}`;

  // Same parent-owned merge as Lite: last candle close, overridden by the
  // Advanced Chart latest-bar close while that chart is reporting.
  const { syncedChartCurrentPrice, setAdvancedChartCurrentPrice } =
    usePerpsSyncedChartPrice({
      symbol: market?.symbol || '',
      interval: selectedCandlePeriod,
      isAdvancedChartEnabled,
      marketContextKey,
      isMarketContextReady,
    });
  const { account, isInitialLoading: isLoadingAccount } = usePerpsLiveAccount();

  const handleWalletPress = useCallback(() => {
    setIsBalanceSheetVisible(true);
  }, []);

  const appNavigation = useNavigation<AppNavigationProp>();

  const handleHistoryPress = useCallback(() => {
    appNavigation.navigate(Routes.PERPS.ACTIVITY, {
      redirectToPerpsTransactions: true,
    });
  }, [appNavigation]);

  const handleBalanceSheetClose = useCallback(() => {
    setIsBalanceSheetVisible(false);
  }, []);

  useEffect(() => {
    setEffectiveChartLibrary(configuredChartLibrary);
  }, [configuredChartLibrary, market?.symbol]);

  const chartAnalyticsProperties = useMemo(
    () => getPerpsChartAnalyticsProperties(effectiveChartLibrary),
    [effectiveChartLibrary],
  );

  const screenViewedProperties = useMemo(
    () => ({
      [PERPS_EVENT_PROPERTY.SCREEN_TYPE]:
        PERPS_EVENT_VALUE.SCREEN_TYPE.ASSET_DETAILS,
      [PERPS_EVENT_PROPERTY.ASSET]: market?.symbol || '',
      [PERPS_EVENT_PROPERTY.SOURCE]:
        source || PERPS_EVENT_VALUE.SOURCE.PERP_MARKETS,
      ...chartAnalyticsProperties,
      ...(sourceSection && {
        [PERPS_EVENT_PROPERTY.SOURCE_SECTION]: sourceSection,
      }),
    }),
    [chartAnalyticsProperties, market?.symbol, source, sourceSection],
  );

  usePerpsEventTracking({
    eventName: MetaMetricsEvents.PERPS_SCREEN_VIEWED,
    resetKey: `${market?.symbol || ''}:${effectiveChartLibrary}`,
    conditions: [Boolean(market?.symbol)],
    properties: screenViewedProperties,
  });

  const handleAdvancedChartError = useCallback(() => {
    setEffectiveChartLibrary(PERPS_EVENT_VALUE.CHART_LIBRARY.LIGHTWEIGHT);
  }, []);

  const { handleCandlePeriodChange, handleChartError } =
    usePerpsChartInteractions({
      asset: market?.symbol,
      chartAnalyticsProperties,
      chartErrorMessage: 'Chart rendering error in Pro market view',
      isAdvancedChartEnabled,
      onAdvancedChartError: handleAdvancedChartError,
    });

  const handleProCandlePeriodChange = useCallback(
    (period: CandlePeriod) => {
      if (period === selectedCandlePeriod) {
        return;
      }
      playSelection().catch(() => undefined);
      handleCandlePeriodChange(period);
    },
    [handleCandlePeriodChange, playSelection, selectedCandlePeriod],
  );

  const chartContextKey = `${marketSectionContextKey}|${selectedCandlePeriod}|${configuredChartLibrary}`;
  const marketSectionState = resolveProMarketSectionState(
    Boolean(
      currentSymbol &&
        (hasFormattedMaxLeverage || enrichedMarket?.symbol === currentSymbol),
    ),
    Boolean(marketsError),
    areMarketsLoading || !haveMarketsResolved,
  );
  const priceSectionState: PerpsMarketDetailSectionState =
    isMarketContextReady && syncedChartCurrentPrice > 0 ? 'content' : 'loading';
  const accountSectionState = resolveProAccountSectionState(
    !isMarketContextReady || !isUserContextReady || isLoadingAccount,
    Boolean(account),
  );
  const {
    onChartResolved: handleChartResolvedStateChange,
    onOrderBookResolved: handleOrderBookResolvedStateChange,
    onPositionsOrdersResolved: handlePositionsOrdersResolvedStateChange,
    onStatsResolved: handleStatsResolvedStateChange,
    sections: detailSections,
    statsState: statsSectionState,
  } = usePerpsProSectionReadiness({
    accountState: accountSectionState,
    chartContextKey,
    currentSymbol,
    isOrderBookCollapsed,
    isUserContextReady,
    marketContextKey: marketSectionContextKey,
    marketState: marketSectionState,
    priceState: priceSectionState,
    userContextKey: userSectionContextKey,
  });
  const detailSession = usePerpsMarketDetailSession({
    mode: 'pro',
    symbol: currentSymbol,
    selectedCandlePeriod,
    configuredChartLibrary,
    renderedChartLibrary: effectiveChartLibrary,
    marketSource: resolveProMarketSource(
      hasFormattedMaxLeverage,
      Boolean(enrichedMarket),
    ),
    surfaceTrigger: generationTrigger,
    entrySource: source,
    sections: detailSections,
  });

  usePerpsMarketDetailLiveMeasurement({
    detailMode: 'pro',
    detailSession,
    marketSectionState,
    priceSectionState,
    statsSectionState,
    accountSectionState,
    totalBalance: account?.totalBalance,
  });

  const {
    perpsMode,
    isWatchlist,
    handleBackPress,
    handleMarketListPress,
    handleFavoritePress,
    handlePerpsModeChange,
  } = usePerpsMarketHeaderActions({ symbol: market?.symbol });

  usePerpsRecordMarketViewed(market?.symbol);

  if (!market?.symbol) {
    return (
      <View style={styles.container}>
        <Box
          twClassName="flex-1 items-center justify-center px-4"
          testID={PerpsProMarketViewSelectorsIDs.ERROR}
        >
          <Text variant={TextVariant.BodySm} color={TextColor.ErrorDefault}>
            {strings('perps.market.details.error_message')}
          </Text>
        </Box>
      </View>
    );
  }

  const marketPrice = (() => {
    if (!market.price) {
      return undefined;
    }
    const cleaned = market.price.replace(/[$,]/g, '');
    const parsed = Number.parseFloat(cleaned);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
  })();

  return (
    <View
      style={styles.container}
      testID={PerpsProMarketViewSelectorsIDs.CONTAINER}
    >
      <PerpsMarketHeader
        market={{ ...market, symbol: market.symbol }}
        testIDs={createProMarketHeaderTestIDs()}
        mode={perpsMode}
        onBackPress={handleBackPress}
        onIdentityPress={handleMarketListPress}
        onWalletPress={handleWalletPress}
        onFavoritePress={handleFavoritePress}
        isFavorite={isWatchlist}
        onModeChange={handlePerpsModeChange}
        enableHaptics
        scrollY={scrollY}
        priceSectionHeight={titleSectionHeightSv}
        currentPrice={syncedChartCurrentPrice}
      />
      <Animated.ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        testID={PerpsProMarketViewSelectorsIDs.SCROLL_VIEW}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        <PerpsProChartPanel
          symbol={market.symbol}
          selectedCandlePeriod={selectedCandlePeriod}
          isAdvancedChartEnabled={isAdvancedChartEnabled}
          configuredChartLibrary={configuredChartLibrary}
          effectiveChartLibrary={effectiveChartLibrary}
          marketContextKey={marketContextKey}
          isMarketContextReady={isMarketContextReady}
          onCandlePeriodChange={handleProCandlePeriodChange}
          onMorePress={() => setIsMoreCandlePeriodsVisible(true)}
          onChartError={handleChartError}
          currentPrice={syncedChartCurrentPrice}
          onLatestPriceChange={setAdvancedChartCurrentPrice}
          onResolvedStateChange={handleChartResolvedStateChange}
        />
        {/* The chart's own height (`PerpsProChartPanel`) animates when
            expanded/collapsed above this point — wrap everything that would
            otherwise jump when that happens so it slides into place. */}
        <Animated.View
          layout={LinearTransition.duration(AnimationDuration.Fast)}
        >
          <PerpsProMarketStatsBar
            symbol={market.symbol}
            nextFundingTime={market.nextFundingTime}
            fundingIntervalHours={market.fundingIntervalHours}
            onResolvedStateChange={handleStatsResolvedStateChange}
          />
          {/* Provider wraps BOTH columns (not just the form) so an order-book
              row tap can drive the form's Limit price / order type via shared
              context (TAT-3643). Keyed by symbol so form state resets when the
              market changes. */}
          <PerpsOrderProvider
            key={market.symbol}
            initialAsset={market.symbol}
            initialDirection={initialDirection}
            fallbackAmount=""
          >
            <PerpsProMarketLayout
              isOrderBookCollapsed={isOrderBookCollapsed}
              orderForm={
                // PerpsMarketDetails accepts PerpsMarketData | Partial<PerpsMarketData>
                // to support deep-link trade-detail entries that may only carry
                // partial data. PerpsProMarketView is only reachable via full-market
                // navigation; the !market?.symbol guard above validates the minimum
                // required field at runtime.
                <PerpsProOrderFormPanel
                  market={market as PerpsMarketData}
                  isOrderBookCollapsed={isOrderBookCollapsed}
                  onExpandOrderBook={handleExpandOrderBook}
                  onRequestScrollBy={handleRequestScrollBy}
                  scrollViewRef={scrollViewRef}
                />
              }
              orderBook={
                <PerpsProOrderBookColumn
                  symbol={market.symbol}
                  marketPrice={marketPrice}
                  isMarketContextReady={isMarketContextReady}
                  marketContextKey={marketSectionContextKey}
                  onCollapse={handleCollapseOrderBook}
                  onResolvedStateChange={handleOrderBookResolvedStateChange}
                />
              }
            />
          </PerpsOrderProvider>
          <SectionDivider marginVertical={0} />
          <PerpsProPositionsPanel
            symbol={market.symbol}
            isMarketContextReady={isMarketContextReady}
            onSelectMarket={handleSelectMarket}
            onHistoryPress={handleHistoryPress}
            onResolvedStateChange={handlePositionsOrdersResolvedStateChange}
          />
        </Animated.View>
      </Animated.ScrollView>
      <PerpsCandlePeriodBottomSheet
        isVisible={isMoreCandlePeriodsVisible}
        onClose={() => setIsMoreCandlePeriodsVisible(false)}
        selectedPeriod={selectedCandlePeriod}
        selectedDuration={TimeDuration.YearToDate}
        onPeriodChange={handleProCandlePeriodChange}
        showAllPeriods
        asset={market.symbol}
        testID={PerpsProMarketViewSelectorsIDs.CHART_MORE_PERIODS_SHEET}
      />
      <PerpsBalanceBottomSheet
        isVisible={isBalanceSheetVisible}
        onClose={handleBalanceSheetClose}
      />
    </View>
  );
};

export default PerpsProMarketView;
