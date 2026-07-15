import {
  BottomSheet,
  BottomSheetHeader,
  BottomSheetRef,
  Button,
  ButtonVariant,
  ButtonSize,
  ButtonBaseSize,
  ButtonIcon,
  ButtonIconSize,
  FilterButton,
  HeaderSubpage,
  IconColor,
  IconName,
  ListItemSelect,
  SegmentedControl,
  SelectButton,
  SelectButtonVariant,
  SelectButtonSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Modal, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import {
  PerpsMarketHeaderSelectorsIDs,
  PerpsOrderBookViewSelectorsIDs,
} from '../../Perps.testIds';
import { strings } from '../../../../../../locales/i18n';
import ButtonSemantic, {
  ButtonSemanticSeverity,
} from '../../../../../component-library/components-temp/Buttons/ButtonSemantic';
import { useStyles } from '../../../../../component-library/hooks';
import { TraceName } from '../../../../../util/trace';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import PerpsBottomSheetTooltip from '../../components/PerpsBottomSheetTooltip/PerpsBottomSheetTooltip';
import type { PerpsTooltipContentKey } from '../../components/PerpsBottomSheetTooltip/PerpsBottomSheetTooltip.types';
import LivePriceHeader from '../../components/LivePriceDisplay/LivePriceHeader';
import PerpsMarketHeader from '../../components/PerpsMarketHeader';
import PerpsTokenLogo from '../../components/PerpsTokenLogo';
import PerpsOrderBookDepthChart from '../../components/PerpsOrderBookDepthChart';
import PerpsOrderBookTable, {
  type UnitDisplay,
} from '../../components/PerpsOrderBookTable';
import {
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
  getPerpsDisplaySymbol,
} from '@metamask/perps-controller';
import {
  usePerpsMarkets,
  usePerpsNavigation,
  usePositionManagement,
} from '../../hooks';
import { useHasExistingPosition } from '../../hooks/useHasExistingPosition';
import { usePerpsLiveOrderBook } from '../../hooks/stream/usePerpsLiveOrderBook';
import { usePerpsLiveFocusedPrice } from '../../hooks/stream/usePerpsLiveFocusedPrice';
import { usePerpsLivePrices } from '../../hooks/stream/usePerpsLivePrices';
import { usePerpsTopOfBook } from '../../hooks/stream/usePerpsTopOfBook';
import { usePerpsEventTracking } from '../../hooks/usePerpsEventTracking';
import { usePerpsMeasurement } from '../../hooks/usePerpsMeasurement';
import { usePerpsOrderBookGrouping } from '../../hooks/usePerpsOrderBookGrouping';
import { selectPerpsEligibility } from '../../selectors/perpsController';
import { useComplianceGate } from '../../../Compliance';
import { selectSelectedInternalAccountAddress } from '../../../../../selectors/accountsController';
import { useABTest } from '../../../../../hooks/useABTest';
import {
  BUTTON_COLOR_VARIANTS,
  PERPS_BUTTON_COLOR_AB_TEST_KEY,
} from '../../abTestConfig';
import {
  formatPerpsFiat,
  PRICE_RANGES_UNIVERSAL,
} from '../../utils/formatUtils';
import {
  calculateAggregationParams,
  calculateGroupingOptions,
  FAST_ORDER_BOOK_LEVELS,
  formatGroupingLabel,
  selectDefaultGrouping,
} from '../../utils/orderBookGrouping';
import PerpsSelectModifyActionView from '../PerpsSelectModifyActionView';
import styleSheet from './PerpsOrderBookView.styles';
import type {
  OrderBookRouteParams,
  PerpsOrderBookViewProps,
} from './PerpsOrderBookView.types';

const PerpsOrderBookView: React.FC<PerpsOrderBookViewProps> = ({
  testID = PerpsOrderBookViewSelectorsIDs.CONTAINER,
}) => {
  const navigation = useNavigation<AppNavigationProp>();
  const route =
    useRoute<RouteProp<{ params: OrderBookRouteParams }, 'params'>>();
  const { symbol, marketData: routeMarketData } = route.params || {};
  const displaySymbol = getPerpsDisplaySymbol(symbol || '');
  const { styles } = useStyles(styleSheet, {});
  const { navigateToOrder, navigateToClosePosition } = usePerpsNavigation();
  const { track } = usePerpsEventTracking();
  const insets = useSafeAreaInsets();

  // A/B Testing: Button color test (TAT-1937)
  const { variantName: buttonColorVariant } = useABTest(
    PERPS_BUTTON_COLOR_AB_TEST_KEY,
    BUTTON_COLOR_VARIANTS,
    {
      experimentName: 'Long/Short Button Color Test',
      variationNames: { control: 'White/White', colors: 'Green/Red' },
    },
  );

  // Geo-restriction eligibility check
  const isEligible = useSelector(selectPerpsEligibility);
  const [isEligibilityModalVisible, setIsEligibilityModalVisible] =
    useState(false);

  // Compliance gate
  const selectedAddress = useSelector(selectSelectedInternalAccountAddress);
  const { gate } = useComplianceGate(selectedAddress ?? '');

  // Get market data for the header
  const { markets } = usePerpsMarkets();
  const market = useMemo(() => {
    if (!symbol) {
      return undefined;
    }

    const marketFromList = markets.find((m) => m.symbol === symbol);
    return marketFromList ?? routeMarketData;
  }, [markets, symbol, routeMarketData]);

  // Check if user has an existing position for this market
  const { existingPosition } = useHasExistingPosition({
    asset: symbol || '',
    loadOnMount: true,
  });

  // Position management hook for bottom sheet state and handlers
  const {
    showModifyActionSheet,
    modifyActionSheetRef,
    openModifySheet,
    closeModifySheet,
    handleReversePosition,
  } = usePositionManagement();

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

  // Subscribe to top-of-book (best bid/ask) for spread display.
  // This is intentionally independent from order book aggregation/grouping.
  const topOfBook = usePerpsTopOfBook({ symbol: symbol || '' });

  // Fast focused price via activeAssetCtx projection (~0.5 s, TAT-3334)
  const focusedPrice = usePerpsLiveFocusedPrice({
    symbol: symbol || '',
    enabled: Boolean(symbol),
  });

  // allMids baseline as first-render fallback (~2 s)
  const livePrices = usePerpsLivePrices({
    symbols: symbol ? [symbol] : [],
    throttleMs: 1000,
  });

  // Current price for header — prefer fast focused price, fall back to allMids,
  // then to static market price
  const currentPrice = useMemo(() => {
    const focusedParsed = focusedPrice?.price
      ? parseFloat(focusedPrice.price)
      : NaN;
    if (Number.isFinite(focusedParsed) && focusedParsed > 0) {
      return focusedParsed;
    }
    const baselineParsed = livePrices[symbol || '']?.price
      ? parseFloat(livePrices[symbol || ''].price)
      : NaN;
    if (Number.isFinite(baselineParsed) && baselineParsed > 0) {
      return baselineParsed;
    }
    return marketPrice ?? 0;
  }, [focusedPrice, livePrices, symbol, marketPrice]);

  const spreadMetrics = useMemo(() => {
    const bidStr = topOfBook?.bestBid;
    const askStr = topOfBook?.bestAsk;
    if (!bidStr || !askStr) return null;

    const bid = parseFloat(bidStr);
    const ask = parseFloat(askStr);
    if (
      !Number.isFinite(bid) ||
      !Number.isFinite(ask) ||
      bid <= 0 ||
      ask <= 0
    ) {
      return null;
    }

    // Round to eliminate floating point artifacts (e.g., 0.09999999999990905 → 0.1)
    const spread = Number((ask - bid).toPrecision(10));
    const mid = (ask + bid) / 2;
    const spreadPercentage = mid > 0 ? ((spread / mid) * 100).toFixed(3) : '0';

    return {
      spread,
      spreadPercentage,
    };
  }, [topOfBook]);

  // Calculate aggregation params (nSigFigs + mantissa) based on grouping
  const aggregationParams = useMemo(() => {
    if (!marketPrice || !currentGrouping) return { nSigFigs: 5 as const };
    return calculateAggregationParams(currentGrouping, marketPrice);
  }, [currentGrouping, marketPrice]);

  // Subscribe to live order book data with dynamic nSigFigs and mantissa
  // These parameters match Hyperliquid's API for consistent price aggregation.
  // `fast: true` opts into Hyperliquid's fast stream (5 levels @ ~0.5s) for a
  // snappier book on this focused screen (TAT-3333). `levels` is paired with
  // FAST_ORDER_BOOK_LEVELS (not MAX_ORDER_BOOK_LEVELS) so it agrees with the
  // 5-level cap the fast stream actually enforces per side.
  const {
    orderBook: rawOrderBook,
    isLoading,
    error,
  } = usePerpsLiveOrderBook({
    symbol: symbol || '',
    levels: FAST_ORDER_BOOK_LEVELS,
    nSigFigs: aggregationParams.nSigFigs,
    mantissa: aggregationParams.mantissa,
    throttleMs: 100,
    fast: true,
  });

  // Process order book data
  // The API's nSigFigs parameter handles aggregation at the server level,
  // so we don't need client-side aggregation. Just pass through the raw data.
  const orderBook = useMemo(() => {
    if (!rawOrderBook) {
      return rawOrderBook;
    }

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
      [PERPS_EVENT_PROPERTY.SCREEN_TYPE]:
        PERPS_EVENT_VALUE.SCREEN_TYPE.ORDER_BOOK,
      [PERPS_EVENT_PROPERTY.ASSET]: symbol || '',
      [PERPS_EVENT_PROPERTY.SOURCE]: PERPS_EVENT_VALUE.SOURCE.PERP_ASSET_SCREEN,
      [PERPS_EVENT_PROPERTY.OPEN_POSITION]: existingPosition ? 1 : 0,
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

  // Footer bottom padding accounts for home indicator when SafeAreaView is not used
  const footerStyle = useMemo(
    () => [styles.footer, { paddingBottom: insets.bottom }],
    [styles.footer, insets.bottom],
  );

  // Handle grouping dropdown press
  const handleDepthBandPress = useCallback(() => {
    setIsDepthBandSheetVisible(true);
  }, []);

  const groupingSelectButton = useMemo(
    () => (
      <View style={styles.groupingSelectButtonAccessory}>
        <SelectButton
          testID={PerpsOrderBookViewSelectorsIDs.DEPTH_BAND_BUTTON}
          variant={SelectButtonVariant.Primary}
          size={SelectButtonSize.Md}
          placeholder={currentGroupingLabel}
          value={currentGroupingLabel}
          onPress={handleDepthBandPress}
        />
      </View>
    ),
    [
      currentGroupingLabel,
      handleDepthBandPress,
      styles.groupingSelectButtonAccessory,
    ],
  );

  const orderBookHeader = useMemo(() => {
    if (!symbol) {
      return null;
    }

    if (market) {
      return (
        <PerpsMarketHeader
          market={market}
          onBackPress={handleBack}
          currentPrice={currentPrice}
          endAccessory={groupingSelectButton}
        />
      );
    }

    return (
      <HeaderSubpage
        includesTopInset
        twClassName="min-h-14 h-auto bg-default justify-center"
        onBack={handleBack}
        backButtonProps={{
          testID: PerpsOrderBookViewSelectorsIDs.BACK_BUTTON,
        }}
        endAccessory={groupingSelectButton}
        avatar={
          <PerpsTokenLogo
            symbol={symbol}
            size={40}
            testID={PerpsMarketHeaderSelectorsIDs.ASSET_ICON}
          />
        }
        title={`${displaySymbol}-USD`}
        titleProps={{ testID: PerpsMarketHeaderSelectorsIDs.ASSET_NAME }}
        description={
          currentPrice > 0 ? (
            <LivePriceHeader
              symbol={symbol}
              testIDPrice={PerpsMarketHeaderSelectorsIDs.PRICE}
              testIDChange={PerpsMarketHeaderSelectorsIDs.PRICE_CHANGE}
              throttleMs={1000}
              currentPrice={currentPrice}
            />
          ) : undefined
        }
      />
    );
  }, [
    symbol,
    market,
    handleBack,
    currentPrice,
    groupingSelectButton,
    displaySymbol,
  ]);

  // Handle grouping selection
  const handleGroupingSelect = useCallback(
    (value: number) => {
      const applyGroupingSelection = () => {
        setSelectedGrouping(value);
        saveGrouping(value);

        track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
          [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
            PERPS_EVENT_VALUE.INTERACTION_TYPE.TAP,
          [PERPS_EVENT_PROPERTY.ASSET]: symbol || '',
        });
      };

      if (depthBandSheetRef.current) {
        depthBandSheetRef.current.onCloseBottomSheet(applyGroupingSelection);
        return;
      }

      setIsDepthBandSheetVisible(false);
      applyGroupingSelection();
    },
    [symbol, track, saveGrouping],
  );

  // Handle grouping sheet close
  const handleDepthBandSheetClose = useCallback(() => {
    setIsDepthBandSheetVisible(false);
  }, []);

  useEffect(() => {
    if (isDepthBandSheetVisible) {
      depthBandSheetRef.current?.onOpenBottomSheet();
    }
  }, [isDepthBandSheetVisible]);

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
        [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
          PERPS_EVENT_VALUE.INTERACTION_TYPE.TAP,
        [PERPS_EVENT_PROPERTY.ASSET]: symbol || '',
      });
    },
    [symbol, track],
  );

  // Handle Long button press
  const handleLongPress = useCallback(
    () =>
      gate(async () => {
        // Geo-restriction check
        if (!isEligible) {
          track(MetaMetricsEvents.PERPS_SCREEN_VIEWED, {
            [PERPS_EVENT_PROPERTY.SCREEN_TYPE]:
              PERPS_EVENT_VALUE.SCREEN_TYPE.GEO_BLOCK_NOTIF,
            [PERPS_EVENT_PROPERTY.SOURCE]:
              PERPS_EVENT_VALUE.SOURCE.ORDER_BOOK_LONG_BUTTON,
          });
          setIsEligibilityModalVisible(true);
          return;
        }

        track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
          [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
            PERPS_EVENT_VALUE.INTERACTION_TYPE.TAP,
          [PERPS_EVENT_PROPERTY.ASSET]: symbol || '',
          [PERPS_EVENT_PROPERTY.DIRECTION]: PERPS_EVENT_VALUE.DIRECTION.LONG,
          [PERPS_EVENT_PROPERTY.SOURCE]:
            PERPS_EVENT_VALUE.SOURCE.PERP_ASSET_SCREEN,
        });

        navigateToOrder({
          direction: 'long',
          asset: symbol || '',
          source: PERPS_EVENT_VALUE.SOURCE.ORDER_BOOK_LONG_BUTTON,
        });
      }),
    [gate, isEligible, symbol, navigateToOrder, track],
  );

  // Handle Short button press
  const handleShortPress = useCallback(
    () =>
      gate(async () => {
        // Geo-restriction check
        if (!isEligible) {
          track(MetaMetricsEvents.PERPS_SCREEN_VIEWED, {
            [PERPS_EVENT_PROPERTY.SCREEN_TYPE]:
              PERPS_EVENT_VALUE.SCREEN_TYPE.GEO_BLOCK_NOTIF,
            [PERPS_EVENT_PROPERTY.SOURCE]:
              PERPS_EVENT_VALUE.SOURCE.ORDER_BOOK_SHORT_BUTTON,
          });
          setIsEligibilityModalVisible(true);
          return;
        }

        track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
          [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
            PERPS_EVENT_VALUE.INTERACTION_TYPE.TAP,
          [PERPS_EVENT_PROPERTY.ASSET]: symbol || '',
          [PERPS_EVENT_PROPERTY.DIRECTION]: PERPS_EVENT_VALUE.DIRECTION.SHORT,
          [PERPS_EVENT_PROPERTY.SOURCE]:
            PERPS_EVENT_VALUE.SOURCE.PERP_ASSET_SCREEN,
        });

        navigateToOrder({
          direction: 'short',
          asset: symbol || '',
          source: PERPS_EVENT_VALUE.SOURCE.ORDER_BOOK_SHORT_BUTTON,
        });
      }),
    [gate, isEligible, symbol, navigateToOrder, track],
  );

  // Handle Close position button press
  const handleClosePosition = useCallback(() => {
    if (!existingPosition) return;

    return gate(async () => {
      // Geo-restriction check
      if (!isEligible) {
        track(MetaMetricsEvents.PERPS_SCREEN_VIEWED, {
          [PERPS_EVENT_PROPERTY.SCREEN_TYPE]:
            PERPS_EVENT_VALUE.SCREEN_TYPE.GEO_BLOCK_NOTIF,
          [PERPS_EVENT_PROPERTY.SOURCE]:
            PERPS_EVENT_VALUE.SOURCE.ORDER_BOOK_CLOSE_BUTTON,
        });
        setIsEligibilityModalVisible(true);
        return;
      }

      navigateToClosePosition(
        existingPosition,
        PERPS_EVENT_VALUE.SOURCE.ORDER_BOOK,
      );
    });
  }, [existingPosition, gate, navigateToClosePosition, isEligible, track]);

  // Handle Modify position button press
  const handleModifyPress = useCallback(() => {
    if (!existingPosition) return;

    return gate(async () => {
      // Geo-restriction check
      if (!isEligible) {
        track(MetaMetricsEvents.PERPS_SCREEN_VIEWED, {
          [PERPS_EVENT_PROPERTY.SCREEN_TYPE]:
            PERPS_EVENT_VALUE.SCREEN_TYPE.GEO_BLOCK_NOTIF,
          [PERPS_EVENT_PROPERTY.SOURCE]:
            PERPS_EVENT_VALUE.SOURCE.ORDER_BOOK_MODIFY_BUTTON,
        });
        setIsEligibilityModalVisible(true);
        return;
      }

      openModifySheet();
    });
  }, [existingPosition, gate, openModifySheet, isEligible, track]);

  // Error state
  if (error) {
    return (
      <View style={styles.container} testID={testID}>
        {orderBookHeader}
        <View style={styles.errorContainer}>
          <Text variant={TextVariant.BodyMd} color={TextColor.ErrorDefault}>
            {strings('perps.order_book.error')}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container} testID={testID}>
      {orderBookHeader}

      {/* Controls Row - Unit Toggle */}
      <View style={styles.controlsRow}>
        <SegmentedControl
          testID={PerpsOrderBookViewSelectorsIDs.UNIT_TOGGLE}
          value={unitDisplay}
          onChange={(value) => handleUnitChange(value as UnitDisplay)}
          isFullWidth
          size={ButtonBaseSize.Sm}
        >
          <FilterButton
            value="base"
            testID={PerpsOrderBookViewSelectorsIDs.UNIT_TOGGLE_BASE}
          >
            {displaySymbol}
          </FilterButton>
          <FilterButton
            value="usd"
            testID={PerpsOrderBookViewSelectorsIDs.UNIT_TOGGLE_USD}
          >
            USD
          </FilterButton>
        </SegmentedControl>
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
        {spreadMetrics && (
          <View style={styles.spreadContainer}>
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
            >
              {strings('perps.order_book.spread')}:
            </Text>
            <Text variant={TextVariant.BodySm} color={TextColor.TextDefault}>
              {formatPerpsFiat(spreadMetrics.spread, {
                ranges: PRICE_RANGES_UNIVERSAL,
              })}
            </Text>
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
            >
              ({spreadMetrics.spreadPercentage}%)
            </Text>
            <ButtonIcon
              iconName={IconName.Info}
              size={ButtonIconSize.Xs}
              iconProps={{ color: IconColor.IconAlternative }}
              onPress={() => handleTooltipPress('spread')}
              testID={PerpsOrderBookViewSelectorsIDs.SPREAD_INFO_BUTTON}
            />
          </View>
        )}

        {/* Action Buttons - Show Modify/Close when position exists, Long/Short otherwise */}
        {existingPosition ? (
          <View style={styles.actionsContainer} accessible={false}>
            <Button
              variant={ButtonVariant.Secondary}
              size={ButtonSize.Lg}
              onPress={handleModifyPress}
              style={styles.actionButtonWrapper}
              testID={PerpsOrderBookViewSelectorsIDs.MODIFY_BUTTON}
            >
              {strings('perps.market.modify')}
            </Button>

            <Button
              variant={ButtonVariant.Primary}
              size={ButtonSize.Lg}
              onPress={handleClosePosition}
              style={styles.actionButtonWrapper}
              testID={PerpsOrderBookViewSelectorsIDs.CLOSE_BUTTON}
            >
              {parseFloat(existingPosition.size) >= 0
                ? strings('perps.market.close_long')
                : strings('perps.market.close_short')}
            </Button>
          </View>
        ) : (
          <View style={styles.actionsContainer} accessible={false}>
            {buttonColorVariant === 'colors' ? (
              <ButtonSemantic
                severity={ButtonSemanticSeverity.Success}
                onPress={handleLongPress}
                size={ButtonSize.Lg}
                style={styles.actionButtonWrapper}
                testID={PerpsOrderBookViewSelectorsIDs.LONG_BUTTON}
              >
                {strings('perps.market.long')}
              </ButtonSemantic>
            ) : (
              <Button
                variant={ButtonVariant.Primary}
                size={ButtonSize.Lg}
                onPress={handleLongPress}
                style={styles.actionButtonWrapper}
                testID={PerpsOrderBookViewSelectorsIDs.LONG_BUTTON}
              >
                {strings('perps.market.long')}
              </Button>
            )}

            {buttonColorVariant === 'colors' ? (
              <ButtonSemantic
                severity={ButtonSemanticSeverity.Danger}
                onPress={handleShortPress}
                size={ButtonSize.Lg}
                style={styles.actionButtonWrapper}
                testID={PerpsOrderBookViewSelectorsIDs.SHORT_BUTTON}
              >
                {strings('perps.market.short')}
              </ButtonSemantic>
            ) : (
              <Button
                variant={ButtonVariant.Primary}
                size={ButtonSize.Lg}
                onPress={handleShortPress}
                style={styles.actionButtonWrapper}
                testID={PerpsOrderBookViewSelectorsIDs.SHORT_BUTTON}
              >
                {strings('perps.market.short')}
              </Button>
            )}
          </View>
        )}
      </View>

      {/* Price Grouping Selection Bottom Sheet */}
      {isDepthBandSheetVisible && (
        <BottomSheet
          ref={depthBandSheetRef}
          onClose={handleDepthBandSheetClose}
          testID={PerpsOrderBookViewSelectorsIDs.DEPTH_BAND_SHEET}
        >
          <BottomSheetHeader
            onClose={() =>
              depthBandSheetRef.current?.onCloseBottomSheet(
                handleDepthBandSheetClose,
              )
            }
            closeButtonProps={{
              testID: PerpsOrderBookViewSelectorsIDs.DEPTH_BAND_SHEET_CLOSE,
            }}
          >
            {strings('perps.order_book.depth_band.title')}
          </BottomSheetHeader>
          {groupingOptions.map((value) => (
            <ListItemSelect
              key={value}
              title={formatGroupingLabel(value)}
              isSelected={currentGrouping === value}
              showSelectedIcon
              onPress={() => handleGroupingSelect(value)}
              testID={`${PerpsOrderBookViewSelectorsIDs.DEPTH_BAND_OPTION}-${value}`}
            />
          ))}
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
              buttonLocation={PERPS_EVENT_VALUE.BUTTON_LOCATION.ORDER_BOOK}
            />
          </Modal>
        </View>
      )}

      {/* Modify Action Bottom Sheet */}
      {showModifyActionSheet && (
        <PerpsSelectModifyActionView
          sheetRef={modifyActionSheetRef}
          position={existingPosition ?? undefined}
          onClose={closeModifySheet}
          onReversePosition={handleReversePosition}
          testID={PerpsOrderBookViewSelectorsIDs.MODIFY_ACTION_SHEET}
        />
      )}

      {/* Geo-restriction Modal */}
      {isEligibilityModalVisible && (
        <PerpsBottomSheetTooltip
          isVisible
          onClose={() => setIsEligibilityModalVisible(false)}
          contentKey={'geo_block'}
          testID={`${PerpsOrderBookViewSelectorsIDs.CONTAINER}-geo-block-tooltip`}
        />
      )}
    </View>
  );
};

export default PerpsOrderBookView;
