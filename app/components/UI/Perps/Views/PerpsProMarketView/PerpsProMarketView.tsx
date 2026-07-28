import {
  Box,
  SectionDivider,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import {
  PerpsMode,
  TimeDuration,
  getPerpsDisplaySymbol,
  type OrderType,
} from '@metamask/perps-controller';
import {
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
} from '@metamask/perps-controller/constants';
import { useRoute, type RouteProp } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView } from 'react-native';
import { useSelector } from 'react-redux';
import { SafeAreaView } from 'react-native-safe-area-context';
import { strings } from '../../../../../../locales/i18n';
import { useStyles } from '../../../../../component-library/hooks';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import Engine from '../../../../../core/Engine';
import { PerpsProMarketViewSelectorsIDs } from '../../Perps.testIds';
import PerpsCandlePeriodBottomSheet from '../../components/PerpsCandlePeriodBottomSheet';
import PerpsOrderTypeBottomSheetView from '../../components/PerpsOrderTypeBottomSheet/PerpsOrderTypeBottomSheetView';
import { usePerpsNavigation, usePerpsMode } from '../../hooks';
import { usePerpsChartInteractions } from '../../hooks/usePerpsChartInteractions';
import { usePerpsEventTracking } from '../../hooks/usePerpsEventTracking';
import usePerpsToasts from '../../hooks/usePerpsToasts';
import { selectPerpsChartPreferredCandlePeriod } from '../../selectors/chartPreferences';
import { selectPerpsAdvancedChartEnabledFlag } from '../../selectors/featureFlags';
import { createSelectIsWatchlistMarket } from '../../selectors/perpsController';
import type { PerpsStackParamList } from '../../types/navigation';
import {
  getPerpsChartAnalyticsProperties,
  getPerpsChartLibrary,
} from '../../utils/chartAnalytics';
import { WATCHLIST_LIMIT } from '../../utils/marketUtils';
import { showPerpsModeFlash } from '../../utils/perpsModeFlash';
import PerpsProChartPanel from './components/PerpsProChartPanel';
import PerpsProMarketHeader from './components/PerpsProMarketHeader';
import PerpsProMarketLayout from './components/PerpsProMarketLayout';
import PerpsProOrderBookPanel from './components/PerpsProOrderBookPanel';
import PerpsProOrderFormPanel from './components/PerpsProOrderFormPanel';
import PerpsProPositionsPanel from './components/PerpsProPositionsPanel';
import PerpsProStatsBar from './components/PerpsProStatsBar';
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
  const route =
    useRoute<RouteProp<PerpsStackParamList, 'PerpsMarketDetails'>>();
  const market = route.params?.market;
  const source = route.params?.source;
  const sourceSection = route.params?.source_section;
  const [isOrderBookCollapsed, setIsOrderBookCollapsed] = useState(false);

  const handleCollapseOrderBook = useCallback(() => {
    setIsOrderBookCollapsed(true);
  }, []);

  const handleExpandOrderBook = useCallback(() => {
    setIsOrderBookCollapsed(false);
  }, []);

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

  const [orderType, setOrderType] = useState<OrderType>('limit');
  const [isOrderTypeSheetVisible, setIsOrderTypeSheetVisible] = useState(false);

  const handleOrderTypeButtonPress = useCallback(() => {
    setIsOrderTypeSheetVisible(true);
  }, []);

  const handleOrderTypeSheetClose = useCallback(() => {
    setIsOrderTypeSheetVisible(false);
  }, []);

  const handleOrderTypeSelect = useCallback((newOrderType: OrderType) => {
    setOrderType(newOrderType);
    setIsOrderTypeSheetVisible(false);
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

  const { navigateBack, navigateToHome, navigateToMarketList, canGoBack } =
    usePerpsNavigation();
  const { mode: perpsMode, setMode: setPerpsMode } = usePerpsMode();
  const { showToast, PerpsToastOptions } = usePerpsToasts();
  const { track } = usePerpsEventTracking();

  const selectIsWatchlist = useMemo(
    () => createSelectIsWatchlistMarket(market?.symbol || ''),
    [market?.symbol],
  );
  const isWatchlist = useSelector(selectIsWatchlist);

  const handleBackPress = useCallback(() => {
    if (canGoBack) {
      navigateBack();
    } else {
      navigateToHome(PERPS_EVENT_VALUE.SOURCE.PERP_ASSET_SCREEN);
    }
  }, [canGoBack, navigateBack, navigateToHome]);

  const handleMarketListPress = useCallback(() => {
    if (!market?.symbol) {
      return;
    }

    track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
      [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
        PERPS_EVENT_VALUE.INTERACTION_TYPE.BUTTON_CLICKED,
      [PERPS_EVENT_PROPERTY.BUTTON_CLICKED]:
        PERPS_EVENT_VALUE.BUTTON_CLICKED.MARKET_LIST,
      [PERPS_EVENT_PROPERTY.BUTTON_LOCATION]:
        PERPS_EVENT_VALUE.BUTTON_LOCATION.PERP_MARKET_DETAILS,
      [PERPS_EVENT_PROPERTY.ASSET]: market.symbol,
    });

    navigateToMarketList({
      source: PERPS_EVENT_VALUE.SOURCE.PERP_ASSET_SCREEN,
    });
  }, [market?.symbol, track, navigateToMarketList]);

  const handleWalletPress = useCallback(() => {
    navigateToHome(PERPS_EVENT_VALUE.SOURCE.PERP_ASSET_SCREEN);
  }, [navigateToHome]);

  const handleFavoritePress = useCallback(() => {
    if (!market?.symbol) {
      return;
    }

    const controller = Engine.context.PerpsController;
    const isAdding = !isWatchlist;

    if (
      isAdding &&
      controller.getWatchlistMarkets().length >= WATCHLIST_LIMIT
    ) {
      showToast(PerpsToastOptions.watchlist.limitReached);
      return;
    }

    controller.toggleWatchlistMarket(market.symbol);

    track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
      [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
        PERPS_EVENT_VALUE.INTERACTION_TYPE.FAVORITE_TOGGLED,
      [PERPS_EVENT_PROPERTY.ACTION_TYPE]: isAdding
        ? PERPS_EVENT_VALUE.ACTION_TYPE.FAVORITE_MARKET
        : PERPS_EVENT_VALUE.ACTION_TYPE.UNFAVORITE_MARKET,
      [PERPS_EVENT_PROPERTY.ASSET]: market.symbol,
      [PERPS_EVENT_PROPERTY.SOURCE]: PERPS_EVENT_VALUE.SOURCE.PERP_ASSET_SCREEN,
      [PERPS_EVENT_PROPERTY.FAVORITES_COUNT]:
        controller.getWatchlistMarkets().length,
    });
  }, [market?.symbol, isWatchlist, track, showToast, PerpsToastOptions]);

  const handlePerpsModeChange = useCallback(
    (nextMode: PerpsMode) => {
      setPerpsMode(nextMode);
      showPerpsModeFlash(nextMode);
    },
    [setPerpsMode],
  );

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

  const symbol = getPerpsDisplaySymbol(market.symbol);
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
      />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        testID={PerpsProMarketViewSelectorsIDs.SCROLL_VIEW}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
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
        <PerpsProStatsBar />
        <PerpsProMarketLayout
          isOrderBookCollapsed={isOrderBookCollapsed}
          onExpandOrderBook={handleExpandOrderBook}
          orderForm={
            <PerpsProOrderFormPanel
              orderType={orderType}
              onOrderTypeButtonPress={handleOrderTypeButtonPress}
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
        <SectionDivider />
        <PerpsProPositionsPanel symbol={symbol} />
      </ScrollView>
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
      <PerpsOrderTypeBottomSheetView
        isVisible={isOrderTypeSheetVisible}
        onClose={handleOrderTypeSheetClose}
        onSelect={handleOrderTypeSelect}
        currentOrderType={orderType}
        title={strings('perps.pro_order_form.choose_order_type')}
        showSelectedIcon
      />
    </SafeAreaView>
  );
};

export default PerpsProMarketView;
