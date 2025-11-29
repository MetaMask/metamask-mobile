import React, {
  useCallback,
  useState,
  useRef,
  useMemo,
  useEffect,
} from 'react';
import { View, ScrollView, Pressable, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useStyles } from '../../../../../component-library/hooks';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import Button, {
  ButtonVariants,
  ButtonWidthTypes,
  ButtonSize,
} from '../../../../../component-library/components/Buttons/Button';
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../../../component-library/components/Buttons/ButtonIcon';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import { strings } from '../../../../../../locales/i18n';
import { usePerpsLiveOrderBook } from '../../hooks/stream/usePerpsLiveOrderBook';
import { usePerpsMeasurement } from '../../hooks/usePerpsMeasurement';
import { usePerpsNavigation, usePerpsMarkets } from '../../hooks';
import { usePerpsEventTracking } from '../../hooks/usePerpsEventTracking';
import { usePerpsOrderBookGrouping } from '../../hooks/usePerpsOrderBookGrouping';
import PerpsMarketHeader from '../../components/PerpsMarketHeader';
import { MetaMetricsEvents } from '../../../../hooks/useMetrics';
import {
  PerpsEventProperties,
  PerpsEventValues,
} from '../../constants/eventNames';
import { TraceName } from '../../../../../util/trace';
import PerpsOrderBookTable, {
  type UnitDisplay,
} from '../../components/PerpsOrderBookTable';
import PerpsOrderBookDepthChart from '../../components/PerpsOrderBookDepthChart';
import styleSheet from './PerpsOrderBookView.styles';
import type {
  PerpsOrderBookViewProps,
  OrderBookRouteParams,
} from './PerpsOrderBookView.types';
import { PerpsOrderBookViewSelectorsIDs } from '../../../../../../e2e/selectors/Perps/Perps.selectors';
import {
  calculateGroupingOptions,
  formatGroupingLabel,
  selectDefaultGrouping,
} from '../../utils/orderBookGrouping';

// Maximum API levels to request
// The Hyperliquid API returns at most ~20 levels per side when using nSigFigs
// We request more to ensure we get the maximum available
const MAX_API_LEVELS = 50;

/**
 * Calculate optimal nSigFigs based on grouping and price.
 * nSigFigs controls API price precision:
 * - nSigFigs: 5 → ~$1 increments for BTC (narrow range, fine detail)
 * - nSigFigs: 2 → ~$1000 increments for BTC (wide range, coarse)
 * - nSigFigs: 1 → ~$10000 increments for BTC (widest range)
 *
 * Goal: Request data granular enough for the grouping but with enough range
 * to show ~15+ rows after aggregation.
 */
const calculateOptimalNSigFigs = (grouping: number, price: number): number => {
  // Calculate what nSigFigs would give us this grouping size
  // increment ≈ price * 10^(magnitude - nSigFigs + 1)
  // So nSigFigs = magnitude - log10(grouping) + 1
  const magnitude = Math.floor(Math.log10(price));
  const groupingMagnitude = Math.floor(Math.log10(grouping));

  // We want API granularity at or slightly coarser than grouping
  // to ensure wide enough price range for many rows
  // nSigFigs = magnitude - groupingMagnitude + 1
  const optimalNSigFigs = magnitude - groupingMagnitude + 1;

  // Clamp between 2 (widest, ~$1000 for BTC) and 5 (finest, ~$1 for BTC)
  // API only supports nSigFigs values 2, 3, 4, 5
  return Math.max(2, Math.min(5, optimalNSigFigs));
};

const PerpsOrderBookView: React.FC<PerpsOrderBookViewProps> = ({
  testID = PerpsOrderBookViewSelectorsIDs.CONTAINER,
}) => {
  const navigation = useNavigation();
  const route =
    useRoute<RouteProp<{ params: OrderBookRouteParams }, 'params'>>();
  const { symbol } = route.params || {};
  const { styles } = useStyles(styleSheet, {});
  const { navigateToOrder } = usePerpsNavigation();
  const { track } = usePerpsEventTracking();

  // Get market data for the header
  const { markets } = usePerpsMarkets();
  const market = useMemo(
    () => markets.find((m) => m.symbol === symbol),
    [markets, symbol],
  );

  // Unit display state (base currency or USD)
  const [unitDisplay, setUnitDisplay] = useState<UnitDisplay>('usd');

  // Persisted order book grouping per asset
  const { savedGrouping, saveGrouping } = usePerpsOrderBookGrouping(
    symbol || '',
  );

  // Price grouping state (actual price value, e.g., 10 for $10 grouping)
  // Initialize from saved grouping if available
  const [selectedGrouping, setSelectedGrouping] = useState<number | null>(
    savedGrouping ?? null,
  );
  const [isDepthBandSheetVisible, setIsDepthBandSheetVisible] = useState(false);
  const depthBandSheetRef = useRef<BottomSheetRef>(null);

  // Sync selectedGrouping when savedGrouping loads (on mount)
  useEffect(() => {
    if (savedGrouping !== undefined && selectedGrouping === null) {
      setSelectedGrouping(savedGrouping);
    }
  }, [savedGrouping, selectedGrouping]);

  // Get market price for grouping calculations (available immediately from markets data)
  // market.price is formatted like '$90,000.00' so we need to parse it
  const marketPrice = useMemo(() => {
    if (!market?.price) return null;
    // Remove $ and commas, then parse
    const cleaned = market.price.replace(/[$,]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? null : parsed;
  }, [market]);

  // Calculate dynamic grouping options based on market price
  const groupingOptions = useMemo(() => {
    if (!marketPrice) return [];
    return calculateGroupingOptions(marketPrice);
  }, [marketPrice]);

  // Current grouping value (use selected or auto-select default)
  const currentGrouping = useMemo(() => {
    if (
      selectedGrouping !== null &&
      groupingOptions.includes(selectedGrouping)
    ) {
      return selectedGrouping;
    }
    if (groupingOptions.length > 0) {
      return selectDefaultGrouping(groupingOptions);
    }
    return null;
  }, [selectedGrouping, groupingOptions]);

  // Calculate optimal nSigFigs based on grouping to get consistent row count
  const optimalNSigFigs = useMemo(() => {
    if (!marketPrice || !currentGrouping) return 5;
    return calculateOptimalNSigFigs(currentGrouping, marketPrice);
  }, [currentGrouping, marketPrice]);

  // Subscribe to live order book data with dynamic nSigFigs
  // nSigFigs adjusts based on grouping to ensure we get enough price range
  const {
    orderBook: rawOrderBook,
    isLoading,
    error,
  } = usePerpsLiveOrderBook({
    symbol: symbol || '',
    levels: MAX_API_LEVELS,
    nSigFigs: optimalNSigFigs,
    throttleMs: 100,
  });

  // Process order book data
  // The API's nSigFigs parameter handles aggregation at the server level,
  // so we don't need client-side aggregation. Just pass through the raw data.
  const orderBook = useMemo(() => {
    if (!rawOrderBook) {
      return rawOrderBook;
    }

    // No client-side aggregation needed - API handles it via nSigFigs
    // Just return the raw order book data directly
    return rawOrderBook;
  }, [rawOrderBook]);

  // Performance measurement
  usePerpsMeasurement({
    traceName: TraceName.PerpsOrderBookView,
    conditions: [!!symbol, !!orderBook],
  });

  // Track screen view
  usePerpsEventTracking({
    eventName: MetaMetricsEvents.PERPS_SCREEN_VIEWED,
    conditions: [!!symbol, !!orderBook],
    properties: {
      [PerpsEventProperties.SCREEN_TYPE]:
        PerpsEventValues.SCREEN_TYPE.ORDER_BOOK,
      [PerpsEventProperties.ASSET]: symbol || '',
    },
  });

  // Handle back button press
  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // Get current grouping label for display
  const currentGroupingLabel = useMemo(() => {
    if (currentGrouping === null) return '—';
    return formatGroupingLabel(currentGrouping);
  }, [currentGrouping]);

  // Handle grouping dropdown press
  const handleDepthBandPress = useCallback(() => {
    setIsDepthBandSheetVisible(true);
  }, []);

  // Handle grouping selection
  const handleGroupingSelect = useCallback(
    (value: number) => {
      setSelectedGrouping(value);
      saveGrouping(value); // Persist to controller
      setIsDepthBandSheetVisible(false);

      track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
        [PerpsEventProperties.INTERACTION_TYPE]:
          PerpsEventValues.INTERACTION_TYPE.TAP,
        [PerpsEventProperties.ASSET]: symbol || '',
      });
    },
    [symbol, track, saveGrouping],
  );

  // Handle grouping sheet close
  const handleDepthBandSheetClose = useCallback(() => {
    setIsDepthBandSheetVisible(false);
  }, []);

  // Handle unit toggle
  const handleUnitChange = useCallback(
    (unit: UnitDisplay) => {
      setUnitDisplay(unit);

      track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
        [PerpsEventProperties.INTERACTION_TYPE]:
          PerpsEventValues.INTERACTION_TYPE.TAP,
        [PerpsEventProperties.ASSET]: symbol || '',
      });
    },
    [symbol, track],
  );

  // Handle Long button press
  const handleLongPress = useCallback(() => {
    track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
      [PerpsEventProperties.INTERACTION_TYPE]:
        PerpsEventValues.INTERACTION_TYPE.TAP,
      [PerpsEventProperties.ASSET]: symbol || '',
      [PerpsEventProperties.DIRECTION]: PerpsEventValues.DIRECTION.LONG,
      [PerpsEventProperties.SOURCE]: PerpsEventValues.SOURCE.PERP_ASSET_SCREEN,
    });

    navigateToOrder({
      direction: 'long',
      asset: symbol || '',
    });
  }, [symbol, navigateToOrder, track]);

  // Handle Short button press
  const handleShortPress = useCallback(() => {
    track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
      [PerpsEventProperties.INTERACTION_TYPE]:
        PerpsEventValues.INTERACTION_TYPE.TAP,
      [PerpsEventProperties.ASSET]: symbol || '',
      [PerpsEventProperties.DIRECTION]: PerpsEventValues.DIRECTION.SHORT,
      [PerpsEventProperties.SOURCE]: PerpsEventValues.SOURCE.PERP_ASSET_SCREEN,
    });

    navigateToOrder({
      direction: 'short',
      asset: symbol || '',
    });
  }, [symbol, navigateToOrder, track]);

  // Error state
  if (error) {
    return (
      <SafeAreaView style={styles.container} testID={testID}>
        {market ? (
          <PerpsMarketHeader market={market} onBackPress={handleBack} />
        ) : (
          <View style={styles.header}>
            <ButtonIcon
              iconName={IconName.ArrowLeft}
              iconColor={IconColor.Default}
              size={ButtonIconSizes.Lg}
              onPress={handleBack}
              testID={PerpsOrderBookViewSelectorsIDs.BACK_BUTTON}
            />
            <View style={styles.headerTitleContainer}>
              <Text variant={TextVariant.HeadingMD} color={TextColor.Default}>
                {strings('perps.order_book.title')}
              </Text>
            </View>
          </View>
        )}
        <View style={styles.errorContainer}>
          <Text variant={TextVariant.BodyMD} color={TextColor.Error}>
            {strings('perps.order_book.error')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} testID={testID}>
      {/* Market Header */}
      {market && <PerpsMarketHeader market={market} onBackPress={handleBack} />}

      {/* Controls Row - Unit Toggle and Grouping */}
      <View style={styles.controlsRow}>
        {/* Unit Toggle (BTC/USD) */}
        <View style={styles.headerUnitToggle}>
          <TouchableOpacity
            style={[
              styles.headerUnitButton,
              unitDisplay === 'base' && styles.headerUnitButtonActive,
            ]}
            onPress={() => handleUnitChange('base')}
            testID={PerpsOrderBookViewSelectorsIDs.UNIT_TOGGLE_BASE}
          >
            <Text
              variant={TextVariant.BodySM}
              color={
                unitDisplay === 'base' ? TextColor.Inverse : TextColor.Default
              }
            >
              {symbol}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.headerUnitButton,
              unitDisplay === 'usd' && styles.headerUnitButtonActive,
            ]}
            onPress={() => handleUnitChange('usd')}
            testID={PerpsOrderBookViewSelectorsIDs.UNIT_TOGGLE_USD}
          >
            <Text
              variant={TextVariant.BodySM}
              color={
                unitDisplay === 'usd' ? TextColor.Inverse : TextColor.Default
              }
            >
              USD
            </Text>
          </TouchableOpacity>
        </View>

        {/* Price Grouping Dropdown */}
        <Pressable
          style={({ pressed }) => [
            styles.depthBandButton,
            pressed && styles.depthBandButtonPressed,
          ]}
          onPress={handleDepthBandPress}
          testID={PerpsOrderBookViewSelectorsIDs.DEPTH_BAND_BUTTON}
        >
          <Text variant={TextVariant.BodySM} color={TextColor.Default}>
            {currentGroupingLabel}
          </Text>
          <Icon
            name={IconName.ArrowDown}
            size={IconSize.Xs}
            color={IconColor.Alternative}
          />
        </Pressable>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        testID={PerpsOrderBookViewSelectorsIDs.SCROLL_VIEW}
      >
        {/* Depth Chart */}
        <View style={[styles.section, styles.depthChartSection]}>
          <PerpsOrderBookDepthChart
            orderBook={orderBook}
            height={100}
            testID={PerpsOrderBookViewSelectorsIDs.DEPTH_CHART}
          />
        </View>

        {/* Order Book Table */}
        <View style={[styles.section, styles.tableSection]}>
          <PerpsOrderBookTable
            orderBook={orderBook}
            symbol={symbol || ''}
            unit={unitDisplay}
            isLoading={isLoading}
            testID={PerpsOrderBookViewSelectorsIDs.TABLE}
          />
        </View>
      </ScrollView>

      {/* Footer with Spread and Actions */}
      <View style={styles.footer}>
        {/* Spread Row */}
        {orderBook && (
          <View style={styles.spreadContainer}>
            <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
              {strings('perps.order_book.spread')}:
            </Text>
            <Text variant={TextVariant.BodySM} color={TextColor.Default}>
              ${parseFloat(orderBook.spread).toLocaleString()}
            </Text>
            <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
              ({orderBook.spreadPercentage}%)
            </Text>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <View style={styles.actionButtonWrapper}>
            <Button
              variant={ButtonVariants.Secondary}
              size={ButtonSize.Lg}
              width={ButtonWidthTypes.Full}
              label={strings('perps.market.long')}
              onPress={handleLongPress}
              testID={PerpsOrderBookViewSelectorsIDs.LONG_BUTTON}
            />
          </View>

          <View style={styles.actionButtonWrapper}>
            <Button
              variant={ButtonVariants.Secondary}
              size={ButtonSize.Lg}
              width={ButtonWidthTypes.Full}
              label={strings('perps.market.short')}
              onPress={handleShortPress}
              testID={PerpsOrderBookViewSelectorsIDs.SHORT_BUTTON}
            />
          </View>
        </View>
      </View>

      {/* Price Grouping Selection Bottom Sheet */}
      {isDepthBandSheetVisible && (
        <BottomSheet
          ref={depthBandSheetRef}
          shouldNavigateBack={false}
          onClose={handleDepthBandSheetClose}
        >
          <BottomSheetHeader onClose={handleDepthBandSheetClose}>
            <Text variant={TextVariant.HeadingMD}>
              {strings('perps.order_book.depth_band.title')}
            </Text>
          </BottomSheetHeader>
          <View style={styles.depthBandSheetContent}>
            {groupingOptions.map((value) => (
              <TouchableOpacity
                key={value}
                style={[
                  styles.depthBandOption,
                  currentGrouping === value && styles.depthBandOptionSelected,
                ]}
                onPress={() => handleGroupingSelect(value)}
                testID={`${PerpsOrderBookViewSelectorsIDs.DEPTH_BAND_OPTION}-${value}`}
              >
                <Text
                  variant={TextVariant.BodyLGMedium}
                  color={
                    currentGrouping === value
                      ? TextColor.Primary
                      : TextColor.Default
                  }
                >
                  {formatGroupingLabel(value)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </BottomSheet>
      )}
    </SafeAreaView>
  );
};

export default PerpsOrderBookView;
