import { ButtonSize as ButtonSizeRNDesignSystem } from '@metamask/design-system-react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, TouchableOpacity, View } from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { PerpsOrderBookViewSelectorsIDs } from '../../../../../../e2e/selectors/Perps/Perps.selectors';
import { strings } from '../../../../../../locales/i18n';
import ButtonSemantic, {
  ButtonSemanticSeverity,
} from '../../../../../component-library/components-temp/Buttons/ButtonSemantic';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../../../component-library/components/Buttons/ButtonIcon';
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
import { TraceName } from '../../../../../util/trace';
import { MetaMetricsEvents } from '../../../../hooks/useMetrics';
import PerpsOrderBookDepthChart from '../../components/PerpsOrderBookDepthChart';
import PerpsOrderBookTable, {
  type UnitDisplay,
} from '../../components/PerpsOrderBookTable';
import {
  PerpsEventProperties,
  PerpsEventValues,
} from '../../constants/eventNames';
import { usePerpsNavigation } from '../../hooks';
import { usePerpsLiveOrderBook } from '../../hooks/stream/usePerpsLiveOrderBook';
import { usePerpsEventTracking } from '../../hooks/usePerpsEventTracking';
import { usePerpsMeasurement } from '../../hooks/usePerpsMeasurement';
import { selectPerpsButtonColorTestVariant } from '../../selectors/featureFlags';
import { BUTTON_COLOR_TEST } from '../../utils/abTesting/tests';
import { usePerpsABTest } from '../../utils/abTesting/usePerpsABTest';
import {
  calculateGroupingOptions,
  formatGroupingLabel,
  aggregateOrderBookLevels,
  selectDefaultGrouping,
} from '../../utils/orderBookGrouping';
import styleSheet from './PerpsOrderBookView.styles';
import type {
  OrderBookRouteParams,
  PerpsOrderBookViewProps,
} from './PerpsOrderBookView.types';

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
  const insets = useSafeAreaInsets();

  // A/B Testing: Button color test (TAT-1937)
  const {
    variantName: buttonColorVariant,
    isEnabled: isButtonColorTestEnabled,
  } = usePerpsABTest({
    test: BUTTON_COLOR_TEST,
    featureFlagSelector: selectPerpsButtonColorTestVariant,
  });

  // Unit display state (base currency or USD)
  const [unitDisplay, setUnitDisplay] = useState<UnitDisplay>('usd');

  // Price grouping state (actual price value, e.g., 10 for $10 grouping)
  const [selectedGrouping, setSelectedGrouping] = useState<number | null>(null);
  const [isDepthBandSheetVisible, setIsDepthBandSheetVisible] = useState(false);
  const depthBandSheetRef = useRef<BottomSheetRef>(null);

  // Subscribe to live order book data with finest granularity (nSigFigs: 5)
  // We'll aggregate client-side based on selected grouping
  const {
    orderBook: rawOrderBook,
    isLoading,
    error,
  } = usePerpsLiveOrderBook({
    symbol: symbol || '',
    levels: 50, // Request more levels for aggregation
    nSigFigs: 5, // Always use finest granularity
    throttleMs: 100,
  });

  // Calculate mid price from order book
  const midPrice = useMemo(() => {
    if (!rawOrderBook?.bids?.length || !rawOrderBook?.asks?.length) {
      return null;
    }
    const bestBid = parseFloat(rawOrderBook.bids[0].price);
    const bestAsk = parseFloat(rawOrderBook.asks[0].price);
    return (bestBid + bestAsk) / 2;
  }, [rawOrderBook]);

  // Calculate dynamic grouping options based on mid price
  const groupingOptions = useMemo(() => {
    if (!midPrice) return [];
    return calculateGroupingOptions(midPrice);
  }, [midPrice]);

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

  // Maximum levels to display per side
  const MAX_DISPLAY_LEVELS = 15;

  // Aggregate order book based on current grouping
  const orderBook = useMemo(() => {
    if (!rawOrderBook || !currentGrouping) {
      return rawOrderBook;
    }

    const aggregatedBids = aggregateOrderBookLevels(
      rawOrderBook.bids,
      currentGrouping,
      'bid',
    ).slice(0, MAX_DISPLAY_LEVELS);

    const aggregatedAsks = aggregateOrderBookLevels(
      rawOrderBook.asks,
      currentGrouping,
      'ask',
    ).slice(0, MAX_DISPLAY_LEVELS);

    // Calculate new max total for depth bars
    const maxBidTotal =
      aggregatedBids.length > 0
        ? parseFloat(aggregatedBids[aggregatedBids.length - 1].total)
        : 0;
    const maxAskTotal =
      aggregatedAsks.length > 0
        ? parseFloat(aggregatedAsks[aggregatedAsks.length - 1].total)
        : 0;
    const maxTotal = Math.max(maxBidTotal, maxAskTotal).toString();

    return {
      ...rawOrderBook,
      bids: aggregatedBids,
      asks: aggregatedAsks,
      maxTotal,
    };
  }, [rawOrderBook, currentGrouping]);

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

  // Dynamic footer style with safe area insets
  const footerStyle = useMemo(
    () => [styles.footer, { paddingBottom: 16 + insets.bottom }],
    [styles.footer, insets.bottom],
  );

  // Handle grouping dropdown press
  const handleDepthBandPress = useCallback(() => {
    setIsDepthBandSheetVisible(true);
  }, []);

  // Handle grouping selection
  const handleGroupingSelect = useCallback(
    (value: number) => {
      setSelectedGrouping(value);
      setIsDepthBandSheetVisible(false);

      track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
        [PerpsEventProperties.INTERACTION_TYPE]:
          PerpsEventValues.INTERACTION_TYPE.TAP,
        [PerpsEventProperties.ASSET]: symbol || '',
      });
    },
    [symbol, track],
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
      ...(isButtonColorTestEnabled && {
        [PerpsEventProperties.AB_TEST_BUTTON_COLOR]: buttonColorVariant,
      }),
    });

    navigateToOrder({
      direction: 'long',
      asset: symbol || '',
    });
  }, [
    symbol,
    navigateToOrder,
    track,
    isButtonColorTestEnabled,
    buttonColorVariant,
  ]);

  // Handle Short button press
  const handleShortPress = useCallback(() => {
    track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
      [PerpsEventProperties.INTERACTION_TYPE]:
        PerpsEventValues.INTERACTION_TYPE.TAP,
      [PerpsEventProperties.ASSET]: symbol || '',
      [PerpsEventProperties.DIRECTION]: PerpsEventValues.DIRECTION.SHORT,
      [PerpsEventProperties.SOURCE]: PerpsEventValues.SOURCE.PERP_ASSET_SCREEN,
      ...(isButtonColorTestEnabled && {
        [PerpsEventProperties.AB_TEST_BUTTON_COLOR]: buttonColorVariant,
      }),
    });

    navigateToOrder({
      direction: 'short',
      asset: symbol || '',
    });
  }, [
    symbol,
    navigateToOrder,
    track,
    isButtonColorTestEnabled,
    buttonColorVariant,
  ]);

  // Error state
  if (error) {
    return (
      <SafeAreaView style={styles.container} testID={testID}>
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
      {/* Header */}
      <View style={styles.header}>
        <ButtonIcon
          iconName={IconName.ArrowLeft}
          iconColor={IconColor.Default}
          size={ButtonIconSizes.Lg}
          onPress={handleBack}
          style={styles.headerBackButton}
          testID={PerpsOrderBookViewSelectorsIDs.BACK_BUTTON}
        />
        <View style={styles.headerTitleContainer}>
          <Text variant={TextVariant.HeadingMD} color={TextColor.Default}>
            {strings('perps.order_book.title')}
          </Text>
        </View>
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
      <View style={footerStyle}>
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
            {buttonColorVariant === 'monochrome' ? (
              <Button
                variant={ButtonVariants.Primary}
                size={ButtonSize.Lg}
                width={ButtonWidthTypes.Full}
                label={strings('perps.market.long')}
                onPress={handleLongPress}
                testID={PerpsOrderBookViewSelectorsIDs.LONG_BUTTON}
              />
            ) : (
              <ButtonSemantic
                severity={ButtonSemanticSeverity.Success}
                onPress={handleLongPress}
                isFullWidth
                size={ButtonSizeRNDesignSystem.Lg}
                testID={PerpsOrderBookViewSelectorsIDs.LONG_BUTTON}
              >
                {strings('perps.market.long')}
              </ButtonSemantic>
            )}
          </View>

          <View style={styles.actionButtonWrapper}>
            {buttonColorVariant === 'monochrome' ? (
              <Button
                variant={ButtonVariants.Primary}
                size={ButtonSize.Lg}
                width={ButtonWidthTypes.Full}
                label={strings('perps.market.short')}
                onPress={handleShortPress}
                testID={PerpsOrderBookViewSelectorsIDs.SHORT_BUTTON}
              />
            ) : (
              <ButtonSemantic
                severity={ButtonSemanticSeverity.Danger}
                onPress={handleShortPress}
                isFullWidth
                size={ButtonSizeRNDesignSystem.Lg}
                testID={PerpsOrderBookViewSelectorsIDs.SHORT_BUTTON}
              >
                {strings('perps.market.short')}
              </ButtonSemantic>
            )}
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
