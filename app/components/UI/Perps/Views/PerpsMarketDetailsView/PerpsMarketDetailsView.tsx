import {
  useNavigation,
  useRoute,
  type NavigationProp,
  type RouteProp,
} from '@react-navigation/native';
import React, { useCallback, useMemo, useState } from 'react';
import { SafeAreaView, ScrollView, View } from 'react-native';
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
import {
  getDefaultCandlePeriodForDuration,
  TimeDuration,
  CandlePeriod,
} from '../../constants/chartConfig';
import { createStyles } from './PerpsMarketDetailsView.styles';
import type { PerpsMarketDetailsViewProps } from './PerpsMarketDetailsView.types';
import { useSelector } from 'react-redux';
import { selectPerpsProvider } from '../../selectors/perpsController';
import { capitalize } from '../../../../../util/general';
import {
  usePerpsAccount,
  usePerpsConnection,
  usePerpsOpenOrders,
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

  const perpsProvider = useSelector(selectPerpsProvider);

  const account = usePerpsAccount();

  const { isConnected } = usePerpsConnection();

  // Get currently open orders for this market
  const { orders: ordersData } = usePerpsOpenOrders({
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
  const { candleData, isLoadingHistory } = usePerpsPositionData({
    coin: market?.symbol || '',
    selectedDuration, // Time duration (1hr, 1D, 1W, etc.)
    selectedInterval: selectedCandlePeriod, // Candle period (1m, 3m, 5m, etc.)
  });

  // Check if user has an existing position for this market
  const {
    hasPosition: hasExistingPosition,
    isLoading: isLoadingPosition,
    existingPosition,
  } = useHasExistingPosition({
    asset: market?.symbol || '',
    loadOnMount: true,
  });

  const handleDurationChange = useCallback((newDuration: TimeDuration) => {
    setSelectedDuration(newDuration);
    // Auto-update candle period to the appropriate default for the new duration
    const defaultPeriod = getDefaultCandlePeriodForDuration(newDuration);
    setSelectedCandlePeriod(defaultPeriod);
  }, []);

  const handleCandlePeriodChange = useCallback((newPeriod: CandlePeriod) => {
    setSelectedCandlePeriod(newPeriod);
  }, []);

  const handleGearPress = useCallback(() => {
    setIsCandlePeriodBottomSheetVisible(true);
  }, []);

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
    navigation.navigate(Routes.PERPS.DEPOSIT);
  };

  // Determine if any action buttons will be visible
  const hasActionButtons = useMemo(
    () => !hasZeroBalance && !isLoadingPosition,
    [hasZeroBalance, isLoadingPosition],
  );

  const { styles } = useStyles(createStyles, { hasActionButtons });

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
      style={[styles.container, { marginTop: top }]}
      testID={PerpsMarketDetailsViewSelectorsIDs.CONTAINER}
    >
      {/* Market Header */}
      <PerpsMarketHeader
        market={market}
        currentPrice={marketStats.currentPrice}
        priceChange24h={marketStats.priceChange24h}
        onBackPress={handleBackPress}
        testID={PerpsMarketDetailsViewSelectorsIDs.HEADER}
      />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Chart */}
        <View style={[styles.section, styles.chartSection]}>
          <CandlestickChartComponent
            candleData={candleData}
            isLoading={isLoadingHistory}
            height={350}
            selectedDuration={selectedDuration}
            onDurationChange={handleDurationChange}
            onGearPress={handleGearPress}
          />
        </View>

        {/* Tabs Section */}
        <View style={styles.section}>
          <PerpsMarketTabs
            marketStats={marketStats}
            position={existingPosition}
            isLoadingPosition={isLoadingPosition}
            unfilledOrders={openOrders}
          />
        </View>

        <View>
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

      {hasZeroBalance && (
        <View style={[styles.actionsContainer, styles.addFundsContainer]}>
          <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
            {strings('perps.market.add_funds_to_start_trading_perps')}
          </Text>
          <Button
            variant={ButtonVariants.Primary}
            size={ButtonSize.Lg}
            width={ButtonWidthTypes.Full}
            label={strings('perps.market.add_funds')}
            onPress={handleAddFundsPress}
            style={styles.actionButton}
            testID={PerpsMarketDetailsViewSelectorsIDs.LONG_BUTTON}
            disabled={hasExistingPosition}
          />
        </View>
      )}
      {/* Action Buttons */}
      {hasActionButtons && (
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
