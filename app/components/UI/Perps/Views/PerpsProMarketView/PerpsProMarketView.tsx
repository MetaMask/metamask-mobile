import {
  Box,
  SectionDivider,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import {
  CandlePeriod,
  PERPS_CONSTANTS,
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
import { useDispatch, useSelector } from 'react-redux';
import { SafeAreaView } from 'react-native-safe-area-context';
import { strings } from '../../../../../../locales/i18n';
import { setPerpsChartPreferredCandlePeriod } from '../../../../../actions/settings';
import { useStyles } from '../../../../../component-library/hooks';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import Logger from '../../../../../util/Logger';
import { PerpsProMarketViewSelectorsIDs } from '../../Perps.testIds';
import PerpsCandlePeriodBottomSheet from '../../components/PerpsCandlePeriodBottomSheet';
import PerpsOrderTypeBottomSheetView from '../../components/PerpsOrderTypeBottomSheet/PerpsOrderTypeBottomSheetView';
import { usePerpsEventTracking } from '../../hooks/usePerpsEventTracking';
import { selectPerpsChartPreferredCandlePeriod } from '../../selectors/chartPreferences';
import { selectPerpsAdvancedChartEnabledFlag } from '../../selectors/featureFlags';
import type { PerpsStackParamList } from '../../types/navigation';
import PerpsProChartPanel from './components/PerpsProChartPanel';
import PerpsProMarketHeader from './components/PerpsProMarketHeader';
import PerpsProMarketLayout from './components/PerpsProMarketLayout';
import PerpsProOrderBookPanel from './components/PerpsProOrderBookPanel';
import PerpsProOrderFormPanel from './components/PerpsProOrderFormPanel';
import PerpsProPositionsPanel from './components/PerpsProPositionsPanel';
import PerpsProStatsBar from './components/PerpsProStatsBar';
import { createStyles } from './PerpsProMarketView.styles';

const getChartLibrary = (isAdvancedChartEnabled: boolean) =>
  isAdvancedChartEnabled
    ? PERPS_EVENT_VALUE.CHART_LIBRARY.ADVANCED
    : PERPS_EVENT_VALUE.CHART_LIBRARY.LIGHTWEIGHT;

const getChartAnalyticsProperties = (chartLibrary: string) => ({
  [PERPS_EVENT_PROPERTY.CHART_LIBRARY]: chartLibrary,
  [PERPS_EVENT_PROPERTY.ASSET_TYPE]: PERPS_EVENT_VALUE.ASSET_TYPE.PERP,
});

/**
 * Pro-mode replacement for `PerpsMarketDetailsView`.
 *
 * Scaffold only: lays out the full Pro trading screen (header, chart, stats
 * bar, two-column order form / order book, and positions/orders section) as
 * placeholder containers matching Figma node 10041:12979. Each panel can be
 * populated by its owning capability without changing the top-level layout.
 */
const PerpsProMarketView = () => {
  const { styles } = useStyles(createStyles, {});
  const dispatch = useDispatch();
  const { track } = usePerpsEventTracking();
  const route =
    useRoute<RouteProp<PerpsStackParamList, 'PerpsMarketDetails'>>();
  const market = route.params?.market;
  const selectedCandlePeriod = useSelector(
    selectPerpsChartPreferredCandlePeriod,
  );
  const isAdvancedChartEnabled = useSelector(
    selectPerpsAdvancedChartEnabledFlag,
  );
  const configuredChartLibrary = getChartLibrary(isAdvancedChartEnabled);
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
    () => getChartAnalyticsProperties(effectiveChartLibrary),
    [effectiveChartLibrary],
  );

  const handleCandlePeriodChange = useCallback(
    (newPeriod: CandlePeriod) => {
      dispatch(setPerpsChartPreferredCandlePeriod(newPeriod));
      track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
        [PERPS_EVENT_PROPERTY.ASSET]: market?.symbol || '',
        ...chartAnalyticsProperties,
        [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
          PERPS_EVENT_VALUE.INTERACTION_TYPE.CANDLE_PERIOD_CHANGED,
        [PERPS_EVENT_PROPERTY.CANDLE_PERIOD]: newPeriod,
      });
    },
    [chartAnalyticsProperties, dispatch, market?.symbol, track],
  );

  const handleChartError = useCallback(
    (error?: Error | string) => {
      const errorMessage =
        typeof error === 'string'
          ? error
          : (error?.message ?? 'Chart rendering error in Pro market view');

      Logger.error(new Error(errorMessage), {
        tags: { feature: PERPS_CONSTANTS.FeatureName },
      });
      track(MetaMetricsEvents.PERPS_ERROR, {
        [PERPS_EVENT_PROPERTY.ERROR_TYPE]: PERPS_EVENT_VALUE.ERROR_TYPE.WARNING,
        [PERPS_EVENT_PROPERTY.ERROR_MESSAGE]: errorMessage,
        [PERPS_EVENT_PROPERTY.SCREEN_NAME]:
          PERPS_EVENT_VALUE.SCREEN_NAME.PERPS_MARKET_DETAILS,
        [PERPS_EVENT_PROPERTY.SCREEN_TYPE]:
          PERPS_EVENT_VALUE.SCREEN_TYPE.ASSET_DETAILS,
        [PERPS_EVENT_PROPERTY.ASSET]: market?.symbol || '',
        ...chartAnalyticsProperties,
      });

      if (isAdvancedChartEnabled) {
        setEffectiveChartLibrary(PERPS_EVENT_VALUE.CHART_LIBRARY.LIGHTWEIGHT);
      }
    },
    [chartAnalyticsProperties, isAdvancedChartEnabled, market?.symbol, track],
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

  return (
    <SafeAreaView
      style={styles.container}
      edges={['top', 'bottom', 'left', 'right']}
      testID={PerpsProMarketViewSelectorsIDs.CONTAINER}
    >
      <PerpsProMarketHeader symbol={symbol} />
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
          orderForm={
            <PerpsProOrderFormPanel
              orderType={orderType}
              onOrderTypeButtonPress={handleOrderTypeButtonPress}
            />
          }
          orderBook={<PerpsProOrderBookPanel />}
        />
        <SectionDivider />
        <PerpsProPositionsPanel />
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
