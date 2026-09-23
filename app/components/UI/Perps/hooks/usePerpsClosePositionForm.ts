import {
  useIsFocused,
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  DECIMAL_PRECISION_CONFIG,
  ORDER_SLIPPAGE_CONFIG,
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
  type InputMethod,
  type OrdinaryOrderType,
  type Position,
} from '@metamask/perps-controller';
import { ButtonSize } from '@metamask/design-system-react-native';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import Routes from '../../../../constants/navigation/Routes';
import { strings } from '../../../../../locales/i18n';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { TraceName } from '../../../../util/trace';
import { ImpactMoment, useHaptics } from '../../../../util/haptics';
import { useVipTier } from '../../Rewards/hooks/useVipTier';
import type { PerpsNavigationParamList } from '../types/navigation';
import {
  useMinimumOrderAmount,
  usePerpsClosePosition,
  usePerpsClosePositionValidation,
  usePerpsMarketData,
  usePerpsOrderFees,
  usePerpsRewards,
  usePerpsToasts,
} from './index';
import {
  usePerpsLivePositions,
  usePerpsLivePrices,
  usePerpsTopOfBook,
} from './stream';
import { usePerpsAbandonOrderTracking } from './usePerpsAbandonOrderTracking';
import { usePerpsCloseInFlight } from './usePerpsClosePosition';
import { usePerpsEventTracking } from './usePerpsEventTracking';
import { usePerpsMeasurement } from './usePerpsMeasurement';
import { PerpsCacheInvalidator } from '../services/PerpsCacheInvalidator';
import { MAX_PERPS_INPUT_DIGITS } from '../constants/perpsConfig';
import { selectPerpsClosePositionLimitOrderEnabledFlag } from '../selectors/featureFlags';
import { resolveOracleReferencePrice } from '../utils/orderUtils';
import { toPerpsEntryAttribution } from '../utils/perpsAnalyticsAttribution';
import { usePerpsMaxSlippage } from './usePerpsMaxSlippage';
import {
  calculateCloseAmountFromPercentage,
  formatCloseAmountUSD,
  validateCloseAmountLimits,
} from '../utils/positionCalculations';

export interface UsePerpsClosePositionFormOptions {
  /** Overrides `navigation.goBack()` so a sheet can animate closed first. */
  dismiss?: () => void;
  /** Opens the close-flow slippage editor from a failure toast. */
  onAdjustSlippage?: () => void;
  /** Reopens the close flow with fresh price data after a local price move. */
  onReviewPrice?: () => void;
  /** Applied to the confirm CTA this hook builds for the caller's footer. */
  confirmButtonTestID?: string;
}

/** Shape `BottomSheetFooter` expects for the close CTA. */
export interface PerpsCloseConfirmButtonProps {
  children: string;
  onPress: () => Promise<void>;
  size: ButtonSize;
  isDisabled: boolean;
  isLoading: boolean;
  testID?: string;
}

// Session-scoped so a later close — same or different position — reopens on
// the last Market/Limit choice. Limit price stays on this form instance so
// Market/Limit toggles do not wipe it; it is not reused across positions.
let lastCloseOrderType: OrdinaryOrderType = 'market';

/** Test-only. Resets the session close-order-type preference. */
export function resetLastCloseOrderType(): void {
  lastCloseOrderType = 'market';
}

export interface UsePerpsClosePositionFormResult {
  position: Position;
  livePosition: Position;
  isLong: boolean;
  absSize: number;
  currentPrice: number;
  szDecimals: number | undefined;
  isLoadingMarketData: boolean;
  isPositionGone: boolean;
  shouldOpenSlippage: boolean;
  maxSlippageBps: number;
  maxSlippageSource: string;
  setMaxSlippage: (bps: number) => void;

  isClosePositionLimitOrderEnabled: boolean;
  orderType: OrdinaryOrderType;
  effectiveOrderType: OrdinaryOrderType;
  selectOrderType: (type: OrdinaryOrderType) => void;
  limitPrice: string;
  setLimitPrice: (price: string) => void;

  closePercentage: number;
  displayClosePercentage: number;
  closeAmount: string;
  liveCloseAmount: string;
  closeAmountUSDString: string;
  displayUSDString: string;
  isInputFocused: boolean;

  handleSliderValueChange: (value: number) => void;
  handleSliderDragEnd: (value: number) => void;
  handleSliderDragCancel: () => void;
  handleAmountPress: () => void;
  handleKeypadChange: (input: { value: string; valueAsNumber: number }) => void;
  handlePercentagePress: (percentage: number) => void;
  handleMaxPress: () => void;
  handleDonePress: () => void;
  handleConfirm: () => Promise<void>;
  confirmButtonProps: PerpsCloseConfirmButtonProps;

  feeResults: ReturnType<typeof usePerpsOrderFees>;
  rewardsState: ReturnType<typeof usePerpsRewards>;
  summaryMargin: number;
  summaryPnl: number;
  summaryFees: number;
  receiveAmount: number;
  filteredErrors: string[];
  isClosing: boolean;
  isConfirmDisabled: boolean;
}

/**
 * Owns every non-visual concern of the close-position flow so the full-page
 * screen and the bottom-sheet variant cannot drift apart in behavior. Layout
 * and presentational state — nested sheet visibility, which blocks render —
 * stay in the caller, with one deliberate exception: `confirmButtonProps`
 * carries the CTA's copy, size, and disabled state, which both A/B arms must
 * present identically.
 */
export function usePerpsClosePositionForm(
  options?: UsePerpsClosePositionFormOptions,
): UsePerpsClosePositionFormResult {
  const navigation = useNavigation<AppNavigationProp>();
  const route =
    useRoute<RouteProp<PerpsNavigationParamList, 'PerpsClosePosition'>>();
  const {
    position,
    source: routeSource,
    buttonClicked: entryButtonClicked,
    buttonLocation: entryButtonLocation,
    enableHaptics = false,
    openSlippage = false,
  } = route.params as {
    position: Position;
    source?: string;
    buttonClicked?: string;
    buttonLocation?: string;
    enableHaptics?: boolean;
    openSlippage?: boolean;
  };
  const { playImpact: playHapticImpact } = useHaptics();

  // Ref so an inline closure from the caller cannot re-run the latched
  // dismissal effect or invalidate handleConfirm every render.
  const dismissRef = useRef<() => void>(navigation.goBack);
  dismissRef.current = options?.dismiss ?? navigation.goBack;

  const inputMethodRef = useRef<InputMethod>('default');
  const isAmountInitializedRef = useRef(false);
  const hasConfirmedCloseRef = useRef(false);
  const hasReconciledGoneRef = useRef(false);
  const latestAbandonPropsRef = useRef<Record<string, unknown>>({});

  const { showToast, PerpsToastOptions } = usePerpsToasts();
  const { maxSlippageBps, maxSlippageSource, setMaxSlippage } =
    usePerpsMaxSlippage();

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

  const [orderType, setOrderType] = useState<OrdinaryOrderType>(() =>
    isClosePositionLimitOrderEnabled ? lastCloseOrderType : 'market',
  );
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
  const effectiveOrderType: OrdinaryOrderType = isClosePositionLimitOrderEnabled
    ? orderType
    : 'market';
  const effectiveMaxSlippageBps =
    effectiveOrderType === 'limit'
      ? ORDER_SLIPPAGE_CONFIG.DefaultLimitSlippageBps
      : maxSlippageBps;
  const effectiveMaxSlippageSource =
    effectiveOrderType === 'limit'
      ? PERPS_EVENT_VALUE.MAX_SLIPPAGE_SOURCE.DEFAULT
      : maxSlippageSource;
  const reopenClosePosition = useCallback(
    (openSlippageNext: boolean) => {
      navigation.navigate(Routes.PERPS.CLOSE_POSITION, {
        ...route.params,
        openSlippage: openSlippageNext,
      });
    },
    [navigation, route.params],
  );
  const reopenWithSlippage = useCallback(
    () => reopenClosePosition(true),
    [reopenClosePosition],
  );
  const reopenWithFreshPrice = useCallback(
    () => reopenClosePosition(false),
    [reopenClosePosition],
  );

  // Subscribe to real-time price with 1s debounce for position closing
  const priceData = usePerpsLivePrices({
    symbols: [position.symbol],
    throttleMs: 1000,
  });
  const currentPrice = priceData[position.symbol]?.price
    ? Number.parseFloat(priceData[position.symbol].price)
    : Number.parseFloat(position.entryPrice);

  const referencePrice = resolveOracleReferencePrice(
    priceData[position.symbol]?.markPrice,
    currentPrice,
  );

  // Get top of book data for maker/taker fee determination
  const currentTopOfBook = usePerpsTopOfBook({
    symbol: position.symbol,
  });

  // Subscribe to live position updates for this coin
  // This ensures margin and PnL values include real-time funding fees
  const { positions: livePositions, isInitialLoading: isPositionsLoading } =
    usePerpsLivePositions({
      throttleMs: 1000,
    });
  const matchingLivePosition = useMemo(
    () => livePositions.find((p) => p.symbol === position.symbol),
    [livePositions, position.symbol],
  );
  // Keep the route snapshot only for layout until we dismiss a gone position.
  const livePosition = matchingLivePosition ?? position;
  const isPositionGone = !isPositionsLoading && !matchingLivePosition;
  // Another close for this market is still settling (e.g. this form was
  // reopened before the positions stream caught up).
  const isCloseInFlight = usePerpsCloseInFlight(livePosition.symbol);
  const isScreenFocused = useIsFocused();

  useEffect(() => {
    // A tooltip modal can sit on top of this still-mounted sheet. Dismissing
    // then would pop the tooltip instead of the sheet, so wait for focus and
    // latch only once the dismissal actually runs. handleConfirm already
    // dismisses on its own, so a stream drop racing its blur must not goBack
    // a second time.
    if (
      !isPositionGone ||
      !isScreenFocused ||
      hasConfirmedCloseRef.current ||
      hasReconciledGoneRef.current
    ) {
      return;
    }
    hasReconciledGoneRef.current = true;
    hasConfirmedCloseRef.current = true;
    showToast(
      PerpsToastOptions.positionManagement.closePosition.positionAlreadyClosed,
    );
    PerpsCacheInvalidator.invalidate('positions');
    PerpsCacheInvalidator.invalidate('accountState');
    dismissRef.current();
  }, [isPositionGone, isScreenFocused, showToast, PerpsToastOptions]);

  // Determine position direction using live position data
  const isLong = Number.parseFloat(livePosition.size) > 0;
  const absSize = Math.abs(Number.parseFloat(livePosition.size));

  // Calculate effective price for calculations
  // For limit orders, use limit price when available; otherwise use current market price
  const effectivePrice = useMemo(() => {
    if (effectiveOrderType === 'limit' && limitPrice) {
      const parsed = Number.parseFloat(limitPrice);
      if (!Number.isNaN(parsed) && parsed > 0) {
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
    (value: number, commitOptions?: { syncUsdString?: boolean }) => {
      setIsDraggingSlider(false);
      setLiveDragClosePercentage(value);
      setClosePercentage(value);

      if (commitOptions?.syncUsdString === false) {
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
  const marginUsed = Number.parseFloat(livePosition.marginUsed);

  // Use unrealizedPnl from live position (includes funding fees)
  const unrealizedPnl = Number.parseFloat(livePosition.unrealizedPnl);

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
  const entryPrice = Number.parseFloat(position.entryPrice);
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
  // (hasConfirmedCloseRef). The already-closed auto-dismissal above also sets
  // that ref: the venue removed the position, so the user abandoned nothing.
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

  const handleConfirm = useCallback(async () => {
    // The ref is synchronous: a second tap in the same tick still sees the
    // stale `isClosing` and would dismiss (goBack) a second time.
    if (
      hasConfirmedCloseRef.current ||
      isClosing ||
      isCloseInFlight ||
      isPositionGone
    ) {
      return;
    }

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
    if (enableHaptics) {
      playHapticImpact(ImpactMoment.PrimaryCTA).catch(() => undefined);
    }
    // Mark confirmed so the focus-effect cleanup does not emit an abandon event
    hasConfirmedCloseRef.current = true;

    // Go back immediately to close the position screen
    dismissRef.current();

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
        maxSlippageBps: effectiveMaxSlippageBps,
        maxSlippageSource: effectiveMaxSlippageSource,
        isFullClose,
      },
      marketPrice: priceData[position.symbol]?.price,
      // Always pass slippage parameters for price context
      // For 100% closes, omit usdAmount to bypass $10 minimum validation
      slippage: {
        usdAmount: isFullClose ? undefined : closingValueString,
        priceAtCalculation: effectivePrice,
        maxSlippageBps: effectiveMaxSlippageBps,
      },
      onAdjustSlippage: options?.onAdjustSlippage ?? reopenWithSlippage,
      onReviewPrice: options?.onReviewPrice ?? reopenWithFreshPrice,
    });
  }, [
    closePercentage,
    closeAmount,
    effectiveOrderType,
    enableHaptics,
    isCloseInFlight,
    isClosing,
    isPositionGone,
    limitPrice,
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
    effectiveMaxSlippageBps,
    effectiveMaxSlippageSource,
    options?.onAdjustSlippage,
    options?.onReviewPrice,
    reopenWithFreshPrice,
    reopenWithSlippage,
    priceData,
    position.symbol,
    closingValueString,
    effectivePrice,
    playHapticImpact,
    isDraggingSlider,
    commitClosePercentage,
    liveDragClosePercentage,
  ]);

  const handleAmountPress = useCallback(() => {
    setIsInputFocused(true);
  }, []);

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

      // Enforce digit limit (ignoring non-digits). Block the change if exceeded.
      const digitCount = (adjustedValue.match(/\d/g) || []).length;
      if (digitCount > MAX_PERPS_INPUT_DIGITS) {
        return; // Ignore input that would exceed the max digit limit
      }

      // USD decimal input logic - preserve raw string for display
      // Use adjustedValue instead of original value
      const numericValue = Number.parseFloat(adjustedValue) || 0;
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

  const handlePercentagePress = useCallback(
    (percentage: number) => {
      inputMethodRef.current = 'percentage';
      commitClosePercentage(percentage * 100);
    },
    [commitClosePercentage],
  );

  const handleMaxPress = useCallback(() => {
    inputMethodRef.current = 'max';
    commitClosePercentage(100);
  }, [commitClosePercentage]);

  const handleDonePress = useCallback(() => {
    setIsInputFocused(false);
    setIsUserInputActive(false);
  }, []);

  const selectOrderType = useCallback((type: OrdinaryOrderType) => {
    setOrderType(type);
    lastCloseOrderType = type;
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
    ).trimEnd();
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

  const isConfirmDisabled =
    isClosing ||
    isCloseInFlight ||
    isPositionGone ||
    (effectiveOrderType === 'limit' &&
      (!limitPrice || Number.parseFloat(limitPrice) <= 0)) ||
    (effectiveOrderType === 'market' && closePercentage === 0) ||
    !validationResult.isValid;

  const confirmButtonTestID = options?.confirmButtonTestID;
  const confirmButtonProps = useMemo(
    () => ({
      children:
        isClosing || isCloseInFlight
          ? strings('perps.close_position.closing')
          : strings('perps.close_position.button'),
      onPress: handleConfirm,
      size: ButtonSize.Lg,
      isDisabled: isConfirmDisabled,
      isLoading: isClosing || isCloseInFlight,
      testID: confirmButtonTestID,
    }),
    [
      confirmButtonTestID,
      handleConfirm,
      isCloseInFlight,
      isClosing,
      isConfirmDisabled,
    ],
  );

  return {
    position,
    livePosition,
    isLong,
    absSize,
    currentPrice,
    szDecimals: marketData?.szDecimals,
    isLoadingMarketData,
    isPositionGone,
    shouldOpenSlippage: openSlippage,
    maxSlippageBps: effectiveMaxSlippageBps,
    maxSlippageSource: effectiveMaxSlippageSource,
    setMaxSlippage,

    isClosePositionLimitOrderEnabled,
    orderType,
    effectiveOrderType,
    selectOrderType,
    limitPrice,
    setLimitPrice,

    closePercentage,
    displayClosePercentage,
    closeAmount,
    liveCloseAmount,
    closeAmountUSDString,
    displayUSDString,
    isInputFocused,

    handleSliderValueChange,
    handleSliderDragEnd,
    handleSliderDragCancel,
    handleAmountPress,
    handleKeypadChange,
    handlePercentagePress,
    handleMaxPress,
    handleDonePress,
    handleConfirm,
    confirmButtonProps,

    feeResults,
    rewardsState,
    summaryMargin,
    summaryPnl,
    summaryFees,
    receiveAmount,
    filteredErrors,
    isClosing,
    isConfirmDisabled,
  };
}
