import { ButtonSize as ButtonSizeRNDesignSystem } from '@metamask/design-system-react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import TouchableOpacity from '../../../../Base/TouchableOpacity';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { PerpsOrderBookViewSelectorsIDs } from '../../Perps.testIds';
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
import PerpsBottomSheetTooltip from '../../components/PerpsBottomSheetTooltip/PerpsBottomSheetTooltip';
import type { PerpsTooltipContentKey } from '../../components/PerpsBottomSheetTooltip/PerpsBottomSheetTooltip.types';
import PerpsMarketHeader from '../../components/PerpsMarketHeader';
import PerpsOrderBookDepthChart from '../../components/PerpsOrderBookDepthChart';
import PerpsOrderBookTable, {
  type UnitDisplay,
} from '../../components/PerpsOrderBookTable';
import {
  PerpsEventProperties,
  PerpsEventValues,
} from '../../constants/eventNames';
import { usePerpsMarkets, usePerpsNavigation } from '../../hooks';
import { usePerpsLiveOrderBook } from '../../hooks/stream/usePerpsLiveOrderBook';
import { usePerpsEventTracking } from '../../hooks/usePerpsEventTracking';
import { usePerpsMeasurement } from '../../hooks/usePerpsMeasurement';
import { usePerpsOrderBookGrouping } from '../../hooks/usePerpsOrderBookGrouping';
import { selectPerpsButtonColorTestVariant } from '../../selectors/featureFlags';
import { BUTTON_COLOR_TEST } from '../../utils/abTesting/tests';
import { usePerpsABTest } from '../../utils/abTesting/usePerpsABTest';
import { getPerpsDisplaySymbol } from '../../utils/marketUtils';
import {
  calculateAggregationParams,
  calculateGroupingOptions,
  formatGroupingLabel,
  MAX_ORDER_BOOK_LEVELS,
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
  const displaySymbol = getPerpsDisplaySymbol(symbol || '');
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

  // Tooltip state
  const [selectedTooltip, setSelectedTooltip] =
    useState<PerpsTooltipContentKey | null>(null);

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

  // Calculate aggregation params (nSigFigs + mantissa) based on grouping
  const aggregationParams = useMemo(() => {
    if (!marketPrice || !currentGrouping) return { nSigFigs: 5 as const };
    return calculateAggregationParams(currentGrouping, marketPrice);
  }, [currentGrouping, marketPrice]);

  // Subscribe to live order book data with dynamic nSigFigs and mantissa
  // These parameters match Hyperliquid's API for consistent price aggregation
  const {
    orderBook: rawOrderBook,
    isLoading,
    error,
  } = usePerpsLiveOrderBook({
    symbol: symbol || '',
    levels: MAX_ORDER_BOOK_LEVELS,
    nSigFigs: aggregationParams.nSigFigs,
    mantissa: aggregationParams.mantissa,
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

  // Handle tooltip press
  const handleTooltipPress = useCallback(
    (contentKey: PerpsTooltipContentKey) => {
      setSelectedTooltip(contentKey);
    },
    [],
  );

  // Handle tooltip close
  const handleTooltipClose = useCallback(() => {
    setSelectedTooltip(null);
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
        {market ? (
          <PerpsMarketHeader
            market={market}
            onBackPress={handleBack}
            currentPrice={marketPrice ?? 0}
          />
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
      {market && (
        <PerpsMarketHeader
          market={market}
          onBackPress={handleBack}
          currentPrice={marketPrice ?? 0}
        />
      )}

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
              {displaySymbol}
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
            <TouchableOpacity
              onPress={() => handleTooltipPress('spread')}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              testID={PerpsOrderBookViewSelectorsIDs.SPREAD_INFO_BUTTON}
            >
              <Icon
                name={IconName.Info}
                size={IconSize.Sm}
                color={IconColor.Muted}
              />
            </TouchableOpacity>
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

      {/* Tooltip Bottom Sheet */}
      {selectedTooltip && (
        <View>
          <Modal visible transparent animationType="none" statusBarTranslucent>
            <PerpsBottomSheetTooltip
              isVisible
              onClose={handleTooltipClose}
              contentKey={selectedTooltip}
              testID={PerpsOrderBookViewSelectorsIDs.BOTTOM_SHEET_TOOLTIP}
            />
          </Modal>
        </View>
      )}
    </SafeAreaView>
  );
};

export default PerpsOrderBookView;
