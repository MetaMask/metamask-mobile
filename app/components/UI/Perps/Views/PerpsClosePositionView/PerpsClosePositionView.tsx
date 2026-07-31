import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { PerpsClosePositionViewSelectorsIDs } from '../../Perps.testIds';
import { strings } from '../../../../../../locales/i18n';
import {
  Box,
  BottomSheetFooter,
  Button,
  ButtonSize,
  ButtonVariant,
  HelpText,
  HelpTextSeverity,
  KeyValueRow,
  KeyValueRowVariant,
  Slider,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTheme } from '../../../../../util/theme';
import { ImpactMoment, playImpact } from '../../../../../util/haptics';
import Keypad from '../../../../Base/Keypad';
import {
  DECIMAL_PRECISION_CONFIG,
  ORDER_SLIPPAGE_CONFIG,
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
  getPerpsDisplaySymbol,
  type InputMethod,
  type OrderType,
  type Position,
} from '@metamask/perps-controller';
import type { PerpsNavigationParamList } from '../../types/navigation';
import {
  useMinimumOrderAmount,
  usePerpsClosePosition,
  usePerpsClosePositionValidation,
  usePerpsOrderFees,
  usePerpsRewards,
  usePerpsToasts,
  usePerpsMarketData,
} from '../../hooks';
import {
  usePerpsLivePositions,
  usePerpsLivePrices,
  usePerpsTopOfBook,
} from '../../hooks/stream';
import { usePerpsEventTracking } from '../../hooks/usePerpsEventTracking';
import { usePerpsAbandonOrderTracking } from '../../hooks/usePerpsAbandonOrderTracking';
import { usePerpsMeasurement } from '../../hooks/usePerpsMeasurement';
import {
  formatPositionSize,
  formatPerpsFiat,
  PRICE_RANGES_UNIVERSAL,
} from '../../utils/formatUtils';
import { toPerpsEntryAttribution } from '../../utils/perpsAnalyticsAttribution';
import {
  calculateCloseAmountFromPercentage,
  validateCloseAmountLimits,
  formatCloseAmountUSD,
} from '../../utils/positionCalculations';
import { createStyles } from './PerpsClosePositionView.styles';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { TraceName } from '../../../../../util/trace';
import PerpsOrderHeader from '../../components/PerpsOrderHeader';
import PerpsAmountDisplay from '../../components/PerpsAmountDisplay';
import PerpsLimitPriceBottomSheet from '../../components/PerpsLimitPriceBottomSheet';
import PerpsOrderTypeBottomSheet from '../../components/PerpsOrderTypeBottomSheet';
import PerpsCloseSummary from '../../components/PerpsCloseSummary';
import { useVipTier } from '../../../Rewards/hooks/useVipTier';
import { selectPerpsClosePositionLimitOrderEnabledFlag } from '../../selectors/featureFlags';
const PerpsClosePositionView: React.FC = () => {
  const theme = useTheme();
  const styles = createStyles(theme);
  const navigation = useNavigation<AppNavigationProp>();
  const route =
    useRoute<RouteProp<PerpsNavigationParamList, 'PerpsClosePosition'>>();
  const {
    position,
    source: routeSource,
    buttonClicked: entryButtonClicked,
    buttonLocation: entryButtonLocation,
  } = route.params as {
    position: Position;
    source?: string;
    buttonClicked?: string;
    buttonLocation?: string;
  };

  const inputMethodRef = useRef<InputMethod>('default');
  const isAmountInitializedRef = useRef(false);
  const hasConfirmedCloseRef = useRef(false);
  const latestAbandonPropsRef = useRef<Record<string, unknown>>({});

  const { showToast, PerpsToastOptions } = usePerpsToasts();

  // Get market data for szDecimals with automatic error toast handling
  const { marketData, isLoading: isLoadingMarketData } = usePerpsMarketData({
    asset: position.symbol,
    showErrorToast: true,
  });

  // Track screen load performance with unified hook (immediate measurement)
  usePerpsMeasurement({
    traceName: TraceName.PerpsClosePositionView,
  });

  // Feature flag gating the Market/Limit order-type selector on the close screen.
  // Defaults to off so it can be rolled out/rolled back independently of the release.
  const isClosePositionLimitOrderEnabled = useSelector(
    selectPerpsClosePositionLimitOrderEnabledFlag,
  );

  // State for order type and bottom sheets
  const [orderType, setOrderType] = useState<OrderType>('market');
  const [isLimitPriceVisible, setIsLimitPriceVisible] = useState(false);
  const [isOrderTypeVisible, setIsOrderTypeVisible] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [isUserInputActive, setIsUserInputActive] = useState(false);

  // State for close amount
  const [closePercentage, setClosePercentage] = useState(100); // Default to 100% (full close)
  const [closeAmountUSDString, setCloseAmountUSDString] = useState('0'); // Raw string for USD input (user input only)

  // Live slider display value for immediate UI feedback while dragging. The
  // committed `closePercentage` only updates on drag end, since it drives the
  // expensive fee/rewards/validation recompute pipeline (usePerpsOrderFees et
  // al.). `displayClosePercentage` is derived (not effect-synced) so every
  // other input method (keypad, percentage, max) renders the committed
  // percentage immediately, with no one-render window waiting on a
  // `useEffect` to catch up.
  const [liveDragClosePercentage, setLiveDragClosePercentage] =
    useState(closePercentage);
  const [isDraggingSlider, setIsDraggingSlider] = useState(false);
  const displayClosePercentage = isDraggingSlider
    ? liveDragClosePercentage
    : closePercentage;

  // State for limit price
  const [limitPrice, setLimitPrice] = useState('');

  // Gate the order type on the feature flag. Deriving it (instead of only
  // resetting state in an effect) guarantees that a disabled — or mid-session
  // flipped-off — flag can never drive limit UI, calculations, validation, or
  // submission, with no one-render window before an effect would run.
  const effectiveOrderType: OrderType = isClosePositionLimitOrderEnabled
    ? orderType
    : 'market';
  // Subscribe to real-time price with 1s debounce for position closing
  const priceData = usePerpsLivePrices({
    symbols: [position.symbol],
    throttleMs: 1000,
  });
  const currentPrice = priceData[position.symbol]?.price
    ? parseFloat(priceData[position.symbol].price)
    : parseFloat(position.entryPrice);

  // Mark price used as the reference for HyperLiquid's oracle price band. Falls
  // back to the mid/mark currentPrice when the mark price is missing or does
  // not parse to a finite positive number (otherwise a NaN reference would
  // silently skip the band check).
  const markPrice = priceData[position.symbol]?.markPrice;
  const parsedMarkPrice = markPrice ? parseFloat(markPrice) : NaN;
  const referencePrice =
    Number.isFinite(parsedMarkPrice) && parsedMarkPrice > 0
      ? parsedMarkPrice
      : currentPrice;

  // Use ref to access latest price without triggering fee recalculations
  // This prevents continuous recalculations on every WebSocket price update
  const currentPriceRef = useRef(currentPrice);
  currentPriceRef.current = currentPrice;

  // Get top of book data for maker/taker fee determination
  const currentTopOfBook = usePerpsTopOfBook({
    symbol: position.symbol,
  });

  // Subscribe to live position updates for this coin
  // This ensures margin and PnL values include real-time funding fees
  const { positions: livePositions } = usePerpsLivePositions({
    throttleMs: 1000,
  });
  const livePosition = useMemo(
    () => livePositions.find((p) => p.symbol === position.symbol) || position,
    [livePositions, position],
  );

  // Determine position direction using live position data
  const isLong = parseFloat(livePosition.size) > 0;
  const absSize = Math.abs(parseFloat(livePosition.size));
  // Calculate effective price for calculations
  // For limit orders, use limit price when available; otherwise use current market price
  const effectivePrice = useMemo(() => {
    if (effectiveOrderType === 'limit' && limitPrice) {
      const parsed = parseFloat(limitPrice);
      if (!isNaN(parsed) && parsed > 0) {
        return parsed;
      }
    }
    return currentPrice;
  }, [effectiveOrderType, limitPrice, currentPrice]);

  // Single funnel for "the slider is no longer the source of truth for
  // displayClosePercentage" — used by drag end/cancel below, and by every
  // other input method's commit path (keypad, percentage, max) so a gesture
  // that never fires `onDragEnd` (see handleSliderDragCancel) cannot
  // permanently wedge displayClosePercentage on a stale
  // liveDragClosePercentage once the user does anything else. Unlike a
  // quiet-period timer, this depends only on real "something else just
  // committed a value" events, so it can never misfire mid-drag (e.g. a
  // paused-but-still-active hold, where onValueChange legitimately stops
  // ticking without the gesture ending).
  const commitClosePercentage = useCallback(
    (value: number, options?: { syncUsdString?: boolean }) => {
      setIsDraggingSlider(false);
      setLiveDragClosePercentage(value);
      setClosePercentage(value);

      if (options?.syncUsdString === false) {
        return;
      }
      // Update USD input to match calculated value for keypad display consistency
      const newUSDAmount = (value / 100) * absSize * effectivePrice;
      setCloseAmountUSDString(formatCloseAmountUSD(newUSDAmount));
    },
    [absSize, effectivePrice],
  );

  const handleSliderValueChange = useCallback((value: number) => {
    inputMethodRef.current = 'slider';
    setIsDraggingSlider(true);
    setLiveDragClosePercentage(value);
  }, []);

  const handleSliderDragEnd = useCallback(
    (value: number) => {
      commitClosePercentage(value);
    },
    [commitClosePercentage],
  );

  // A pan gesture cancelled by competing-gesture arbitration (e.g. a parent
  // ScrollView taking over) finalizes internally in the design-system Slider
  // without ever calling `onDragEnd`, and react-native-gesture-handler owns
  // the touch outside RN's responder system, so this `onTouchCancel` is only
  // a best-effort signal, not a guarantee. The real safety net is that every
  // other input method funnels through `commitClosePercentage`, which
  // unconditionally clears `isDraggingSlider` — so even if this never fires,
  // the very next keypad/percentage/max edit (or the confirm-close guard
  // below) self-heals the stuck flag instead of leaving it wedged
  // indefinitely.
  const handleSliderDragCancel = useCallback(() => {
    if (isDraggingSlider) {
      commitClosePercentage(liveDragClosePercentage);
    }
  }, [commitClosePercentage, isDraggingSlider, liveDragClosePercentage]);

  // Calculate display values directly from closePercentage for immediate updates
  const { closeAmount, calculatedUSDString } = useMemo(() => {
    // During loading, return '0' as temporary state (not a default - intentional for loading UX)
    if (isLoadingMarketData) {
      return {
        closeAmount: '0',
        calculatedUSDString: '0.00',
      };
    }

    // Defensive fallback if market data fails to load - prevents crashes
    // Real szDecimals should come from market data (varies by asset)
    const szDecimals =
      marketData?.szDecimals ?? DECIMAL_PRECISION_CONFIG.FallbackSizeDecimals;

    const { tokenAmount, usdValue } = calculateCloseAmountFromPercentage({
      percentage: closePercentage,
      positionSize: absSize,
      currentPrice: effectivePrice,
      szDecimals,
    });

    return {
      closeAmount: tokenAmount.toString(),
      calculatedUSDString: formatCloseAmountUSD(usdValue),
    };
  }, [
    closePercentage,
    absSize,
    effectivePrice,
    marketData?.szDecimals,
    isLoadingMarketData,
  ]);

  // Live counterpart of closeAmount/calculatedUSDString for display only -
  // cheap synchronous calc, safe to recompute every drag frame off the live
  // display percentage. closeAmount/calculatedUSDString above stay tied to
  // the committed closePercentage and keep feeding fees, validation, and
  // handleConfirm.
  const {
    closeAmount: liveCloseAmount,
    calculatedUSDString: liveCalculatedUSDString,
  } = useMemo(() => {
    if (isLoadingMarketData) {
      return { closeAmount: '0', calculatedUSDString: '0.00' };
    }

    const szDecimals =
      marketData?.szDecimals ?? DECIMAL_PRECISION_CONFIG.FallbackSizeDecimals;

    const { tokenAmount, usdValue } = calculateCloseAmountFromPercentage({
      percentage: displayClosePercentage,
      positionSize: absSize,
      currentPrice: effectivePrice,
      szDecimals,
    });

    return {
      closeAmount: tokenAmount.toString(),
      calculatedUSDString: formatCloseAmountUSD(usdValue),
    };
  }, [
    displayClosePercentage,
    absSize,
    effectivePrice,
    marketData?.szDecimals,
    isLoadingMarketData,
  ]);

  // Use calculated USD string when not in input mode, user input when typing
  const displayUSDString =
    isInputFocused || isUserInputActive
      ? closeAmountUSDString
      : liveCalculatedUSDString;

  // Use live position data which includes real-time funding fees
  // HyperLiquid's marginUsed already includes accumulated PnL
  const marginUsed = parseFloat(livePosition.marginUsed);

  // Use unrealizedPnl from live position (includes funding fees)
  const unrealizedPnl = parseFloat(livePosition.unrealizedPnl);

  // Keep pnl reference for backwards compatibility with event tracking
  const pnl = unrealizedPnl;

  // Position value at the effective price (limit price for limit orders)
  const positionValue = useMemo(
    () => absSize * effectivePrice,
    [absSize, effectivePrice],
  );

  // P&L at the effective price. For limit orders this recomputes when the
  // effective (limit or mark) price changes; for market orders it uses the
  // live unrealized PnL.
  const entryPrice = parseFloat(position.entryPrice);
  const effectivePnL = useMemo(() => {
    // For long positions: (effectivePrice - entryPrice) * absSize
    // For short positions: (entryPrice - effectivePrice) * absSize
    if (effectiveOrderType === 'market') {
      return pnl;
    }
    const priceDiff = isLong
      ? effectivePrice - entryPrice
      : entryPrice - effectivePrice;
    return priceDiff * absSize;
  }, [entryPrice, absSize, isLong, effectiveOrderType, effectivePrice, pnl]);

  // Margin returned on close, adjusted for the price the order will settle at.
  // marginUsed embeds unrealized PnL at the current mark price, so for limit
  // orders we swap that current-price PnL for the limit-price PnL (effectivePnL).
  // For market orders effectivePnL equals unrealizedPnl, so this is a no-op.
  //
  // "You'll receive" is intentionally an estimate: this swaps out the full
  // current unrealizedPnl (price + accrued funding) and adds back only the
  // limit-price price spread. Funding that accrues between now and when the
  // limit order fills is unknowable, so we deliberately do not project it here.
  const effectiveMargin = useMemo(
    () => marginUsed - unrealizedPnl + effectivePnL,
    [marginUsed, unrealizedPnl, effectivePnL],
  );

  // Calculate fees using the unified fee hook
  const closingValue = useMemo(
    () => positionValue * (closePercentage / 100),
    [positionValue, closePercentage],
  );
  const closingValueString = useMemo(
    () => closingValue.toString(),
    [closingValue],
  );

  const feeResults = usePerpsOrderFees({
    orderType: effectiveOrderType,
    amount: closingValueString,
    symbol: position.symbol,
    isClosing: true,
    limitPrice,
    direction: isLong ? 'short' : 'long',
    currentAskPrice: currentTopOfBook?.bestAsk
      ? Number.parseFloat(currentTopOfBook.bestAsk)
      : undefined,
    currentBidPrice: currentTopOfBook?.bestBid
      ? Number.parseFloat(currentTopOfBook.bestBid)
      : undefined,
  });

  // Simple boolean calculation for rewards state
  const hasValidAmount = useMemo(
    () => closePercentage > 0 && closingValue > 0,
    [closePercentage, closingValue],
  );

  // Get rewards state using the new hook
  const rewardsState = usePerpsRewards({
    feeResults,
    hasValidAmount,
    isFeesLoading: feeResults.isLoadingMetamaskFee,
    orderAmount: closingValueString,
  });

  const vipTier = useVipTier();

  // Calculate what user will receive (margin - fees)
  // Round each component separately to match what user sees in UI
  // This ensures: displayed margin - displayed fees = displayed receive amount
  const receiveAmount = useMemo(() => {
    const marginPortion = (closePercentage / 100) * effectiveMargin;
    // Round margin and fees to 2 decimals (what user sees)
    const roundedMargin = Math.round(marginPortion * 100) / 100;
    const roundedFees = Math.round(feeResults.totalFee * 100) / 100;
    // Subtract rounded values for transparent calculation
    return roundedMargin - roundedFees;
  }, [closePercentage, effectiveMargin, feeResults.totalFee]);

  // Get minimum order amount for this asset
  const { minimumOrderAmount } = useMinimumOrderAmount({
    asset: position.symbol,
  });

  // Calculate remaining position value after partial close
  const remainingPositionValue = positionValue * (1 - closePercentage / 100);
  const isPartialClose = closePercentage < 100;

  // Use the validation hook
  const validationResult = usePerpsClosePositionValidation({
    symbol: position.symbol,
    closePercentage,
    closeAmount: closeAmount.toString(),
    orderType: effectiveOrderType,
    limitPrice,
    // Pass the live mark price (not the limit price) so the "limit price far
    // from market" warning and protocol validation compare against the real
    // market. Limit-price valuation is applied separately via positionValue/
    // closingValue below.
    currentPrice,
    referencePrice,
    positionSize: absSize,
    positionValue,
    minimumOrderAmount,
    closingValue,
    remainingPositionValue,
    receiveAmount,
    isPartialClose,
    skipValidation: isInputFocused,
  });

  const { handleClosePosition, isClosing } = usePerpsClosePosition();
  const unrealizedPnlPercent = useMemo(() => {
    const initialMargin = marginUsed - pnl; // Back-calculate initial margin
    return initialMargin > 0 ? (pnl / initialMargin) * 100 : 0;
  }, [marginUsed, pnl]);

  usePerpsEventTracking({
    eventName: MetaMetricsEvents.PERPS_SCREEN_VIEWED,
    properties: {
      [PERPS_EVENT_PROPERTY.SCREEN_TYPE]:
        PERPS_EVENT_VALUE.SCREEN_TYPE.POSITION_CLOSE,
      [PERPS_EVENT_PROPERTY.ASSET]: position.symbol,
      [PERPS_EVENT_PROPERTY.DIRECTION]: isLong
        ? PERPS_EVENT_VALUE.DIRECTION.LONG
        : PERPS_EVENT_VALUE.DIRECTION.SHORT,
      [PERPS_EVENT_PROPERTY.POSITION_SIZE]: absSize,
      [PERPS_EVENT_PROPERTY.UNREALIZED_PNL_DOLLAR]: pnl,
      [PERPS_EVENT_PROPERTY.UNREALIZED_PNL_PERCENT]: unrealizedPnlPercent,
      // Honour the route-provided source threaded by each entry CTA
      // (reduce-exposure → position_screen, order-book → order_book); fall back
      // to the asset screen for direct entries that pass no source.
      [PERPS_EVENT_PROPERTY.SOURCE]:
        routeSource ?? PERPS_EVENT_VALUE.SOURCE.PERP_ASSET_SCREEN,
      [PERPS_EVENT_PROPERTY.RECEIVED_AMOUNT]: receiveAmount,
      // The entry CTA (close vs reduce_exposure) is passed via the navigation
      // route param — closePercentage defaults to 100 at open, so isPartialClose
      // can't identify which CTA opened this screen. isPartialClose still drives
      // later interaction events, just not this entry screen-view.
      [PERPS_EVENT_PROPERTY.BUTTON_CLICKED]:
        entryButtonClicked ?? PERPS_EVENT_VALUE.BUTTON_CLICKED.CLOSE,
      [PERPS_EVENT_PROPERTY.BUTTON_LOCATION]:
        entryButtonLocation ?? PERPS_EVENT_VALUE.BUTTON_LOCATION.SCREEN,
    },
  });

  latestAbandonPropsRef.current = {
    [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
      PERPS_EVENT_VALUE.INTERACTION_TYPE.TAP,
    [PERPS_EVENT_PROPERTY.ACTION]: PERPS_EVENT_VALUE.ACTION.ABANDON_ORDER,
    [PERPS_EVENT_PROPERTY.ASSET]: position.symbol,
    [PERPS_EVENT_PROPERTY.DIRECTION]: isLong
      ? PERPS_EVENT_VALUE.DIRECTION.LONG
      : PERPS_EVENT_VALUE.DIRECTION.SHORT,
    [PERPS_EVENT_PROPERTY.ORDER_SIZE]: closingValue,
    [PERPS_EVENT_PROPERTY.LEVERAGE_USED]: livePosition.leverage?.value,
  };

  // emit abandon_order on a real exit (back swipe, hardware back,
  // programmatic dismissal) AND on a genuine tab switch away, but never when a
  // child route (e.g. the limit-price flow) is pushed or after a confirmed close
  // (hasConfirmedCloseRef).
  const getAbandonProperties = useCallback(
    () => latestAbandonPropsRef.current,
    [],
  );
  usePerpsAbandonOrderTracking({
    getAbandonProperties,
    hasCommittedRef: hasConfirmedCloseRef,
  });

  // Initialize USD values when price data is available (only once, not on price updates)
  useEffect(() => {
    if (!isAmountInitializedRef.current && absSize > 0 && effectivePrice > 0) {
      const initialUSDAmount = absSize * effectivePrice;
      setCloseAmountUSDString(formatCloseAmountUSD(initialUSDAmount));
      isAmountInitializedRef.current = true;
    }
  }, [absSize, effectivePrice]);

  // Sync closeAmountUSDString with calculatedUSDString when user is not actively editing
  // This prevents the jump when focusing input after price updates
  useEffect(() => {
    if (!isUserInputActive && isAmountInitializedRef.current) {
      setCloseAmountUSDString(calculatedUSDString);
    }
  }, [calculatedUSDString, isUserInputActive]);

  // Auto-open limit price bottom sheet when switching to limit order
  useEffect(() => {
    if (effectiveOrderType === 'limit' && !limitPrice) {
      setIsLimitPriceVisible(true);
    }
  }, [effectiveOrderType, limitPrice]);

  const handleConfirm = useCallback(async () => {
    // Guard against submitting a stale committed `closePercentage` while
    // `isDraggingSlider` is (or is stuck) true — e.g. a cancelled gesture
    // that never reached commitClosePercentage (see handleSliderDragCancel
    // above). Flush the last live value and bail; `closePercentage`
    // reflects it on the next render, so the very next tap confirms the
    // right amount instead of racing a same-tick confirm against a state
    // update.
    if (isDraggingSlider) {
      commitClosePercentage(liveDragClosePercentage);
      return;
    }

    // For full close, don't send size parameter
    const sizeToClose = closePercentage === 100 ? undefined : closeAmount;
    const isFullClose = closePercentage === 100;

    // For limit orders, validate price
    if (effectiveOrderType === 'limit' && !limitPrice) {
      return;
    }
    // Mark confirmed so the focus-effect cleanup does not emit an abandon event
    hasConfirmedCloseRef.current = true;

    // Go back immediately to close the position screen
    navigation.goBack();

    await handleClosePosition({
      position: livePosition,
      size: sizeToClose || '',
      orderType: effectiveOrderType,
      limitPrice: effectiveOrderType === 'limit' ? limitPrice : undefined,
      trackingData: {
        totalFee: feeResults.totalFee,
        marketPrice: currentPrice,
        receivedAmount: receiveAmount,
        realizedPnl: effectivePnL * (closePercentage / 100),
        metamaskFeeRate: feeResults.metamaskFeeRate,
        feeDiscountPercentage: feeResults.feeDiscountPercentage,
        metamaskFee: feeResults.metamaskFee,
        estimatedPoints: rewardsState.estimatedPoints,
        inputMethod: inputMethodRef.current,
        source: routeSource,
        ...toPerpsEntryAttribution({ source: routeSource }),
        ...(feeResults.protocolFeeRate !== undefined
          ? { hlFeeRate: feeResults.protocolFeeRate }
          : {}),
        vipTier: vipTier ?? undefined,
        vipDiscount: feeResults.feeDiscountPercentage,
      },
      marketPrice: priceData[position.symbol]?.price,
      // Always pass slippage parameters for price context
      // For 100% closes, omit usdAmount to bypass $10 minimum validation
      slippage: {
        usdAmount: isFullClose ? undefined : closingValueString,
        priceAtCalculation: effectivePrice,
        maxSlippageBps:
          effectiveOrderType === 'limit'
            ? ORDER_SLIPPAGE_CONFIG.DefaultLimitSlippageBps
            : ORDER_SLIPPAGE_CONFIG.DefaultMarketSlippageBps,
      },
    });
  }, [
    closePercentage,
    closeAmount,
    effectiveOrderType,
    limitPrice,
    navigation,
    handleClosePosition,
    livePosition,
    feeResults.totalFee,
    feeResults.metamaskFeeRate,
    feeResults.feeDiscountPercentage,
    feeResults.metamaskFee,
    feeResults.protocolFeeRate,
    currentPrice,
    receiveAmount,
    effectivePnL,
    rewardsState.estimatedPoints,
    routeSource,
    vipTier,
    priceData,
    position.symbol,
    closingValueString,
    effectivePrice,
    isDraggingSlider,
    commitClosePercentage,
    liveDragClosePercentage,
  ]);

  const handleAmountPress = () => {
    setIsInputFocused(true);
  };

  const handleKeypadChange = useCallback(
    ({ value }: { value: string; valueAsNumber: number }) => {
      inputMethodRef.current = 'keypad';
      const previousValue = closeAmountUSDString;
      // Special handling for decimal point deletion
      // If previous value had a decimal and new value is the same, force remove the decimal
      let adjustedValue = value;

      // Check if we're stuck on a decimal (e.g., "2." -> "2." means delete didn't work)
      if (previousValue.endsWith('.') && value === previousValue) {
        adjustedValue = value.slice(0, -1);
      }
      // Also handle case where decimal is in middle (e.g., "2.5" -> "2." should become "25")
      else if (
        previousValue.includes('.') &&
        value.endsWith('.') &&
        value.length === previousValue.length - 1
      ) {
        // User deleted a digit after decimal, remove the decimal too
        adjustedValue = value.replace('.', '');
      }

      // Set both focus flags immediately to prevent useEffect interference
      if (!isInputFocused) {
        setIsInputFocused(true);
      }
      if (!isUserInputActive) {
        setIsUserInputActive(true);
      }

      // Enforce 9-digit limit (ignoring non-digits). Block the change if exceeded.
      const digitCount = (adjustedValue.match(/\d/g) || []).length;
      if (digitCount > 9) {
        return; // Ignore input that would exceed 9 digits
      }

      // USD decimal input logic - preserve raw string for display
      // Use adjustedValue instead of original value
      const numericValue = parseFloat(adjustedValue) || 0;
      const clampedValue = validateCloseAmountLimits({
        amount: numericValue,
        maxAmount: positionValue,
      });

      // For USD mode, preserve user input exactly as typed for proper delete operations
      // Only limit decimal places if there are digits after the decimal point
      let formattedUSDString = adjustedValue;
      if (adjustedValue.includes('.')) {
        const parts = adjustedValue.split('.');
        const integerPart = parts[0] || '';
        const decimalPart = parts[1] || '';

        // If there's a decimal part, limit it to 2 digits
        if (decimalPart.length > 0) {
          formattedUSDString = integerPart + '.' + decimalPart.slice(0, 2);
        } else {
          // Keep the decimal point if user just typed it (like "2.")
          formattedUSDString = integerPart + '.';
        }
      }

      // Update all states in batch to prevent race conditions
      setCloseAmountUSDString(formattedUSDString);

      // Calculate percentage and token amount
      const newPercentage =
        positionValue > 0 ? (clampedValue / positionValue) * 100 : 0;

      // Update percentage (amount and token values are calculated
      // automatically). `syncUsdString: false` because `closeAmountUSDString`
      // was just set above from the user's raw typed string (preserving
      // e.g. a trailing "2." while typing) — commitClosePercentage's own USD
      // recompute would immediately clobber that with a reformatted value.
      commitClosePercentage(newPercentage, { syncUsdString: false });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [positionValue, isInputFocused, isUserInputActive, closeAmountUSDString],
  );

  const handlePercentagePress = (percentage: number) => {
    inputMethodRef.current = 'percentage';
    commitClosePercentage(percentage * 100);
  };

  const handleMaxPress = () => {
    inputMethodRef.current = 'max';
    commitClosePercentage(100);
  };

  const handleDonePress = () => {
    setIsInputFocused(false);
    setIsUserInputActive(false);
  };

  const handleSliderGrip = useCallback(() => {
    playImpact(ImpactMoment.SliderGrip);
  }, []);

  const handleSliderMark = useCallback(() => {
    playImpact(ImpactMoment.SliderTick);
  }, []);

  // Hide provider-level limit price required error on this UI. Surface the
  // minimum amount error (e.g. minimum $10) and the "limit price too far"
  // band error — both are blocking, so Close must explain why it is disabled.
  const filteredErrors = useMemo(() => {
    const minimumAmountErrorPrefix = strings(
      'perps.order.validation.minimum_amount',
      {
        amount: '',
      },
    ).replace(/\s+$/, '');
    const limitPriceTooFarError = strings(
      'perps.order.limit_price_modal.limit_price_too_far',
    );
    // The actual minimum amount string includes the amount placeholder; match by key detection.
    return validationResult.errors.filter(
      (err) =>
        err.startsWith(minimumAmountErrorPrefix) ||
        err === limitPriceTooFarError,
    );
  }, [validationResult.errors]);

  const summaryMargin = (closePercentage / 100) * effectiveMargin;
  const summaryPnl = effectivePnL * (closePercentage / 100);
  const summaryFees = feeResults.totalFee;

  const Summary = (
    <PerpsCloseSummary
      totalMargin={summaryMargin}
      totalPnl={summaryPnl}
      totalFees={summaryFees}
      originalTotalFees={feeResults.undiscountedTotalFee}
      feeDiscountPercentage={rewardsState.feeDiscountPercentage}
      metamaskFeeRate={feeResults.metamaskFeeRate}
      protocolFeeRate={feeResults.protocolFeeRate}
      originalMetamaskFeeRate={feeResults.originalMetamaskFeeRate}
      receiveAmount={receiveAmount}
      shouldShowRewards={rewardsState.shouldShowRewardsRow}
      estimatedPoints={rewardsState.estimatedPoints}
      bonusBips={rewardsState.bonusBips}
      isLoadingFees={feeResults.isLoadingMetamaskFee}
      isLoadingRewards={rewardsState.isLoading}
      hasRewardsError={rewardsState.hasError}
      accountOptedIn={rewardsState.accountOptedIn}
      rewardsAccount={rewardsState.account}
      testIDs={{
        feesTooltip: PerpsClosePositionViewSelectorsIDs.FEES_TOOLTIP_BUTTON,
        receiveTooltip:
          PerpsClosePositionViewSelectorsIDs.YOU_RECEIVE_TOOLTIP_BUTTON,
        pointsTooltip: PerpsClosePositionViewSelectorsIDs.POINTS_TOOLTIP_BUTTON,
        marginValue: PerpsClosePositionViewSelectorsIDs.MARGIN_VALUE,
        feesValue: PerpsClosePositionViewSelectorsIDs.FEES_VALUE,
        receiveValue: PerpsClosePositionViewSelectorsIDs.RECEIVE_VALUE,
      }}
    />
  );

  const isConfirmDisabled =
    isClosing ||
    (effectiveOrderType === 'limit' &&
      (!limitPrice || parseFloat(limitPrice) <= 0)) ||
    (effectiveOrderType === 'market' && closePercentage === 0) ||
    !validationResult.isValid;

  const confirmButtonProps = useMemo(
    () => ({
      children: isClosing
        ? strings('perps.close_position.closing')
        : strings('perps.close_position.button'),
      onPress: handleConfirm,
      size: ButtonSize.Lg,
      isDisabled: isConfirmDisabled,
      isLoading: isClosing,
      testID: PerpsClosePositionViewSelectorsIDs.CLOSE_POSITION_CONFIRM_BUTTON,
    }),
    [handleConfirm, isClosing, isConfirmDisabled],
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <PerpsOrderHeader
        asset={position.symbol}
        price={currentPrice}
        title={strings('perps.close_position.title')}
        isLoading={isClosing}
        orderType={
          isClosePositionLimitOrderEnabled ? effectiveOrderType : undefined
        }
        onOrderTypePress={
          isClosePositionLimitOrderEnabled
            ? () => setIsOrderTypeVisible(true)
            : undefined
        }
      />

      <ScrollView
        style={styles.content}
        alwaysBounceVertical={false}
        contentContainerStyle={[
          styles.scrollViewContent,
          isInputFocused && styles.scrollViewContentWithKeypad,
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Amount Display */}
        <PerpsAmountDisplay
          amount={displayUSDString}
          showWarning={false}
          onPress={handleAmountPress}
          isActive={isInputFocused}
          tokenAmount={formatPositionSize(
            liveCloseAmount,
            marketData?.szDecimals,
          )}
          hasError={filteredErrors.length > 0}
          tokenSymbol={position.symbol}
          showMaxAmount={false}
        />

        {/* Toggle Button for USD/Token Display */}
        <Box twClassName="items-center px-4 pt-0 pb-2">
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {`${formatPositionSize(liveCloseAmount, marketData?.szDecimals)} ${getPerpsDisplaySymbol(position.symbol)}`}
          </Text>
        </Box>

        {/* Slider - Hidden when keypad/input is focused */}
        {!isInputFocused && (
          <Box twClassName="px-4 pt-4" onTouchCancel={handleSliderDragCancel}>
            <Slider
              value={displayClosePercentage}
              onValueChange={handleSliderValueChange}
              onDragEnd={handleSliderDragEnd}
              minimumValue={0}
              maximumValue={100}
              step={1}
              showRangeLabels
              showRangeDots
              isDisabled={isClosing}
              onGrip={handleSliderGrip}
              onMark={handleSliderMark}
            />
          </Box>
        )}

        {/* Limit Price - only show for limit orders (still hidden during input to avoid overlap) */}
        {effectiveOrderType === 'limit' && !isInputFocused && (
          <Box twClassName="px-4 pb-0">
            <Box twClassName="bg-background-section rounded-xl overflow-hidden">
              <TouchableOpacity
                testID={PerpsClosePositionViewSelectorsIDs.LIMIT_PRICE_ROW}
                onPress={() => setIsLimitPriceVisible(true)}
              >
                <KeyValueRow
                  variant={KeyValueRowVariant.Input}
                  keyLabel={strings('perps.order.limit_price')}
                  value={
                    limitPrice
                      ? formatPerpsFiat(limitPrice, {
                          ranges: PRICE_RANGES_UNIVERSAL,
                        })
                      : strings('perps.order.set_price')
                  }
                />
              </TouchableOpacity>
            </Box>
          </Box>
        )}

        {/* Order Details moved to footer summary */}

        {/* Validation Messages - keep visible while typing */}
        {/* Filter the errors and only show minimum $10 error */}
        <Box style={styles.helpTextContainer}>
          {filteredErrors.map((error, index) => (
            <HelpText
              key={`error-${index}`}
              severity={HelpTextSeverity.Danger}
              twClassName="w-full justify-center text-center"
            >
              {error}
            </HelpText>
          ))}
        </Box>
      </ScrollView>

      {/* Keypad Section - Show when input is focused; keep summary and slider above */}
      {isInputFocused && (
        <Box twClassName="pt-4">
          {/* Summary shown above keypad while editing */}
          {Summary}
          <Box twClassName="flex-row justify-between px-4 mb-3 gap-2">
            <Button
              variant={ButtonVariant.Secondary}
              size={ButtonSize.Md}
              onPress={() => handlePercentagePress(0.25)}
              twClassName="flex-1"
            >
              25%
            </Button>
            <Button
              variant={ButtonVariant.Secondary}
              size={ButtonSize.Md}
              onPress={() => handlePercentagePress(0.5)}
              twClassName="flex-1"
            >
              50%
            </Button>
            <Button
              variant={ButtonVariant.Secondary}
              size={ButtonSize.Md}
              onPress={handleMaxPress}
              twClassName="flex-1"
            >
              {strings('perps.deposit.max_button')}
            </Button>
            <Button
              variant={ButtonVariant.Secondary}
              size={ButtonSize.Md}
              onPress={handleDonePress}
              twClassName="flex-1"
            >
              {strings('perps.deposit.done_button')}
            </Button>
          </Box>

          <Box twClassName="px-4">
            <Keypad
              value={closeAmountUSDString}
              onChange={handleKeypadChange}
              currency={'USD'}
              decimals={2}
            />
          </Box>
        </Box>
      )}

      {/* Summary + Action Buttons - Always visible (button hidden when keypad active) */}
      <Box twClassName="w-full pb-4" style={styles.footerWithSummary}>
        {/* Summary Section (not shown here if input focused, as it's rendered above keypad) */}
        {!isInputFocused && Summary}
        {!isInputFocused && (
          <BottomSheetFooter primaryButtonProps={confirmButtonProps} />
        )}
      </Box>

      {/* Limit Price Bottom Sheet - gated on the derived order type so a
          mid-session flag flip closes it immediately (effectiveOrderType can
          only be 'limit' while the feature flag is enabled). */}
      <PerpsLimitPriceBottomSheet
        isVisible={isLimitPriceVisible && effectiveOrderType === 'limit'}
        onClose={() => {
          setIsLimitPriceVisible(false);
          // If user dismisses without entering a price, revert order type to market
          if (orderType === 'limit' && !limitPrice) {
            setOrderType('market');
            showToast(
              PerpsToastOptions.positionManagement.closePosition.limitClose
                .partial.switchToMarketOrderMissingLimitPrice,
            );
          }
        }}
        onConfirm={(price) => {
          setLimitPrice(price);
          // Close after confirmation explicitly
          setIsLimitPriceVisible(false);
        }}
        asset={position.symbol}
        limitPrice={limitPrice}
        currentPrice={currentPrice}
        direction={isLong ? 'short' : 'long'} // Opposite direction for closing
        isClosingPosition
      />

      {/* Order Type Bottom Sheet - gated behind feature flag */}
      {isClosePositionLimitOrderEnabled && (
        <PerpsOrderTypeBottomSheet
          isVisible={isOrderTypeVisible}
          onClose={() => setIsOrderTypeVisible(false)}
          onSelect={(type) => {
            setOrderType(type);
            // Clear limit price when switching back to market order
            if (type === 'market') {
              setLimitPrice('');
            }
            setIsOrderTypeVisible(false);
          }}
          currentOrderType={orderType}
          asset={position.symbol}
          direction={isLong ? 'short' : 'long'} // Opposite direction for closing
        />
      )}
    </SafeAreaView>
  );
};
export default PerpsClosePositionView;
