import {
  Box,
  SectionDivider,
  Text,
  TextColor,
  TextVariant,
  useHeaderStandardAnimated,
} from '@metamask/design-system-react-native';
import { TimeDuration, type PerpsMarketData } from '@metamask/perps-controller';
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
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { strings } from '../../../../../../locales/i18n';
import { useStyles } from '../../../../../component-library/hooks';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { PerpsProMarketViewSelectorsIDs } from '../../Perps.testIds';
import PerpsBalanceBottomSheet from '../../components/PerpsBalanceBottomSheet';
import PerpsCandlePeriodBottomSheet from '../../components/PerpsCandlePeriodBottomSheet';
import PerpsProMarketStatsBar from '../../components/PerpsProMarketStatsBar';
import { usePerpsChartInteractions } from '../../hooks/usePerpsChartInteractions';
import { usePerpsEventTracking } from '../../hooks/usePerpsEventTracking';
import { usePerpsMarkets } from '../../hooks/usePerpsMarkets';
import { usePerpsProMarketHeaderActions } from '../../hooks/usePerpsProMarketHeaderActions';
import { selectPerpsChartPreferredCandlePeriod } from '../../selectors/chartPreferences';
import { selectPerpsAdvancedChartEnabledFlag } from '../../selectors/featureFlags';
import type { PerpsStackParamList } from '../../types/navigation';
import {
  getPerpsChartAnalyticsProperties,
  getPerpsChartLibrary,
} from '../../utils/chartAnalytics';
import PerpsProChartPanel from './components/PerpsProChartPanel';
import PerpsProMarketHeader from './components/PerpsProMarketHeader';
import PerpsProMarketLayout from './components/PerpsProMarketLayout';
import PerpsProOrderBookPanel from './components/PerpsProOrderBookPanel';
import PerpsProOrderFormPanel from './components/PerpsProOrderFormPanel';
import PerpsProPositionsPanel from './components/PerpsProPositionsPanel';
import { PRICE_SECTION_HEIGHT } from './components/PerpsProMarketSummary';
import { createStyles } from './PerpsProMarketView.styles';

/**
 * Pro-mode replacement for `PerpsMarketDetailsView`.
 *
 * Lays out the full Pro trading screen (header, chart, stats bar, two-column
 * order form / order book, and positions/orders section). The order book
 * column is live: raw mid/spread on the shared controller socket plus a
 * server-aggregated ladder on a dedicated AggregatedOrderBookConnection
 * (same dual-stream approach as Extension).
 */
const PerpsProMarketView = () => {
  const { styles } = useStyles(createStyles, {});
  const navigation =
    useNavigation<NavigationProp<PerpsStackParamList, 'PerpsMarketDetails'>>();
  const route =
    useRoute<RouteProp<PerpsStackParamList, 'PerpsMarketDetails'>>();
  const routeMarket = route.params?.market;
  const source = route.params?.source;
  const sourceSection = route.params?.source_section;

  // Some navigation sources (e.g. Recent Activity, deep links) pass minimal
  // market data without `maxLeverage` — fetch the full markets list to
  // enrich it, same as PerpsMarketDetailsView (Lite). Skipped entirely once
  // the route already has a properly formatted value (e.g. "40x").
  const hasFormattedMaxLeverage =
    typeof routeMarket?.maxLeverage === 'string' &&
    routeMarket.maxLeverage.endsWith('x');
  const { markets } = usePerpsMarkets({
    skipInitialFetch: hasFormattedMaxLeverage,
  });
  const market = useMemo(() => {
    if (hasFormattedMaxLeverage) return routeMarket;
    const fullMarket = markets.find((m) => m.symbol === routeMarket?.symbol);
    return fullMarket || routeMarket;
  }, [hasFormattedMaxLeverage, markets, routeMarket]);
  const [isOrderBookCollapsed, setIsOrderBookCollapsed] = useState(false);

  // Swapping the route param rather than pushing keeps a single Pro screen on
  // the stack, so tapping through positions/orders doesn't build up history.
  const handleSelectMarket = useCallback(
    (nextMarket: PerpsMarketData | Partial<PerpsMarketData>) => {
      if (!nextMarket.symbol || nextMarket.symbol === routeMarket?.symbol) {
        return;
      }

      navigation.setParams({
        market: nextMarket,
        source: PERPS_EVENT_VALUE.SOURCE.POSITION_TAB,
        source_section: undefined,
      });
    },
    [navigation, routeMarket?.symbol],
  );

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

  const handleWalletPress = useCallback(() => {
    setIsBalanceSheetVisible(true);
  }, []);

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

  const {
    perpsMode,
    isWatchlist,
    handleBackPress,
    handleMarketListPress,
    handleFavoritePress,
    handlePerpsModeChange,
  } = usePerpsProMarketHeaderActions({ symbol: market?.symbol });

  if (!market?.symbol) {
    return (
      <SafeAreaView
        style={styles.container}
        edges={['top', 'bottom', 'left', 'right']}
      >
        <Box
          twClassName="flex-1 items-center justify-center px-4"
          testID={PerpsProMarketViewSelectorsIDs.ERROR}
        >
          <Text variant={TextVariant.BodySm} color={TextColor.ErrorDefault}>
            {strings('perps.market.details.error_message')}
          </Text>
        </Box>
      </SafeAreaView>
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
    <SafeAreaView
      style={styles.container}
      edges={['top', 'bottom', 'left', 'right']}
      testID={PerpsProMarketViewSelectorsIDs.CONTAINER}
    >
      <PerpsProMarketHeader
        market={{ ...market, symbol: market.symbol }}
        mode={perpsMode}
        onBackPress={handleBackPress}
        onIdentityPress={handleMarketListPress}
        onWalletPress={handleWalletPress}
        onFavoritePress={handleFavoritePress}
        isFavorite={isWatchlist}
        onModeChange={handlePerpsModeChange}
        scrollY={scrollY}
        priceSectionHeight={titleSectionHeightSv}
      />
      <Animated.ScrollView
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
          effectiveChartLibrary={effectiveChartLibrary}
          onCandlePeriodChange={handleCandlePeriodChange}
          onMorePress={() => setIsMoreCandlePeriodsVisible(true)}
          onChartError={handleChartError}
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
          />
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
              />
            }
            orderBook={
              <PerpsProOrderBookPanel
                symbol={market.symbol}
                marketPrice={marketPrice}
                onCollapse={handleCollapseOrderBook}
              />
            }
          />
          <SectionDivider marginVertical={0} />
          <PerpsProPositionsPanel
            symbol={market.symbol}
            onSelectMarket={handleSelectMarket}
          />
        </Animated.View>
      </Animated.ScrollView>
      <PerpsCandlePeriodBottomSheet
        isVisible={isMoreCandlePeriodsVisible}
        onClose={() => setIsMoreCandlePeriodsVisible(false)}
        selectedPeriod={selectedCandlePeriod}
        selectedDuration={TimeDuration.YearToDate}
        onPeriodChange={handleCandlePeriodChange}
        showAllPeriods
        asset={market.symbol}
        testID={PerpsProMarketViewSelectorsIDs.CHART_MORE_PERIODS_SHEET}
      />
      <PerpsBalanceBottomSheet
        isVisible={isBalanceSheetVisible}
        onClose={handleBalanceSheetClose}
      />
    </SafeAreaView>
  );
};

export default PerpsProMarketView;
