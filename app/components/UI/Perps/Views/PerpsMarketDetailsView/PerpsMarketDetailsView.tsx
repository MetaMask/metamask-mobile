import {
  useNavigation,
  useRoute,
  type NavigationProp,
  type RouteProp,
} from '@react-navigation/native';
import React, {
  useCallback,
  useMemo,
  useState,
  useEffect,
  useRef,
} from 'react';
import { SafeAreaView, ScrollView, View, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { strings } from '../../../../../../locales/i18n';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../component-library/hooks';
import Routes from '../../../../../constants/navigation/Routes';
import { PerpsMarketDetailsViewSelectorsIDs } from '../../../../../../e2e/selectors/Perps/Perps.selectors';
import CandlestickChartComponent from '../../components/PerpsCandlestickChart/PerpsCandlectickChart';
import PerpsMarketHeader from '../../components/PerpsMarketHeader';
import PerpsCandlePeriodBottomSheet from '../../components/PerpsCandlePeriodBottomSheet';
import type {
  PerpsMarketData,
  PerpsNavigationParamList,
} from '../../controllers/types';
import { usePerpsPositionData } from '../../hooks/usePerpsPositionData';
import { usePerpsMarketStats } from '../../hooks/usePerpsMarketStats';
import { useHasExistingPosition } from '../../hooks/useHasExistingPosition';
import {
  getDefaultCandlePeriodForDuration,
  TimeDuration,
  CandlePeriod,
} from '../../constants/chartConfig';
import { createStyles } from './PerpsMarketDetailsView.styles';
import type { PerpsMarketDetailsViewProps } from './PerpsMarketDetailsView.types';
import { PerpsMeasurementName } from '../../constants/performanceMetrics';
import { MetaMetricsEvents } from '../../../../hooks/useMetrics';
import { usePerpsEventTracking } from '../../hooks/usePerpsEventTracking';
import {
  PerpsEventProperties,
  PerpsEventValues,
} from '../../constants/eventNames';
import { useSelector } from 'react-redux';
import { selectPerpsProvider } from '../../selectors/perpsController';
import { capitalize } from '../../../../../util/general';
import {
  usePerpsAccount,
  usePerpsConnection,
  usePerpsOpenOrders,
  usePerpsPerformance,
  usePerpsTrading,
} from '../../hooks';
import PerpsMarketTabs from '../../components/PerpsMarketTabs/PerpsMarketTabs';
interface MarketDetailsRouteParams {
  market: PerpsMarketData;
}

const PerpsMarketDetailsView: React.FC<PerpsMarketDetailsViewProps> = () => {
  const navigation = useNavigation<NavigationProp<PerpsNavigationParamList>>();
  const route =
    useRoute<RouteProp<{ params: MarketDetailsRouteParams }, 'params'>>();
  const { market } = route.params || {};
  const { top } = useSafeAreaInsets();
  const { track } = usePerpsEventTracking();

  // Track screen load time
  const { startMeasure, endMeasure } = usePerpsPerformance();
  const hasTrackedAssetView = useRef(false);

  // Start measuring screen load time on mount
  useEffect(() => {
    startMeasure(PerpsMeasurementName.ASSET_SCREEN_LOADED);
    startMeasure(PerpsMeasurementName.POSITION_DATA_LOADED_PERP_ASSET_SCREEN);
  }, [startMeasure]);

  const [selectedDuration, setSelectedDuration] = useState<TimeDuration>(
    TimeDuration.ONE_DAY,
  );
  const [selectedCandlePeriod, setSelectedCandlePeriod] =
    useState<CandlePeriod>(() =>
      getDefaultCandlePeriodForDuration(TimeDuration.ONE_DAY),
    );
  const [
    isCandlePeriodBottomSheetVisible,
    setIsCandlePeriodBottomSheetVisible,
  ] = useState(false);
  const [activeTabId, setActiveTabId] = useState('position');
  const [refreshing, setRefreshing] = useState(false);

  const perpsProvider = useSelector(selectPerpsProvider);

  const account = usePerpsAccount();

  const { isConnected } = usePerpsConnection();
  const { depositWithConfirmation } = usePerpsTrading();

  // Get currently open orders for this market
  const { orders: ordersData, refresh: refreshOrders } = usePerpsOpenOrders({
    skipInitialFetch: !isConnected,
    enablePolling: true,
    pollingInterval: 5000, // Poll every 5 seconds for real-time updates
  });

  // Filter orders for the current market
  const openOrders = useMemo(() => {
    if (!ordersData?.length || !market?.symbol) return [];
    return ordersData.filter((order) => order.symbol === market.symbol);
  }, [ordersData, market?.symbol]);

  const hasZeroBalance = useMemo(
    () => parseFloat(account?.availableBalance || '0') === 0,
    [account?.availableBalance],
  );

  // Get comprehensive market statistics
  const marketStats = usePerpsMarketStats(market?.symbol || '');

  // Get candlestick data
  const { candleData, isLoadingHistory, priceData, refreshCandleData } =
    usePerpsPositionData({
      coin: market?.symbol || '',
      selectedDuration, // Time duration (1hr, 1D, 1W, etc.)
      selectedInterval: selectedCandlePeriod, // Candle period (1m, 3m, 5m, etc.)
    });

  // Check if user has an existing position for this market
  const {
    isLoading: isLoadingPosition,
    existingPosition,
    refreshPosition,
  } = useHasExistingPosition({
    asset: market?.symbol || '',
    loadOnMount: true,
  });

  // Track screen load and position data loaded
  useEffect(() => {
    if (
      market &&
      marketStats &&
      !isLoadingHistory &&
      !hasTrackedAssetView.current
    ) {
      // Track asset screen loaded
      endMeasure(PerpsMeasurementName.ASSET_SCREEN_LOADED);

      // Track asset screen viewed event - only once
      track(MetaMetricsEvents.PERPS_ASSET_SCREEN_VIEWED, {
        [PerpsEventProperties.ASSET]: market.symbol,
        [PerpsEventProperties.SOURCE]: PerpsEventValues.SOURCE.PERP_MARKETS,
      });

      hasTrackedAssetView.current = true;
    }
  }, [market, marketStats, isLoadingHistory, track, endMeasure]);

  useEffect(() => {
    if (!isLoadingPosition && market) {
      // Track position data loaded for asset screen
      endMeasure(PerpsMeasurementName.POSITION_DATA_LOADED_PERP_ASSET_SCREEN);
    }
  }, [isLoadingPosition, market, endMeasure]);

  const handleDurationChange = useCallback(
    (newDuration: TimeDuration) => {
      setSelectedDuration(newDuration);
      // Auto-update candle period to the appropriate default for the new duration
      const defaultPeriod = getDefaultCandlePeriodForDuration(newDuration);
      setSelectedCandlePeriod(defaultPeriod);

      // Track chart time series change
      track(MetaMetricsEvents.PERPS_CHART_TIME_SERIE_CHANGED, {
        [PerpsEventProperties.ASSET]: market?.symbol || '',
        [PerpsEventProperties.TIME_SERIE_SELECTED]: newDuration,
      });
    },
    [market, track],
  );

  const handleCandlePeriodChange = useCallback(
    (newPeriod: CandlePeriod) => {
      setSelectedCandlePeriod(newPeriod);

      // Track chart interaction
      track(MetaMetricsEvents.PERPS_CHART_INTERACTION, {
        [PerpsEventProperties.ASSET]: market?.symbol || '',
        [PerpsEventProperties.INTERACTION_TYPE]: 'candle_period_change',
        [PerpsEventProperties.CANDLE_PERIOD]: newPeriod,
      });
    },
    [market, track],
  );

  const handleGearPress = useCallback(() => {
    setIsCandlePeriodBottomSheetVisible(true);
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);

    try {
      // Always refresh chart data regardless of active tab
      if (candleData) {
        await refreshCandleData();
      }

      switch (activeTabId) {
        case 'position':
          // Refresh position data
          await refreshPosition();
          break;

        case 'orders':
          // Refresh orders data
          await refreshOrders();
          break;

        case 'statistics':
          // Refresh market statistics (24h high/low from candle data)
          await marketStats.refresh();
          // Also refresh position as it affects some stats
          await refreshPosition();
          break;

        default:
          // Fallback: refresh position
          await refreshPosition();
      }
    } catch (error) {
      console.error(`Failed to refresh ${activeTabId} data:`, error);
    } finally {
      setRefreshing(false);
    }
  }, [
    activeTabId,
    refreshPosition,
    refreshOrders,
    marketStats,
    candleData,
    refreshCandleData,
  ]);

  const handleBackPress = () => {
    navigation.goBack();
  };

  const handleLongPress = () => {
    navigation.navigate(Routes.PERPS.ORDER, {
      direction: 'long',
      asset: market.symbol,
    });
  };

  const handleShortPress = () => {
    navigation.navigate(Routes.PERPS.ORDER, {
      direction: 'short',
      asset: market.symbol,
    });
  };

  const handleAddFundsPress = () => {
    // Navigate immediately to confirmations screen for instant UI response
    navigation.navigate(Routes.PERPS.ROOT, {
      screen: Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS,
    });

    // Initialize deposit in the background without blocking
    depositWithConfirmation().catch((error) => {
      console.error('Failed to initialize deposit:', error);
    });
  };

  // Determine if any action buttons will be visible
  const hasLongShortButtons = useMemo(
    () => !isLoadingPosition && !hasZeroBalance,
    [isLoadingPosition, hasZeroBalance],
  );

  const hasAddFundsButton = useMemo(
    () => hasZeroBalance && !isLoadingPosition,
    [hasZeroBalance, isLoadingPosition],
  );

  // Simplified styles - no complex calculations needed
  const { styles, theme } = useStyles(createStyles, {});

  if (!market) {
    return (
      <SafeAreaView style={[styles.container, { paddingTop: top }]}>
        <View
          style={styles.errorContainer}
          testID={PerpsMarketDetailsViewSelectorsIDs.ERROR}
        >
          <Text variant={TextVariant.BodySM} color={TextColor.Error}>
            {strings('perps.market.details.error_message')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.mainContainer, { marginTop: top }]}
      testID={PerpsMarketDetailsViewSelectorsIDs.CONTAINER}
    >
      {/* Fixed Header Section */}
      <View>
        <PerpsMarketHeader
          market={market}
          currentPrice={marketStats.currentPrice}
          priceChange24h={marketStats.priceChange24h}
          onBackPress={handleBackPress}
          testID={PerpsMarketDetailsViewSelectorsIDs.HEADER}
        />
      </View>

      {/* Scrollable Content Container */}
      <View style={styles.scrollableContentContainer}>
        <ScrollView
          style={styles.mainContentScrollView}
          contentContainerStyle={styles.scrollViewContent}
          showsVerticalScrollIndicator={false}
          testID={PerpsMarketDetailsViewSelectorsIDs.SCROLL_VIEW}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.colors.icon.default}
              colors={[theme.colors.icon.default]} // Android
            />
          }
        >
          {/* Chart Section */}
          <View style={[styles.section, styles.chartSection]}>
            <CandlestickChartComponent
              candleData={candleData}
              isLoading={isLoadingHistory}
              height={350}
              selectedDuration={selectedDuration}
              tpslLines={
                existingPosition
                  ? {
                      takeProfitPrice: existingPosition.takeProfitPrice,
                      stopLossPrice: existingPosition.stopLossPrice,
                      entryPrice: existingPosition.entryPrice,
                      liquidationPrice: existingPosition.liquidationPrice,
                      currentPrice: marketStats.currentPrice?.toString(),
                    }
                  : undefined
              }
              onDurationChange={handleDurationChange}
              onGearPress={handleGearPress}
            />
          </View>

          {/* Market Tabs Section */}
          <View style={styles.section}>
            <PerpsMarketTabs
              marketStats={marketStats}
              position={existingPosition}
              isLoadingPosition={isLoadingPosition}
              unfilledOrders={openOrders}
              onPositionUpdate={refreshPosition}
              onActiveTabChange={setActiveTabId}
              priceData={priceData}
            />
          </View>

          {/* Risk Disclaimer Section */}
          <View style={styles.section}>
            <Text
              style={styles.riskDisclaimer}
              variant={TextVariant.BodyXS}
              color={TextColor.Alternative}
            >
              {strings('perps.risk_disclaimer', {
                provider: capitalize(perpsProvider),
              })}
            </Text>
          </View>
        </ScrollView>
      </View>

      {/* Fixed Actions Footer */}
      {(hasAddFundsButton || hasLongShortButtons) && (
        <View style={styles.actionsFooter}>
          {hasAddFundsButton && (
            <View style={styles.singleActionContainer}>
              <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
                {strings('perps.market.add_funds_to_start_trading_perps')}
              </Text>
              <Button
                variant={ButtonVariants.Primary}
                size={ButtonSize.Lg}
                width={ButtonWidthTypes.Full}
                label={strings('perps.market.add_funds')}
                onPress={handleAddFundsPress}
                testID={PerpsMarketDetailsViewSelectorsIDs.ADD_FUNDS_BUTTON}
              />
            </View>
          )}

          {hasLongShortButtons && (
            <View style={styles.actionsContainer}>
              <Button
                variant={ButtonVariants.Primary}
                size={ButtonSize.Lg}
                width={ButtonWidthTypes.Full}
                label={strings('perps.market.long')}
                onPress={handleLongPress}
                style={[styles.actionButton, styles.longButton]}
                testID={PerpsMarketDetailsViewSelectorsIDs.LONG_BUTTON}
              />
              <Button
                variant={ButtonVariants.Primary}
                size={ButtonSize.Lg}
                width={ButtonWidthTypes.Full}
                label={strings('perps.market.short')}
                onPress={handleShortPress}
                style={[styles.actionButton, styles.shortButton]}
                testID={PerpsMarketDetailsViewSelectorsIDs.SHORT_BUTTON}
              />
            </View>
          )}
        </View>
      )}

      {/* Candle Period Bottom Sheet */}
      {isCandlePeriodBottomSheetVisible && (
        <PerpsCandlePeriodBottomSheet
          isVisible
          onClose={() => setIsCandlePeriodBottomSheetVisible(false)}
          selectedPeriod={selectedCandlePeriod}
          selectedDuration={selectedDuration}
          onPeriodChange={handleCandlePeriodChange}
          testID={PerpsMarketDetailsViewSelectorsIDs.CANDLE_PERIOD_BOTTOM_SHEET}
        />
      )}
    </SafeAreaView>
  );
};

export default PerpsMarketDetailsView;
