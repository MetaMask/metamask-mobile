import {
  useNavigation,
  useRoute,
  type NavigationProp,
  type RouteProp,
} from '@react-navigation/native';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ScrollView, TouchableOpacity, View } from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { PerpsOrderViewSelectorsIDs } from '../../../../../../e2e/selectors/Perps/Perps.selectors';

import { ButtonSize as ButtonSizeRNDesignSystem } from '@metamask/design-system-react-native';
import { BigNumber } from 'bignumber.js';
import { strings } from '../../../../../../locales/i18n';
import ButtonSemantic, {
  ButtonSemanticSeverity,
} from '../../../../../component-library/components-temp/Buttons/ButtonSemantic';
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
import ListItem from '../../../../../component-library/components/List/ListItem';
import ListItemColumn, {
  WidthType,
} from '../../../../../component-library/components/List/ListItemColumn';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import useTooltipModal from '../../../../../components/hooks/useTooltipModal';
import Routes from '../../../../../constants/navigation/Routes';
import { useTheme } from '../../../../../util/theme';
import { TraceName } from '../../../../../util/trace';
import Keypad from '../../../../Base/Keypad';
import { MetaMetricsEvents } from '../../../../hooks/useMetrics';
import RewardsAnimations, {
  RewardAnimationState,
} from '../../../Rewards/components/RewardPointsAnimation';
import AddRewardsAccount from '../../../Rewards/components/AddRewardsAccount/AddRewardsAccount';
import PerpsAmountDisplay from '../../components/PerpsAmountDisplay';
import PerpsBottomSheetTooltip from '../../components/PerpsBottomSheetTooltip';
import { PerpsTooltipContentKey } from '../../components/PerpsBottomSheetTooltip/PerpsBottomSheetTooltip.types';
import PerpsFeesDisplay from '../../components/PerpsFeesDisplay';
import PerpsLeverageBottomSheet from '../../components/PerpsLeverageBottomSheet';
import PerpsLimitPriceBottomSheet from '../../components/PerpsLimitPriceBottomSheet';
import PerpsOICapWarning from '../../components/PerpsOICapWarning';
import PerpsOrderHeader from '../../components/PerpsOrderHeader';
import PerpsOrderTypeBottomSheet from '../../components/PerpsOrderTypeBottomSheet';
import PerpsSlider from '../../components/PerpsSlider';
import {
  PerpsEventProperties,
  PerpsEventValues,
} from '../../constants/eventNames';
import {
  DECIMAL_PRECISION_CONFIG,
  ORDER_SLIPPAGE_CONFIG,
  PERPS_CONSTANTS,
} from '../../constants/perpsConfig';
import {
  PerpsOrderProvider,
  usePerpsOrderContext,
} from '../../contexts/PerpsOrderContext';
import type {
  InputMethod,
  OrderParams,
  OrderType,
  PerpsNavigationParamList,
  Position,
} from '../../controllers/types';
import {
  useHasExistingPosition,
  useMinimumOrderAmount,
  usePerpsLiquidationPrice,
  usePerpsMarketData,
  usePerpsMarkets,
  usePerpsOrderExecution,
  usePerpsOrderFees,
  usePerpsOrderValidation,
  usePerpsRewards,
  usePerpsToasts,
  usePerpsTrading,
} from '../../hooks';
import {
  usePerpsLiveAccount,
  usePerpsLivePrices,
  usePerpsTopOfBook,
} from '../../hooks/stream';
import { usePerpsEventTracking } from '../../hooks/usePerpsEventTracking';
import { usePerpsMeasurement } from '../../hooks/usePerpsMeasurement';
import { usePerpsSavePendingConfig } from '../../hooks/usePerpsSavePendingConfig';
import { usePerpsOICap } from '../../hooks/usePerpsOICap';
import { usePerpsABTest } from '../../utils/abTesting/usePerpsABTest';
import { BUTTON_COLOR_TEST } from '../../utils/abTesting/tests';
import { selectPerpsButtonColorTestVariant } from '../../selectors/featureFlags';
import {
  formatPerpsFiat,
  PRICE_RANGES_MINIMAL_VIEW,
  PRICE_RANGES_UNIVERSAL,
} from '../../utils/formatUtils';
import { getPerpsDisplaySymbol } from '../../utils/marketUtils';
import {
  calculateMarginRequired,
  calculatePositionSize,
} from '../../utils/orderCalculations';
import { willFlipPosition } from '../../utils/orderUtils';
import {
  calculateRoEForPrice,
  isStopLossSafeFromLiquidation,
} from '../../utils/tpslValidation';
import createStyles from './PerpsOrderView.styles';

// Navigation params interface
interface OrderRouteParams {
  direction?: 'long' | 'short';
  asset?: string;
  amount?: string;
  leverage?: number;
  // Existing position param
  existingPosition?: Position;
  // Modal return values
  leverageUpdate?: number;
  orderTypeUpdate?: OrderType;
  tpslUpdate?: {
    takeProfitPrice?: string;
    stopLossPrice?: string;
  };
  limitPriceUpdate?: string;
  // Hide TP/SL when modifying existing position
  hideTPSL?: boolean;
}

interface PerpsOrderViewContentProps {
  hideTPSL?: boolean;
}

/**
 * PerpsOrderViewContentBase
 * Main content component for the Perps order view
 *
 * Features:
 * - Order submission with race condition guard (prevents double submission on Android)
 * - Real-time price updates and calculations
 * - Dynamic TP/SL percentage display
 * - Auto-opening limit price modal when switching order types
 * - Comprehensive order validation
 */
const PerpsOrderViewContentBase: React.FC<PerpsOrderViewContentProps> = ({
  hideTPSL = false,
}) => {
  const navigation = useNavigation<NavigationProp<PerpsNavigationParamList>>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const styles = createStyles(colors);

  // Dynamic bottom padding for fixed container: safe area inset + 16px visual padding
  const fixedBottomContainerStyle = useMemo(
    () => ({
      ...styles.fixedBottomContainer,
      paddingBottom: insets.bottom + 16,
    }),
    [styles.fixedBottomContainer, insets.bottom],
  );

  // Deferred loading: Load non-critical data after UI renders
  const [isDataReady, setIsDataReady] = useState(false);
  useEffect(() => {
    // Defer data loading to next frame for faster initial render
    requestAnimationFrame(() => {
      setIsDataReady(true);
    });
  }, []);

  const [selectedTooltip, setSelectedTooltip] =
    useState<PerpsTooltipContentKey | null>(null);

  const { track } = usePerpsEventTracking();
  const { openTooltipModal } = useTooltipModal();

  // Ref to access current orderType in callbacks
  const orderTypeRef = useRef<OrderType>('market');

  const isSubmittingRef = useRef(false);
  const hasShownSubmittedToastRef = useRef(false);
  const orderStartTimeRef = useRef<number>(0);
  const inputMethodRef = useRef<InputMethod>('default');

  const { account, isInitialLoading: isLoadingAccount } = usePerpsLiveAccount();

  // Get real HyperLiquid USDC balance
  const availableBalance = parseFloat(
    account?.availableBalance?.toString() || '0',
  );

  // Get order form state from context instead of hook
  const {
    orderForm,
    setAmount,
    setLeverage,
    setTakeProfitPrice,
    setStopLossPrice,
    setLimitPrice,
    setOrderType,
    handlePercentageAmount,
    handleMaxAmount,
    maxPossibleAmount,
    // existingPosition is available in context but not used in this component
  } = usePerpsOrderContext();

  // Save pending trade config when user navigates away
  usePerpsSavePendingConfig(orderForm);

  /**
   * PROTOCOL CONSTRAINT: Existing position leverage
   *
   * HyperLiquid protocol requirement: when adding to an existing position,
   * the new order's leverage MUST be >= the existing position's leverage.
   * If not met, the order will fail.
   *
   * This is SEPARATE from user preference (saved trade configuration):
   * - User preference (saved config): Default for NEW positions (no existing position)
   * - Protocol constraint: Required minimum for EXISTING positions
   *
   * Priority chain for leverage selection (enforced in usePerpsOrderForm):
   * 1. Navigation param (explicit user intent via route)
   * 2. Existing position leverage (protocol requirement - synced via hook effect)
   * 3. Saved trade config (user preference - from controller state)
   * 4. Default 3x (fallback)
   *
   * Note: Positions load asynchronously via WebSocket. usePerpsOrderForm handles
   * updating leverage after positions load to prevent protocol violations.
   */

  // Market data hook with automatic error toast handling (deferred)
  const { marketData, isLoading: isLoadingMarketData } = usePerpsMarketData({
    asset: isDataReady ? orderForm.asset : '', // Defer until UI renders
    showErrorToast: true,
  });

  // Check if user has an existing position for this market
  const { existingPosition: currentMarketPosition } = useHasExistingPosition({
    asset: orderForm.asset || '',
    loadOnMount: true,
  });

  // Check if market is at OI cap (zero network overhead - uses existing webData2 subscription)
  const { isAtCap: isAtOICap } = usePerpsOICap(orderForm.asset);

  // A/B Testing: Button color test (TAT-1937)
  const { variantName: buttonColorVariant } = usePerpsABTest({
    test: BUTTON_COLOR_TEST,
    featureFlagSelector: selectPerpsButtonColorTestVariant,
  });

  // Markets data for navigation
  const { markets } = usePerpsMarkets();

  const { showToast, PerpsToastOptions } = usePerpsToasts();

  // Find formatted market data for navigation
  const navigationMarketData = useMemo(
    () => markets.find((market) => market.symbol === orderForm.asset),
    [markets, orderForm.asset],
  );

  // Update ref when orderType changes
  useEffect(() => {
    orderTypeRef.current = orderForm.type;
  }, [orderForm.type]);

  const [isLeverageVisible, setIsLeverageVisible] = useState(false);
  const [isLimitPriceVisible, setIsLimitPriceVisible] = useState(false);
  const [isOrderTypeVisible, setIsOrderTypeVisible] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [shouldOpenLimitPrice, setShouldOpenLimitPrice] = useState(false);

  // Handle opening limit price modal after order type modal closes
  useEffect(() => {
    if (!isOrderTypeVisible && shouldOpenLimitPrice) {
      setIsLimitPriceVisible(true);
      setShouldOpenLimitPrice(false);
    }
  }, [isOrderTypeVisible, shouldOpenLimitPrice]);

  // Track trading screen viewed event using unified declarative API (main's event name)
  usePerpsEventTracking({
    eventName: MetaMetricsEvents.PERPS_SCREEN_VIEWED,
    properties: {
      [PerpsEventProperties.SCREEN_TYPE]: PerpsEventValues.SCREEN_TYPE.TRADING,
      [PerpsEventProperties.ASSET]: orderForm.asset,
      [PerpsEventProperties.DIRECTION]:
        orderForm.direction === 'long'
          ? PerpsEventValues.DIRECTION.LONG
          : PerpsEventValues.DIRECTION.SHORT,
    },
  });

  // Get real-time price data using new stream architecture (deferred)
  // Uses single WebSocket subscription with component-level debouncing
  const prices = usePerpsLivePrices({
    symbols: isDataReady ? [orderForm.asset] : [], // Defer subscription
    throttleMs: 1000,
  });
  const currentPrice = prices[orderForm.asset];

  // Get top of book data for maker/taker fee determination (deferred)
  const currentTopOfBook = usePerpsTopOfBook({
    symbol: isDataReady ? orderForm.asset : '', // Defer subscription
  });

  // Track screen load with unified hook (measure data loading, not initial render)
  usePerpsMeasurement({
    traceName: TraceName.PerpsOrderView,
    conditions: [isDataReady, !!currentPrice, !!account],
  });

  const assetData = useMemo(() => {
    if (!currentPrice) {
      return { price: 0, change: 0, markPrice: 0 };
    }
    const price = parseFloat(currentPrice.price || '0');
    const markPrice = parseFloat(currentPrice.markPrice || '0');
    const change = parseFloat(currentPrice.percentChange24h || '0');
    return {
      price: isNaN(price) ? 0 : price, // Mid price used for display
      markPrice: isNaN(markPrice) ? 0 : markPrice,
      change: isNaN(change) ? 0 : change,
    };
  }, [currentPrice]);

  // Calculate estimated fees using the new hook
  const feeResults = usePerpsOrderFees({
    orderType: orderForm.type,
    amount: orderForm.amount,
    coin: orderForm.asset,
    isClosing: false,
    limitPrice: orderForm.limitPrice,
    direction: orderForm.direction,
    currentAskPrice: currentTopOfBook?.bestAsk
      ? Number.parseFloat(currentTopOfBook.bestAsk)
      : undefined,
    currentBidPrice: currentTopOfBook?.bestBid
      ? Number.parseFloat(currentTopOfBook.bestBid)
      : undefined,
  });

  const estimatedFees = feeResults.totalFee;

  // Simple boolean calculation - no need for expensive memoization
  const hasValidAmount = parseFloat(orderForm.amount) > 0;

  // Get rewards state using the new hook
  const rewardsState = usePerpsRewards({
    feeResults,
    hasValidAmount,
    isFeesLoading: feeResults.isLoadingMetamaskFee,
    orderAmount: orderForm.amount,
  });

  // Track order type viewed event using unified declarative API (main's event structure)
  usePerpsEventTracking({
    eventName: MetaMetricsEvents.PERPS_UI_INTERACTION,
    conditions: [!!(orderForm.amount && parseFloat(orderForm.amount) > 0)],
    properties: {
      [PerpsEventProperties.INTERACTION_TYPE]:
        PerpsEventValues.INTERACTION_TYPE.ORDER_TYPE_VIEWED,
      [PerpsEventProperties.ASSET]: orderForm.asset,
      [PerpsEventProperties.DIRECTION]:
        orderForm.direction === 'long'
          ? PerpsEventValues.DIRECTION.LONG
          : PerpsEventValues.DIRECTION.SHORT,
      [PerpsEventProperties.ORDER_SIZE]: parseFloat(orderForm.amount || '0'),
      [PerpsEventProperties.LEVERAGE_USED]: parseFloat(
        String(orderForm.leverage),
      ),
      [PerpsEventProperties.ORDER_TYPE]: orderForm.type,
    },
  });

  // Real-time position size calculation - memoized to prevent recalculation
  const positionSize = useMemo(() => {
    // During loading, show '--' placeholder (consistent with other unavailable data displays)
    if (isLoadingMarketData) {
      return PERPS_CONSTANTS.FALLBACK_DATA_DISPLAY;
    }

    return calculatePositionSize({
      amount: orderForm.amount,
      price: assetData.price,
      // Defensive fallback if market data fails to load - prevents crashes
      // Real szDecimals should come from market data (varies by asset)
      szDecimals:
        marketData?.szDecimals ??
        DECIMAL_PRECISION_CONFIG.FALLBACK_SIZE_DECIMALS,
    });
  }, [
    orderForm.amount,
    assetData.price,
    marketData?.szDecimals,
    isLoadingMarketData,
  ]);

  const marginRequired = useMemo(() => {
    if (!isLoadingMarketData && orderForm.amount) {
      return calculateMarginRequired({
        amount: BigNumber(assetData.markPrice).times(positionSize).toString(),
        leverage: orderForm.leverage,
      });
    }
  }, [
    orderForm.amount,
    assetData.markPrice,
    orderForm.leverage,
    isLoadingMarketData,
    positionSize,
  ]);

  const { updatePositionTPSL } = usePerpsTrading();

  // Order execution using new hook
  const { placeOrder: executeOrder, isPlacing: isPlacingOrder } =
    usePerpsOrderExecution({
      onSuccess: (_position) => {
        showToast(
          PerpsToastOptions.orderManagement[orderForm.type].confirmed(
            orderForm.direction,
            positionSize,
            orderForm.asset,
          ),
        );
      },
      onError: (error) => {
        // Error is already captured in usePerpsOrderExecution hook
        // No need to capture again here to avoid duplicate Sentry reports
        showToast(
          PerpsToastOptions.orderManagement[orderForm.type].creationFailed(
            error,
          ),
        );
      },
    });

  useEffect(() => {
    if (isPlacingOrder && !hasShownSubmittedToastRef.current) {
      showToast(
        PerpsToastOptions.orderManagement[orderForm.type].submitted(
          orderForm.direction,
          positionSize,
          orderForm.asset,
        ),
      );
      hasShownSubmittedToastRef.current = true;
    } else if (!isPlacingOrder && hasShownSubmittedToastRef.current) {
      // Reset the flag when order placement is complete
      hasShownSubmittedToastRef.current = false;
    }
  }, [
    PerpsToastOptions.orderManagement,
    isPlacingOrder,
    orderForm.asset,
    orderForm.direction,
    orderForm.type,
    positionSize,
    showToast,
  ]);

  // Memoize liquidation price params to prevent infinite recalculation
  const liquidationPriceParams = useMemo(() => {
    // Use limit price for limit orders, market price for market orders
    const entryPrice =
      orderForm.type === 'limit' && orderForm.limitPrice
        ? parseFloat(orderForm.limitPrice)
        : assetData.price;

    return {
      entryPrice,
      leverage: orderForm.leverage,
      direction: orderForm.direction,
      asset: orderForm.asset,
    };
  }, [
    assetData.price,
    orderForm.leverage,
    orderForm.direction,
    orderForm.asset,
    orderForm.type,
    orderForm.limitPrice,
  ]);

  // Real-time liquidation price calculation
  const { liquidationPrice } = usePerpsLiquidationPrice(liquidationPriceParams);

  // Minimum order amount (in USD notional) for the current asset/network
  const { minimumOrderAmount } = useMinimumOrderAmount({
    asset: orderForm.asset,
  });

  /**
   * Calculate TP/SL display text with RoE percentages
   * Converts take profit and stop loss prices to RoE (Return on Equity) percentages
   *
   * @returns Formatted string like "TP 10%, SL 5%" or "TP off, SL off"
   *
   * For TP: Shows the RoE percentage gain at the take profit price
   * For SL: Shows the RoE percentage loss at the stop loss price
   */
  const tpSlDisplayText = useMemo(() => {
    const price = parseFloat(currentPrice?.price || '0');
    let tpDisplay = strings('perps.order.off');
    let slDisplay = strings('perps.order.off');

    // Calculate proper entry price based on order type
    const entryPrice =
      orderForm.type === 'limit' && orderForm.limitPrice
        ? parseFloat(orderForm.limitPrice)
        : price; // fallback to current price for market orders or when no limit price set

    if (orderForm.takeProfitPrice && price > 0 && orderForm.leverage) {
      const tpRoE = calculateRoEForPrice(
        orderForm.takeProfitPrice,
        true,
        false,
        {
          currentPrice: price,
          direction: orderForm.direction,
          leverage: orderForm.leverage,
          entryPrice,
        },
      );
      const absRoE = Math.abs(parseFloat(tpRoE || '0'));
      tpDisplay =
        absRoE > 0 ? `${absRoE.toFixed(0)}%` : strings('perps.order.off');
    }

    if (orderForm.stopLossPrice && price > 0 && orderForm.leverage) {
      const slRoE = calculateRoEForPrice(
        orderForm.stopLossPrice,
        false,
        false,
        {
          currentPrice: price,
          direction: orderForm.direction,
          leverage: orderForm.leverage,
          entryPrice,
        },
      );
      const absRoE = Math.abs(parseFloat(slRoE || '0'));
      slDisplay =
        absRoE > 0 ? `${absRoE.toFixed(0)}%` : strings('perps.order.off');
    }

    return `${strings('perps.order.tp')} ${tpDisplay}, ${strings(
      'perps.order.sl',
    )} ${slDisplay}`;
  }, [
    currentPrice?.price,
    orderForm.takeProfitPrice,
    orderForm.stopLossPrice,
    orderForm.leverage,
    orderForm.direction,
    orderForm.type,
    orderForm.limitPrice,
  ]);

  // Get existing position leverage for validation (protocol constraint)
  // Note: This is the same value used for initial form state, but needed here for validation
  const existingPositionLeverageForValidation =
    currentMarketPosition?.leverage?.value;

  // Order validation using new hook
  const orderValidation = usePerpsOrderValidation({
    orderForm,
    positionSize,
    assetPrice: assetData.price,
    availableBalance,
    marginRequired: marginRequired || '0',
    existingPositionLeverage: existingPositionLeverageForValidation,
    skipValidation: isInputFocused,
    originalUsdAmount: orderForm.amount, // Pass original USD input to prevent validation flash from price updates
  });

  // Filter out specific validation error(s) from display (similar to ClosePositionView pattern)
  // Hide the "Size must be a positive number" message from the error list
  const filteredErrors = useMemo(() => {
    const sizePositiveMsg = strings(
      'perps.errors.orderValidation.sizePositive',
    );
    return orderValidation.errors.filter((err) => err !== sizePositiveMsg);
  }, [orderValidation.errors]);

  // Handlers
  const handleTPSLPress = useCallback(() => {
    if (orderForm.type === 'limit' && !orderForm.limitPrice) {
      // We need to set a limit price for limit orders before TP/SL can be set
      showToast(PerpsToastOptions.formValidation.orderForm.limitPriceRequired);
      return;
    }

    navigation.navigate(Routes.PERPS.TPSL, {
      asset: orderForm.asset,
      currentPrice: assetData.price,
      direction: orderForm.direction,
      leverage: orderForm.leverage,
      orderType: orderForm.type,
      limitPrice: orderForm.limitPrice,
      initialTakeProfitPrice: orderForm.takeProfitPrice,
      initialStopLossPrice: orderForm.stopLossPrice,
      amount: orderForm.amount,
      szDecimals: marketData?.szDecimals,
      onConfirm: async (takeProfitPrice?: string, stopLossPrice?: string) => {
        // Use the same clearing approach as the "Off" button
        // If values are undefined or empty, ensure they're cleared properly
        const tpToSet = takeProfitPrice || undefined;
        const slToSet = stopLossPrice || undefined;

        setTakeProfitPrice(tpToSet);
        setStopLossPrice(slToSet);
      },
    });
  }, [
    PerpsToastOptions.formValidation.orderForm.limitPriceRequired,
    orderForm.limitPrice,
    orderForm.type,
    orderForm.asset,
    orderForm.direction,
    orderForm.leverage,
    orderForm.takeProfitPrice,
    orderForm.stopLossPrice,
    orderForm.amount,
    assetData.price,
    showToast,
    navigation,
    setTakeProfitPrice,
    setStopLossPrice,
    marketData?.szDecimals,
  ]);

  const handleAmountPress = () => {
    setIsInputFocused(true);
  };

  const handleKeypadChange = useCallback(
    ({ value }: { value: string; valueAsNumber: number }) => {
      inputMethodRef.current = 'keypad';
      // Enforce 9-digit limit (ignoring non-digits like separators)
      const digitCount = (value.match(/\d/g) || []).length;
      if (digitCount > 9) {
        return; // Ignore input that would exceed 9 digits
      }
      setAmount(value || '0');
    },
    [setAmount],
  );

  const handlePercentagePress = (percentage: number) => {
    inputMethodRef.current = 'percentage';
    handlePercentageAmount(percentage);
  };

  const handleMaxPress = () => {
    inputMethodRef.current = 'max';
    handleMaxAmount();
  };

  const handleDonePress = () => {
    setIsInputFocused(false);
  };

  // Clamp amount to the maximum allowed once the keypad/input is dismissed
  // Mirrors the PerpsClosePositionView behavior where values are normalized to valid limits
  useEffect(() => {
    if (!isInputFocused) {
      // Only clamp if input was from keypad (not from percentage/slider/max)
      // This prevents overwriting intentional user selections from other input methods
      if (inputMethodRef.current === 'keypad') {
        const currentAmount = parseFloat(orderForm.amount || '0');

        // If user-entered amount exceeds the max purchasable with current balance/leverage,
        // snap it down to the maximum once input is closed.
        if (currentAmount > maxPossibleAmount) {
          setAmount(String(maxPossibleAmount));
        }
      }
    }
    // CRITICAL: Only isInputFocused dependency prevents infinite loops
    // Other dependencies would cause re-clamping on WebSocket updates
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInputFocused]);

  const handlePlaceOrder = useCallback(async () => {
    if (isSubmittingRef.current) {
      return;
    }
    isSubmittingRef.current = true;

    orderStartTimeRef.current = Date.now();

    try {
      // Validation errors are shown in the UI
      if (!orderValidation.isValid) {
        const firstError = orderValidation.errors[0];
        showToast(
          PerpsToastOptions.formValidation.orderForm.validationError(
            firstError,
          ),
        );

        // Track validation failure as error encountered
        track(MetaMetricsEvents.PERPS_ERROR, {
          [PerpsEventProperties.ERROR_TYPE]:
            PerpsEventValues.ERROR_TYPE.VALIDATION,
          [PerpsEventProperties.ERROR_MESSAGE]: firstError,
        });

        isSubmittingRef.current = false; // Reset flag on early return
        return;
      }

      // Check for cross-margin position (MetaMask only supports isolated margin)
      if (currentMarketPosition?.leverage?.type === 'cross') {
        navigation.navigate(Routes.PERPS.MODALS.ROOT, {
          screen: Routes.PERPS.MODALS.CROSS_MARGIN_WARNING,
        });

        track(MetaMetricsEvents.PERPS_ERROR, {
          [PerpsEventProperties.ERROR_TYPE]:
            PerpsEventValues.ERROR_TYPE.VALIDATION,
          [PerpsEventProperties.ERROR_MESSAGE]:
            'Cross margin position detected',
        });

        isSubmittingRef.current = false;
        return;
      }

      // Navigate immediately BEFORE order execution (enhanced with monitoring parameters for data-driven tab selection)
      // Always monitor both orders and positions because:
      // - Market orders: Usually create positions immediately
      // - Limit orders: Usually stay pending BUT can fill immediately in volatile markets
      // Monitoring both ensures we route to the correct tab regardless of execution speed
      const monitorOrders = true;
      const monitorPositions = true;

      navigation.navigate(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.MARKET_DETAILS,
        params: {
          market: navigationMarketData,
          // Pass monitoring intent to destination screen for data-driven tab selection
          monitoringIntent: {
            asset: orderForm.asset,
            monitorOrders,
            monitorPositions,
          },
        },
      });

      const tpParams = orderForm.takeProfitPrice?.trim()
        ? { takeProfitPrice: orderForm.takeProfitPrice }
        : {};

      const slParams = orderForm.stopLossPrice?.trim()
        ? { stopLossPrice: orderForm.stopLossPrice }
        : {};

      // Execute order using the new hook
      // Only include TP/SL if they have valid, non-empty values
      //
      // HYBRID APPROACH: Pass both USD amount (source of truth) and size (for backward compatibility)
      // The provider will:
      // 1. Validate price hasn't moved beyond maxSlippageBps
      // 2. Recalculate size with fresh price from usdAmount
      // 3. Use the recalculated size for order execution
      const orderParams: OrderParams = {
        coin: orderForm.asset,
        isBuy: orderForm.direction === 'long',
        size: positionSize, // Kept for backward compatibility, provider recalculates from usdAmount
        orderType: orderForm.type,
        currentPrice: assetData.price,
        leverage: orderForm.leverage,
        // USD as source of truth (hybrid approach)
        usdAmount: orderForm.amount, // USD amount (primary source of truth, provider calculates size from this)
        priceAtCalculation: assetData.price, // Price snapshot when size was calculated (for slippage validation)
        maxSlippageBps:
          orderForm.type === 'limit'
            ? ORDER_SLIPPAGE_CONFIG.DEFAULT_LIMIT_SLIPPAGE_BPS // 1% for limit orders
            : ORDER_SLIPPAGE_CONFIG.DEFAULT_MARKET_SLIPPAGE_BPS, // 3% for market orders
        // Only add TP/SL/Limit if they are truthy and/or not empty strings
        ...(orderForm.type === 'limit' && orderForm.limitPrice
          ? { price: orderForm.limitPrice }
          : {}),
        ...tpParams,
        ...slParams,
        // Add tracking data for MetaMetrics events
        trackingData: {
          marginUsed: Number(marginRequired),
          totalFee: feeResults.totalFee,
          marketPrice: assetData.price,
          metamaskFee: feeResults.metamaskFee,
          metamaskFeeRate: feeResults.metamaskFeeRate,
          feeDiscountPercentage: feeResults.feeDiscountPercentage,
          estimatedPoints: feeResults.estimatedPoints,
          inputMethod: inputMethodRef.current,
        },
      };

      // Check if TP/SL should be handled separately (for new positions or position flips)
      const shouldHandleTPSLSeparately =
        (orderForm.takeProfitPrice || orderForm.stopLossPrice) &&
        ((!currentMarketPosition && orderForm.type === 'market') ||
          (currentMarketPosition &&
            willFlipPosition(currentMarketPosition, orderParams)));

      if (shouldHandleTPSLSeparately) {
        // Execute order without TP/SL first, then update position TP/SL
        const orderWithoutTPSL = { ...orderParams };
        delete orderWithoutTPSL.takeProfitPrice;
        delete orderWithoutTPSL.stopLossPrice;

        await executeOrder(orderWithoutTPSL);
        await updatePositionTPSL({
          coin: orderForm.asset,
          takeProfitPrice: orderForm.takeProfitPrice,
          stopLossPrice: orderForm.stopLossPrice,
        });
      } else {
        await executeOrder(orderParams);
      }
    } finally {
      // Always reset submission flag
      isSubmittingRef.current = false;
    }
  }, [
    orderValidation.isValid,
    orderValidation.errors,
    track,
    orderForm.asset,
    orderForm.direction,
    orderForm.type,
    orderForm.leverage,
    orderForm.limitPrice,
    orderForm.takeProfitPrice,
    orderForm.stopLossPrice,
    orderForm.amount,
    positionSize,
    assetData.price,
    navigation,
    navigationMarketData,
    currentMarketPosition,
    executeOrder,
    showToast,
    PerpsToastOptions.formValidation.orderForm,
    updatePositionTPSL,
    marginRequired,
    feeResults.totalFee,
    feeResults.metamaskFee,
    feeResults.metamaskFeeRate,
    feeResults.feeDiscountPercentage,
    feeResults.estimatedPoints,
  ]);

  // Memoize the tooltip handlers to prevent recreating them on every render
  const handleTooltipPress = useCallback(
    (contentKey: PerpsTooltipContentKey) => {
      setSelectedTooltip(contentKey);
    },
    [],
  );

  const handleTooltipClose = useCallback(() => {
    setSelectedTooltip(null);
  }, []);

  // Use the same calculation as handleMaxAmount in usePerpsOrderForm to avoid insufficient funds error
  const amountTimesLeverage = Math.floor(availableBalance * orderForm.leverage);

  const isAmountDisabled = amountTimesLeverage < minimumOrderAmount;

  // Button label: show Insufficient funds when user's max notional is below minimum
  const orderButtonKey =
    orderForm.direction === 'long'
      ? 'perps.order.button.long'
      : 'perps.order.button.short';
  const isInsufficientFunds =
    !isLoadingAccount && amountTimesLeverage < minimumOrderAmount;
  const placeOrderLabel = isInsufficientFunds
    ? strings('perps.order.validation.insufficient_funds')
    : strings(orderButtonKey, {
        asset: getPerpsDisplaySymbol(orderForm.asset),
      });

  const doesStopLossRiskLiquidation = Boolean(
    orderForm.stopLossPrice &&
      !isStopLossSafeFromLiquidation(
        orderForm.stopLossPrice,
        liquidationPrice,
        orderForm.direction,
      ),
  );

  let rewardAnimationState = RewardAnimationState.Idle;
  if (rewardsState.isLoading) {
    rewardAnimationState = RewardAnimationState.Loading;
  } else if (rewardsState.hasError) {
    rewardAnimationState = RewardAnimationState.ErrorState;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <PerpsOrderHeader
        asset={getPerpsDisplaySymbol(orderForm.asset)}
        price={assetData.price}
        priceChange={assetData.change}
        orderType={orderForm.type}
        direction={orderForm.direction}
        onOrderTypePress={() => setIsOrderTypeVisible(true)}
      />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Amount Display */}
        <PerpsAmountDisplay
          amount={orderForm.amount}
          showWarning={!isLoadingAccount && availableBalance === 0}
          onPress={handleAmountPress}
          isActive={isInputFocused}
          tokenAmount={positionSize}
          tokenSymbol={getPerpsDisplaySymbol(orderForm.asset)}
          hasError={availableBalance > 0 && !!filteredErrors.length}
          isLoading={isLoadingAccount}
        />

        {/* Amount Slider - Hide when keypad is active */}
        {!isInputFocused && (
          <View style={styles.sliderSection}>
            <PerpsSlider
              value={parseFloat(orderForm.amount || '0')}
              onValueChange={(value) => {
                inputMethodRef.current = 'slider';
                const amount = Math.floor(value).toString();
                setAmount(amount);
              }}
              minimumValue={0}
              maximumValue={maxPossibleAmount}
              step={1}
              showPercentageLabels
              disabled={isAmountDisabled}
            />
          </View>
        )}

        {/* Order Details */}
        {!isInputFocused && (
          <View style={styles.detailsWrapper}>
            {/* Leverage */}
            <View style={[styles.detailItem, styles.detailItemFirst]}>
              <TouchableOpacity onPress={() => setIsLeverageVisible(true)}>
                <ListItem style={styles.detailItemWrapper}>
                  <ListItemColumn widthType={WidthType.Fill}>
                    <View style={styles.detailLeft}>
                      <Text
                        variant={TextVariant.BodyMD}
                        color={TextColor.Alternative}
                      >
                        {strings('perps.order.leverage')}
                      </Text>
                      <TouchableOpacity
                        onPress={() => handleTooltipPress('leverage')}
                        style={styles.infoIcon}
                      >
                        <Icon
                          name={IconName.Info}
                          size={IconSize.Sm}
                          color={IconColor.Alternative}
                          testID={PerpsOrderViewSelectorsIDs.LEVERAGE_INFO_ICON}
                        />
                      </TouchableOpacity>
                    </View>
                  </ListItemColumn>
                  <ListItemColumn widthType={WidthType.Auto}>
                    <Text
                      variant={TextVariant.BodyMD}
                      color={TextColor.Default}
                    >
                      {isLoadingMarketData ? '...' : `${orderForm.leverage}x`}
                    </Text>
                  </ListItemColumn>
                </ListItem>
              </TouchableOpacity>
            </View>

            {/* Limit price - only show for limit orders */}
            {orderForm.type === 'limit' && (
              <View style={styles.detailItem}>
                <TouchableOpacity onPress={() => setIsLimitPriceVisible(true)}>
                  <ListItem style={styles.detailItemWrapper}>
                    <ListItemColumn widthType={WidthType.Fill}>
                      <Text
                        variant={TextVariant.BodyMD}
                        color={TextColor.Alternative}
                      >
                        {strings('perps.order.limit_price')}
                      </Text>
                    </ListItemColumn>
                    <ListItemColumn widthType={WidthType.Auto}>
                      <Text
                        variant={TextVariant.BodyMD}
                        color={TextColor.Default}
                      >
                        {orderForm.limitPrice !== undefined &&
                        orderForm.limitPrice !== null
                          ? formatPerpsFiat(orderForm.limitPrice, {
                              ranges: PRICE_RANGES_UNIVERSAL,
                            })
                          : 'Set price'}
                      </Text>
                    </ListItemColumn>
                  </ListItem>
                </TouchableOpacity>
              </View>
            )}

            {/* Combined TP/SL row - Hidden when modifying existing position */}
            {!hideTPSL && (
              <View style={[styles.detailItem, styles.detailItemLast]}>
                <TouchableOpacity
                  onPress={handleTPSLPress}
                  testID={PerpsOrderViewSelectorsIDs.STOP_LOSS_BUTTON}
                >
                  <ListItem style={styles.detailItemWrapper}>
                    <ListItemColumn widthType={WidthType.Fill}>
                      <View style={styles.detailLeft}>
                        <Text
                          variant={TextVariant.BodyMD}
                          color={TextColor.Alternative}
                        >
                          {strings('perps.order.tp_sl')}
                        </Text>
                        <TouchableOpacity
                          onPress={() => handleTooltipPress('tp_sl')}
                          style={styles.infoIcon}
                        >
                          <Icon
                            name={IconName.Info}
                            size={IconSize.Sm}
                            color={IconColor.Alternative}
                            testID={PerpsOrderViewSelectorsIDs.TP_SL_INFO_ICON}
                          />
                        </TouchableOpacity>
                      </View>
                    </ListItemColumn>
                    <ListItemColumn widthType={WidthType.Auto}>
                      <Text
                        variant={TextVariant.BodyMD}
                        color={TextColor.Default}
                      >
                        {tpSlDisplayText}
                      </Text>
                    </ListItemColumn>
                  </ListItem>
                </TouchableOpacity>
              </View>
            )}
            {!hideTPSL && doesStopLossRiskLiquidation && (
              <View style={styles.stopLossLiquidationWarning}>
                <Text variant={TextVariant.BodySM} color={TextColor.Error}>
                  {strings('perps.tpsl.stop_loss_order_view_warning', {
                    direction:
                      orderForm.direction === 'long'
                        ? strings('perps.tpsl.below')
                        : strings('perps.tpsl.above'),
                  })}
                </Text>
              </View>
            )}
          </View>
        )}
        {/* Info Section */}
        <View
          style={[
            styles.infoSection,
            // TODO: Remove negative margin
            // eslint-disable-next-line react-native/no-inline-styles
            { marginBottom: orderValidation.errors.length > 0 ? 16 : -16 },
            // eslint-disable-next-line react-native/no-inline-styles
            { marginTop: isInputFocused ? 16 : 0 },
          ]}
        >
          <View style={styles.infoRow}>
            <View style={styles.detailLeft}>
              <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
                {strings('perps.order.margin')}
              </Text>
              <TouchableOpacity
                onPress={() => handleTooltipPress('margin')}
                style={styles.infoIcon}
              >
                <Icon
                  name={IconName.Info}
                  size={IconSize.Sm}
                  color={IconColor.Alternative}
                  testID={PerpsOrderViewSelectorsIDs.MARGIN_INFO_ICON}
                />
              </TouchableOpacity>
            </View>
            <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
              {marginRequired !== undefined && marginRequired !== null
                ? formatPerpsFiat(marginRequired, {
                    ranges: PRICE_RANGES_MINIMAL_VIEW,
                  })
                : PERPS_CONSTANTS.FALLBACK_DATA_DISPLAY}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.detailLeft}>
              <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
                {strings('perps.order.liquidation_price')}
              </Text>
              <TouchableOpacity
                onPress={() => handleTooltipPress('liquidation_price')}
                style={styles.infoIcon}
              >
                <Icon
                  name={IconName.Info}
                  size={IconSize.Sm}
                  color={IconColor.Alternative}
                  testID={
                    PerpsOrderViewSelectorsIDs.LIQUIDATION_PRICE_INFO_ICON
                  }
                />
              </TouchableOpacity>
            </View>
            <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
              {hasValidAmount
                ? formatPerpsFiat(liquidationPrice, {
                    ranges: PRICE_RANGES_UNIVERSAL,
                  })
                : PERPS_CONSTANTS.FALLBACK_DATA_DISPLAY}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <View style={styles.detailLeft}>
              <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
                {strings('perps.order.fees')}
              </Text>
              <TouchableOpacity
                onPress={() => handleTooltipPress('fees')}
                style={styles.infoIcon}
              >
                <Icon
                  name={IconName.Info}
                  size={IconSize.Sm}
                  color={IconColor.Alternative}
                  testID={PerpsOrderViewSelectorsIDs.FEES_INFO_ICON}
                />
              </TouchableOpacity>
            </View>
            <PerpsFeesDisplay
              feeDiscountPercentage={rewardsState.feeDiscountPercentage}
              formatFeeText={
                !hasValidAmount || feeResults.isLoadingMetamaskFee
                  ? PERPS_CONSTANTS.FALLBACK_DATA_DISPLAY
                  : formatPerpsFiat(estimatedFees, {
                      ranges: PRICE_RANGES_MINIMAL_VIEW,
                    })
              }
              variant={TextVariant.BodySM}
            />
          </View>

          {/* Rewards Points Estimation */}
          {rewardsState.shouldShowRewardsRow &&
            rewardsState.estimatedPoints !== undefined &&
            (rewardsState.accountOptedIn ||
              (rewardsState.accountOptedIn === false &&
                rewardsState.account !== undefined)) && (
              <View style={styles.infoRow}>
                <View style={styles.detailLeft}>
                  <Text
                    variant={TextVariant.BodyMD}
                    color={TextColor.Alternative}
                  >
                    {strings('perps.estimated_points')}
                  </Text>
                  <TouchableOpacity
                    onPress={() => handleTooltipPress('points')}
                    style={styles.infoIcon}
                  >
                    <Icon
                      name={IconName.Info}
                      size={IconSize.Sm}
                      color={IconColor.Alternative}
                    />
                  </TouchableOpacity>
                </View>
                <View style={styles.pointsRightContainer}>
                  {rewardsState.accountOptedIn ? (
                    <RewardsAnimations
                      value={rewardsState.estimatedPoints ?? 0}
                      bonusBips={rewardsState.bonusBips}
                      shouldShow={rewardsState.shouldShowRewardsRow}
                      infoOnPress={() =>
                        openTooltipModal(
                          strings('perps.points_error'),
                          strings('perps.points_error_content'),
                        )
                      }
                      state={rewardAnimationState}
                    />
                  ) : (
                    <AddRewardsAccount
                      account={rewardsState.account ?? undefined}
                    />
                  )}
                </View>
              </View>
            )}
        </View>
      </ScrollView>
      {/* Keypad Section - Show when input is focused */}
      {isInputFocused && (
        <View
          style={styles.bottomSection}
          testID={PerpsOrderViewSelectorsIDs.KEYPAD}
        >
          <View style={styles.percentageButtonsContainer}>
            <Button
              variant={ButtonVariants.Secondary}
              size={ButtonSize.Md}
              label="25%"
              onPress={() => handlePercentagePress(0.25)}
              style={styles.percentageButton}
            />
            <Button
              variant={ButtonVariants.Secondary}
              size={ButtonSize.Md}
              label="50%"
              onPress={() => handlePercentagePress(0.5)}
              style={styles.percentageButton}
            />
            <Button
              variant={ButtonVariants.Secondary}
              size={ButtonSize.Md}
              label={strings('perps.deposit.max_button')}
              onPress={handleMaxPress}
              style={styles.percentageButton}
            />
            <Button
              variant={ButtonVariants.Secondary}
              size={ButtonSize.Md}
              label={strings('perps.deposit.done_button')}
              onPress={handleDonePress}
              style={styles.percentageButton}
            />
          </View>

          <Keypad
            value={orderForm.amount}
            onChange={handleKeypadChange}
            currency="USD"
            decimals={0}
            style={styles.keypad}
          />
        </View>
      )}
      {/* OI Cap Warning - Shows when market is at capacity */}
      {!isInputFocused && isAtOICap && (
        <PerpsOICapWarning symbol={orderForm.asset} variant="banner" />
      )}
      {/* Fixed Place Order Button - Hide when keypad is active or at OI cap */}
      {!isInputFocused && !isAtOICap && (
        <View style={fixedBottomContainerStyle}>
          {filteredErrors.length > 0 &&
            !isLoadingMarketData &&
            currentPrice != null &&
            !orderValidation.isValidating && (
              <View style={styles.validationContainer}>
                {filteredErrors.map((error) => (
                  <Text
                    key={error}
                    variant={TextVariant.BodySM}
                    color={TextColor.Error}
                  >
                    {error}
                  </Text>
                ))}
              </View>
            )}

          {buttonColorVariant === 'monochrome' ? (
            <Button
              variant={ButtonVariants.Secondary}
              size={ButtonSize.Lg}
              width={ButtonWidthTypes.Full}
              label={placeOrderLabel}
              onPress={handlePlaceOrder}
              isDisabled={
                !orderValidation.isValid ||
                isPlacingOrder ||
                doesStopLossRiskLiquidation ||
                isAtOICap
              }
              loading={isPlacingOrder}
              testID={PerpsOrderViewSelectorsIDs.PLACE_ORDER_BUTTON}
            />
          ) : (
            <ButtonSemantic
              severity={
                orderForm.direction === 'long'
                  ? ButtonSemanticSeverity.Success
                  : ButtonSemanticSeverity.Danger
              }
              onPress={handlePlaceOrder}
              isFullWidth
              size={ButtonSizeRNDesignSystem.Lg}
              isDisabled={
                !orderValidation.isValid ||
                isPlacingOrder ||
                doesStopLossRiskLiquidation ||
                isAtOICap
              }
              isLoading={isPlacingOrder}
              testID={PerpsOrderViewSelectorsIDs.PLACE_ORDER_BUTTON}
            >
              {placeOrderLabel}
            </ButtonSemantic>
          )}
        </View>
      )}
      {/* Leverage Selector */}
      <PerpsLeverageBottomSheet
        isVisible={isLeverageVisible}
        onClose={() => setIsLeverageVisible(false)}
        onConfirm={(leverage, inputMethod) => {
          setLeverage(leverage);

          // Check if current amount exceeds new maximum value and adjust if needed
          const currentAmount = parseFloat(orderForm.amount || '0');
          const newMaxAmount = availableBalance * leverage;
          if (currentAmount > newMaxAmount) {
            setAmount(Math.floor(newMaxAmount).toString());
          }

          setIsLeverageVisible(false);

          // Track leverage change (consolidated here to avoid duplicate tracking)
          const eventProperties: Record<string, string | number> = {
            [PerpsEventProperties.ASSET]: orderForm.asset,
            [PerpsEventProperties.DIRECTION]:
              orderForm.direction === 'long'
                ? PerpsEventValues.DIRECTION.LONG
                : PerpsEventValues.DIRECTION.SHORT,
            [PerpsEventProperties.LEVERAGE_USED]: leverage,
            previousLeverage: orderForm.leverage,
          };

          // Add input method if provided
          if (inputMethod) {
            eventProperties[PerpsEventProperties.INPUT_METHOD] =
              inputMethod === 'slider'
                ? PerpsEventValues.INPUT_METHOD.SLIDER
                : PerpsEventValues.INPUT_METHOD.PRESET;
          }

          track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
            ...eventProperties,
            [PerpsEventProperties.INTERACTION_TYPE]:
              PerpsEventValues.INTERACTION_TYPE.SETTING_CHANGED,
            [PerpsEventProperties.SETTING_TYPE]:
              PerpsEventValues.SETTING_TYPE.LEVERAGE,
          });
        }}
        leverage={orderForm.leverage}
        minLeverage={1}
        maxLeverage={
          marketData?.maxLeverage || PERPS_CONSTANTS.DEFAULT_MAX_LEVERAGE
        }
        currentPrice={assetData.price}
        direction={orderForm.direction}
        asset={orderForm.asset}
        limitPrice={orderForm.limitPrice}
        orderType={orderForm.type}
      />
      {/* Limit Price Bottom Sheet */}
      <PerpsLimitPriceBottomSheet
        isVisible={isLimitPriceVisible}
        onClose={() => {
          setIsLimitPriceVisible(false);
          // If user dismisses without entering a price, revert order type to market (parity with close position view)
          if (orderForm.type === 'limit' && !orderForm.limitPrice) {
            setOrderType('market');
            // Use existing toast option used in close position view for consistency
            // Path: PerpsToastOptions.positionManagement.closePosition.limitClose.partial.switchToMarketOrderMissingLimitPrice
            const revertToast =
              PerpsToastOptions.positionManagement.closePosition.limitClose
                .partial.switchToMarketOrderMissingLimitPrice;
            showToast(revertToast);
          }
        }}
        onConfirm={(limitPrice) => {
          setLimitPrice(limitPrice);
          setIsLimitPriceVisible(false);
        }}
        asset={orderForm.asset}
        limitPrice={orderForm.limitPrice}
        currentPrice={assetData.price}
        direction={orderForm.direction}
      />
      {/* Order Type Bottom Sheet */}
      <PerpsOrderTypeBottomSheet
        isVisible={isOrderTypeVisible}
        onClose={() => setIsOrderTypeVisible(false)}
        onSelect={(type) => {
          setOrderType(type);
          // Clear limit price when switching to market order
          if (type === 'market') {
            setLimitPrice(undefined);
          } else if (type === 'limit' && !orderForm.limitPrice) {
            // Flag to open limit price modal after this modal closes
            setShouldOpenLimitPrice(true);
          }
          setIsOrderTypeVisible(false);
        }}
        currentOrderType={orderForm.type}
        asset={orderForm.asset}
        direction={orderForm.direction}
      />
      {selectedTooltip && (
        <PerpsBottomSheetTooltip
          isVisible
          onClose={handleTooltipClose}
          contentKey={selectedTooltip}
          testID={PerpsOrderViewSelectorsIDs.BOTTOM_SHEET_TOOLTIP}
          key={selectedTooltip}
          data={
            selectedTooltip === 'fees'
              ? {
                  metamaskFeeRate: feeResults.metamaskFeeRate,
                  protocolFeeRate: feeResults.protocolFeeRate,
                  originalMetamaskFeeRate: feeResults.originalMetamaskFeeRate,
                  feeDiscountPercentage: feeResults.feeDiscountPercentage,
                }
              : undefined
          }
        />
      )}
    </SafeAreaView>
  );
};

// // Enable WDYR tracking BEFORE wrapping with React.memo
// if (__DEV__) {
//   // eslint-disable-next-line @typescript-eslint/no-explicit-any
//   (PerpsOrderViewContentBase as any).whyDidYouRender = {
//     logOnDifferentValues: true,
//     customName: 'PerpsOrderViewContent',
//   };
// }

// Now wrap with React.memo AFTER setting whyDidYouRender
const PerpsOrderViewContent = React.memo(PerpsOrderViewContentBase);

// Set display name for debugging
PerpsOrderViewContent.displayName = 'PerpsOrderViewContent';
// Main component that wraps content with context providers
const PerpsOrderView: React.FC = () => {
  const route = useRoute<RouteProp<{ params: OrderRouteParams }, 'params'>>();

  // Get navigation params to pass to context provider
  const {
    direction = 'long',
    asset = 'BTC',
    amount: paramAmount,
    leverage: paramLeverage,
    existingPosition,
    hideTPSL = false,
  } = route.params || {};

  return (
    <PerpsOrderProvider
      initialAsset={asset}
      initialDirection={direction}
      initialAmount={paramAmount}
      initialLeverage={paramLeverage}
      existingPosition={existingPosition}
    >
      <PerpsOrderViewContent hideTPSL={hideTPSL} />
    </PerpsOrderProvider>
  );
};

export default PerpsOrderView;
