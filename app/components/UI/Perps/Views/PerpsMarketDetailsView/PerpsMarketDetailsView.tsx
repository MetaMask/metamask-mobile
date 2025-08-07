import {
  useNavigation,
  useRoute,
  type NavigationProp,
  type RouteProp,
} from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { SafeAreaView, ScrollView, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { strings } from '../../../../../../locales/i18n';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
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
import PerpsBottomSheetTooltip, {
  PerpsTooltipContentKey,
} from '../../components/PerpsBottomSheetTooltip';
interface MarketDetailsRouteParams {
  market: PerpsMarketData;
}

const PerpsMarketDetailsView: React.FC<PerpsMarketDetailsViewProps> = () => {
  const { styles } = useStyles(createStyles, {});
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

  const [selectedTooltip, setSelectedTooltip] =
    useState<PerpsTooltipContentKey | null>(null);
  // Get comprehensive market statistics
  const marketStats = usePerpsMarketStats(market?.symbol || '');

  // Get candlestick data
  const { candleData, isLoadingHistory } = usePerpsPositionData({
    coin: market?.symbol || '',
    selectedDuration, // Time duration (1hr, 1D, 1W, etc.)
    selectedInterval: selectedCandlePeriod, // Candle period (1m, 3m, 5m, etc.)
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

  const handleTooltipPress = useCallback(
    (contentKey: PerpsTooltipContentKey) => {
      setSelectedTooltip(contentKey);
    },
    [],
  );

  const handleTooltipClose = useCallback(() => {
    setSelectedTooltip(null);
  }, []);

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
      <ScrollView style={styles.container}>
        {/* Market Header */}
        <PerpsMarketHeader
          market={market}
          currentPrice={marketStats.currentPrice}
          priceChange24h={marketStats.priceChange24h}
          onBackPress={handleBackPress}
          testID={PerpsMarketDetailsViewSelectorsIDs.HEADER}
        />
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

        {/* Statistics Section */}
        <View style={styles.section}>
          <Text
            variant={TextVariant.HeadingMD}
            color={TextColor.Default}
            style={styles.statisticsTitle}
          >
            {strings('perps.market.statistics')}
          </Text>

          <View style={styles.statisticsGrid}>
            {/* Row 1: 24hr High/Low */}
            <View style={styles.statisticsRow}>
              <View
                style={styles.statisticsItem}
                testID={PerpsMarketDetailsViewSelectorsIDs.STATISTICS_HIGH_24H}
              >
                <Text
                  variant={TextVariant.BodySM}
                  color={TextColor.Alternative}
                >
                  {strings('perps.market.24hr_high')}
                </Text>
                <Text style={styles.statisticsValue} color={TextColor.Default}>
                  {marketStats.high24h}
                </Text>
              </View>
              <View
                style={styles.statisticsItem}
                testID={PerpsMarketDetailsViewSelectorsIDs.STATISTICS_LOW_24H}
              >
                <Text
                  variant={TextVariant.BodySM}
                  color={TextColor.Alternative}
                >
                  {strings('perps.market.24hr_low')}
                </Text>
                <Text style={styles.statisticsValue} color={TextColor.Default}>
                  {marketStats.low24h}
                </Text>
              </View>
            </View>

            {/* Row 2: Volume and Open Interest */}
            <View style={styles.statisticsRow}>
              <View
                style={styles.statisticsItem}
                testID={
                  PerpsMarketDetailsViewSelectorsIDs.STATISTICS_VOLUME_24H
                }
              >
                <Text
                  variant={TextVariant.BodySM}
                  color={TextColor.Alternative}
                >
                  {strings('perps.market.24h_volume')}
                </Text>
                <Text style={styles.statisticsValue} color={TextColor.Default}>
                  {marketStats.volume24h}
                </Text>
              </View>
              <View
                style={styles.statisticsItem}
                testID={
                  PerpsMarketDetailsViewSelectorsIDs.STATISTICS_OPEN_INTEREST
                }
              >
                <View style={styles.statisticsLabelContainer}>
                  <Text
                    variant={TextVariant.BodySM}
                    color={TextColor.Alternative}
                  >
                    {strings('perps.market.open_interest')}
                  </Text>
                  <TouchableOpacity
                    onPress={() => handleTooltipPress('open_interest')}
                  >
                    <Icon
                      name={IconName.Info}
                      size={IconSize.Sm}
                      color={IconColor.Muted}
                      testID={
                        PerpsMarketDetailsViewSelectorsIDs.OPEN_INTEREST_INFO_ICON
                      }
                    />
                  </TouchableOpacity>
                </View>
                <Text style={styles.statisticsValue} color={TextColor.Default}>
                  {marketStats.openInterest}
                </Text>
              </View>
            </View>

            {/* Row 3: Funding Rate and Countdown */}
            <View style={styles.statisticsRow}>
              <View
                style={styles.statisticsItem}
                testID={
                  PerpsMarketDetailsViewSelectorsIDs.STATISTICS_FUNDING_RATE
                }
              >
                <View style={styles.statisticsLabelContainer}>
                  <Text
                    variant={TextVariant.BodySM}
                    color={TextColor.Alternative}
                  >
                    {strings('perps.market.funding_rate')}
                  </Text>
                  <TouchableOpacity
                    onPress={() => handleTooltipPress('funding_rate')}
                  >
                    <Icon
                      name={IconName.Info}
                      size={IconSize.Sm}
                      color={IconColor.Muted}
                      testID={
                        PerpsMarketDetailsViewSelectorsIDs.FUNDING_RATE_INFO_ICON
                      }
                    />
                  </TouchableOpacity>
                </View>
                <Text
                  style={styles.statisticsValue}
                  color={
                    parseFloat(marketStats.fundingRate) >= 0
                      ? TextColor.Success
                      : TextColor.Error
                  }
                >
                  {marketStats.fundingRate}
                </Text>
              </View>
              <View
                style={styles.statisticsItem}
                testID={
                  PerpsMarketDetailsViewSelectorsIDs.STATISTICS_FUNDING_COUNTDOWN
                }
              >
                <Text
                  variant={TextVariant.BodySM}
                  color={TextColor.Alternative}
                >
                  {strings('perps.market.countdown')}
                </Text>
                <Text style={styles.statisticsValue} color={TextColor.Default}>
                  {marketStats.fundingCountdown}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Action Buttons */}
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
      {selectedTooltip && (
        <PerpsBottomSheetTooltip
          isVisible
          onClose={handleTooltipClose}
          contentKey={selectedTooltip}
          testID={PerpsMarketDetailsViewSelectorsIDs.BOTTOM_SHEET_TOOLTIP}
          key={selectedTooltip}
        />
      )}
    </SafeAreaView>
  );
};

export default PerpsMarketDetailsView;
