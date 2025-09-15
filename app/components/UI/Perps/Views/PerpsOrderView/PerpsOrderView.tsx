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
import { SafeAreaView } from 'react-native-safe-area-context';
import { PerpsOrderViewSelectorsIDs } from '../../../../../../e2e/selectors/Perps/Perps.selectors';

import { strings } from '../../../../../../locales/i18n';
import Button, {
  ButtonSize,
  ButtonVariants,
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
import Routes from '../../../../../constants/navigation/Routes';
import { useTheme } from '../../../../../util/theme';
import {
  endTrace,
  trace,
  TraceName,
  TraceOperation,
} from '../../../../../util/trace';
import Keypad from '../../../../Base/Keypad';
import { MetaMetricsEvents } from '../../../../hooks/useMetrics';
import PerpsAmountDisplay from '../../components/PerpsAmountDisplay';
import PerpsBottomSheetTooltip from '../../components/PerpsBottomSheetTooltip';
import { PerpsTooltipContentKey } from '../../components/PerpsBottomSheetTooltip/PerpsBottomSheetTooltip.types';
import PerpsLeverageBottomSheet from '../../components/PerpsLeverageBottomSheet';
import PerpsLimitPriceBottomSheet from '../../components/PerpsLimitPriceBottomSheet';
import PerpsOrderHeader from '../../components/PerpsOrderHeader';
import PerpsOrderTypeBottomSheet from '../../components/PerpsOrderTypeBottomSheet';
import PerpsSlider from '../../components/PerpsSlider';
import PerpsTPSLBottomSheet from '../../components/PerpsTPSLBottomSheet';
import {
  PerpsEventProperties,
  PerpsEventValues,
} from '../../constants/eventNames';
import { PerpsMeasurementName } from '../../constants/performanceMetrics';
import { PERPS_CONSTANTS } from '../../constants/perpsConfig';
import {
  PerpsOrderProvider,
  usePerpsOrderContext,
} from '../../contexts/PerpsOrderContext';
import type {
  OrderParams,
  OrderType,
  PerpsNavigationParamList,
} from '../../controllers/types';
import {
  usePerpsAccount,
  usePerpsLiquidationPrice,
  usePerpsMarketData,
  usePerpsMarkets,
  usePerpsOrderExecution,
  usePerpsOrderFees,
  usePerpsOrderValidation,
  usePerpsPerformance,
  useMinimumOrderAmount,
  usePerpsToasts,
} from '../../hooks';
import { usePerpsLivePrices } from '../../hooks/stream';
import { usePerpsEventTracking } from '../../hooks/usePerpsEventTracking';
import { usePerpsScreenTracking } from '../../hooks/usePerpsScreenTracking';
import {
  formatPerpsFiat,
  formatPrice,
  PRICE_RANGES_DETAILED_VIEW,
  PRICE_RANGES_MINIMAL_VIEW,
} from '../../utils/formatUtils';
import { calculatePositionSize } from '../../utils/orderCalculations';
import {
  calculateRoEForPrice,
  isStopLossSafeFromLiquidation,
} from '../../utils/tpslValidation';
import createStyles from './PerpsOrderView.styles';
import ButtonSemantic, {
  ButtonSemanticSeverity,
} from '../../../../../component-library/components-temp/Buttons/ButtonSemantic';
import { ButtonSize as ButtonSizeRNDesignSystem } from '@metamask/design-system-react-native';

// Navigation params interface
interface OrderRouteParams {
  direction?: 'long' | 'short';
  asset?: string;
  amount?: string;
  leverage?: number;
  // Modal return values
  leverageUpdate?: number;
  orderTypeUpdate?: OrderType;
  tpslUpdate?: {
    takeProfitPrice?: string;
    stopLossPrice?: string;
  };
  limitPriceUpdate?: string;
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
const PerpsOrderViewContentBase: React.FC = () => {
  const navigation = useNavigation<NavigationProp<PerpsNavigationParamList>>();
  const { colors } = useTheme();

  const styles = createStyles(colors);

  const [selectedTooltip, setSelectedTooltip] =
    useState<PerpsTooltipContentKey | null>(null);

  const { track } = usePerpsEventTracking();
  const { startMeasure, endMeasure } = usePerpsPerformance();

  // Ref to access current orderType in callbacks
  const orderTypeRef = useRef<OrderType>('market');

  const isSubmittingRef = useRef(false);
  const hasShownSubmittedToastRef = useRef(false);

  const cachedAccountState = usePerpsAccount();

  // Get real HyperLiquid USDC balance
  const availableBalance = parseFloat(
    cachedAccountState?.availableBalance?.toString() || '0',
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
    calculations,
  } = usePerpsOrderContext();

  // Market data hook - now uses orderForm.asset from context
  const {
    marketData,
    isLoading: isLoadingMarketData,
    error: marketDataError,
  } = usePerpsMarketData(orderForm.asset);

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

  const [isTPSLVisible, setIsTPSLVisible] = useState(false);
  const [isLeverageVisible, setIsLeverageVisible] = useState(false);
  const [isLimitPriceVisible, setIsLimitPriceVisible] = useState(false);
  const [isOrderTypeVisible, setIsOrderTypeVisible] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [shouldOpenLimitPrice, setShouldOpenLimitPrice] = useState(false);
  // Calculate estimated fees using the new hook
  const feeResults = usePerpsOrderFees({
    orderType: orderForm.type,
    amount: orderForm.amount,
    isMaker: false, // Conservative estimate for UI display
  });
  const estimatedFees = feeResults.totalFee;

  // Tracking refs for one-time events
  const hasTrackedTradingView = useRef(false);
  const hasTrackedOrderTypeView = useRef(false);

  useEffect(() => {
    trace({
      name: TraceName.PerpsOrderView,
      op: TraceOperation.UIStartup,
      tags: {
        screen: 'perps_order_view',
        market: orderForm.asset,
        direction: orderForm.direction,
        orderType: orderForm.type,
      },
    });
  }, [orderForm.asset, orderForm.direction, orderForm.type]);

  // Track balance display updates - measure after actual render
  useEffect(() => {
    if (cachedAccountState?.availableBalance !== undefined) {
      startMeasure(PerpsMeasurementName.ASSET_BALANCES_DISPLAYED_UPDATED);
      // Use requestAnimationFrame to measure after actual DOM update
      requestAnimationFrame(() => {
        endMeasure(PerpsMeasurementName.ASSET_BALANCES_DISPLAYED_UPDATED);
      });
    }
  }, [cachedAccountState?.availableBalance, startMeasure, endMeasure]);

  // Clean up trace on unmount
  useEffect(
    () => () => {
      endTrace({
        name: TraceName.PerpsOrderView,
      });
    },
    [],
  );

  // Handle opening limit price modal after order type modal closes
  useEffect(() => {
    if (!isOrderTypeVisible && shouldOpenLimitPrice) {
      setIsLimitPriceVisible(true);
      setShouldOpenLimitPrice(false);
    }
  }, [isOrderTypeVisible, shouldOpenLimitPrice]);

  // Track dashboard view event separately with proper dependencies - only once
  useEffect(() => {
    if (!hasTrackedTradingView.current) {
      const eventProps = {
        [PerpsEventProperties.TIMESTAMP]: Date.now(),
        [PerpsEventProperties.ASSET]: orderForm.asset,
        [PerpsEventProperties.DIRECTION]:
          orderForm.direction === 'long'
            ? PerpsEventValues.DIRECTION.LONG
            : PerpsEventValues.DIRECTION.SHORT,
      };

      track(MetaMetricsEvents.PERPS_TRADING_SCREEN_VIEWED, eventProps);

      hasTrackedTradingView.current = true;
    }
  }, [orderForm.asset, orderForm.direction, track]);

  // Get real-time price data using new stream architecture
  // Uses single WebSocket subscription with component-level debouncing
  const prices = usePerpsLivePrices({
    symbols: [orderForm.asset],
    throttleMs: 1000,
  });
  const currentPrice = prices[orderForm.asset];

  // Track screen load with centralized hook
  usePerpsScreenTracking({
    screenName: PerpsMeasurementName.TRADE_SCREEN_LOADED,
    dependencies: [currentPrice, cachedAccountState],
  });

  const assetData = useMemo(() => {
    if (!currentPrice) {
      return { price: 0, change: 0 };
    }
    const price = parseFloat(currentPrice.price || '0');
    const change = parseFloat(currentPrice.percentChange24h || '0');
    return {
      price: isNaN(price) ? 0 : price, // Mid price used for display
      change: isNaN(change) ? 0 : change,
    };
  }, [currentPrice]);

  // Screen load tracking is handled by usePerpsScreenTracking above

  // Track order input viewed - only once
  useEffect(() => {
    if (
      orderForm.amount &&
      parseFloat(orderForm.amount) > 0 &&
      !hasTrackedOrderTypeView.current
    ) {
      track(MetaMetricsEvents.PERPS_ORDER_TYPE_VIEWED, {
        [PerpsEventProperties.ASSET]: orderForm.asset,
        [PerpsEventProperties.DIRECTION]:
          orderForm.direction === 'long'
            ? PerpsEventValues.DIRECTION.LONG
            : PerpsEventValues.DIRECTION.SHORT,
        [PerpsEventProperties.ORDER_SIZE]: parseFloat(orderForm.amount),
        [PerpsEventProperties.LEVERAGE_USED]: orderForm.leverage,
        [PerpsEventProperties.ORDER_TYPE]: orderForm.type,
      });
      hasTrackedOrderTypeView.current = true;
    }
  }, [
    orderForm.direction,
    orderForm.amount,
    orderForm.leverage,
    orderForm.asset,
    orderForm.type,
    track,
  ]);

  // Show error toast if market data is not available
  useEffect(() => {
    if (marketDataError) {
      showToast(
        PerpsToastOptions.dataFetching.market.error.marketDataUnavailable(
          orderForm.asset,
        ),
      );
    }
  }, [
    marketDataError,
    orderForm.asset,
    navigation,
    showToast,
    PerpsToastOptions.dataFetching.market.error,
  ]);

  // Real-time position size calculation - memoized to prevent recalculation
  const positionSize = useMemo(
    () =>
      calculatePositionSize({
        amount: orderForm.amount,
        price: assetData.price,
        szDecimals: marketData?.szDecimals,
      }),
    [orderForm.amount, assetData.price, marketData?.szDecimals],
  );

  // Order execution using new hook
  const { placeOrder: executeOrder, isPlacing: isPlacingOrder } =
    usePerpsOrderExecution({
      onSuccess: (position) => {
        // Track successful position open
        track(MetaMetricsEvents.PERPS_TRADE_TRANSACTION_EXECUTED, {
          [PerpsEventProperties.ASSET]: orderForm.asset,
          [PerpsEventProperties.DIRECTION]:
            orderForm.direction === 'long'
              ? PerpsEventValues.DIRECTION.LONG
              : PerpsEventValues.DIRECTION.SHORT,
          [PerpsEventProperties.ORDER_TYPE]: orderTypeRef.current,
          [PerpsEventProperties.LEVERAGE]: orderForm.leverage,
          [PerpsEventProperties.ORDER_SIZE]: position?.size || orderForm.amount,
          [PerpsEventProperties.ASSET_PRICE]: position?.entryPrice,
          [PerpsEventProperties.MARGIN_USED]: position?.marginUsed,
        });

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

  // Get margin required from form calculations
  const marginRequired = calculations.marginRequired;

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
      const tpRoE = calculateRoEForPrice(orderForm.takeProfitPrice, true, {
        currentPrice: price,
        direction: orderForm.direction,
        leverage: orderForm.leverage,
        entryPrice,
      });
      const absRoE = Math.abs(parseFloat(tpRoE || '0'));
      tpDisplay =
        absRoE > 0 ? `${absRoE.toFixed(0)}%` : strings('perps.order.off');
    }

    if (orderForm.stopLossPrice && price > 0 && orderForm.leverage) {
      const slRoE = calculateRoEForPrice(orderForm.stopLossPrice, false, {
        currentPrice: price,
        direction: orderForm.direction,
        leverage: orderForm.leverage,
        entryPrice,
      });
      const absRoE = Math.abs(parseFloat(slRoE || '0'));
      slDisplay =
        absRoE > 0 ? `${absRoE.toFixed(0)}%` : strings('perps.order.off');
    }

    return `TP ${tpDisplay}, SL ${slDisplay}`;
  }, [
    currentPrice?.price,
    orderForm.takeProfitPrice,
    orderForm.stopLossPrice,
    orderForm.leverage,
    orderForm.direction,
    orderForm.type,
    orderForm.limitPrice,
  ]);

  // Order validation using new hook
  const orderValidation = usePerpsOrderValidation({
    orderForm,
    positionSize,
    assetPrice: assetData.price,
    availableBalance,
    marginRequired,
  });

  // Filter out specific validation error(s) from display (similar to ClosePositionView pattern)
  // Hide the "Size must be a positive number" message from the error list
  const filteredErrors = useMemo(() => {
    const sizePositiveMsg = strings(
      'perps.errors.orderValidation.sizePositive',
    );
    return orderValidation.errors.filter((err) => err !== sizePositiveMsg);
  }, [orderValidation.errors]);

  // Track dependent metrics update performance when amount or leverage changes
  const prevInputValuesRef = useRef({ amount: '', leverage: 1 });
  useEffect(() => {
    const hasAmountChanged =
      prevInputValuesRef.current.amount !== orderForm.amount;
    const hasLeverageChanged =
      prevInputValuesRef.current.leverage !== orderForm.leverage;

    if (
      (hasAmountChanged || hasLeverageChanged) &&
      parseFloat(orderForm.amount) > 0
    ) {
      // Measure after all dependent calculations have completed
      startMeasure(PerpsMeasurementName.UPDATE_DEPENDENT_METRICS_ON_INPUT);

      // These values trigger recalculation when amount/leverage changes:
      // - positionSize (memoized)
      // - marginRequired (from calculations)
      // - liquidationPrice (from hook)
      // - orderValidation (from hook)

      // Use requestAnimationFrame to measure after React has updated
      requestAnimationFrame(() => {
        endMeasure(PerpsMeasurementName.UPDATE_DEPENDENT_METRICS_ON_INPUT);
      });

      prevInputValuesRef.current = {
        amount: orderForm.amount,
        leverage: orderForm.leverage,
      };
    }
  }, [
    orderForm.amount,
    orderForm.leverage,
    positionSize,
    marginRequired,
    liquidationPrice,
    startMeasure,
    endMeasure,
  ]);

  // Handlers
  const handleTPSLPress = useCallback(() => {
    if (orderForm.type === 'limit' && !orderForm.limitPrice) {
      // We need to set a limit price for limit orders before TP/SL can be set
      showToast(PerpsToastOptions.formValidation.orderForm.limitPriceRequired);
      return;
    }

    setIsTPSLVisible(true);
  }, [
    PerpsToastOptions.formValidation.orderForm.limitPriceRequired,
    orderForm.limitPrice,
    orderForm.type,
    showToast,
  ]);

  const handleAmountPress = () => {
    setIsInputFocused(true);
  };

  const handleKeypadChange = useCallback(
    ({ value }: { value: string; valueAsNumber: number }) => {
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
    handlePercentageAmount(percentage);
  };

  const handleMaxPress = () => {
    handleMaxAmount();
  };

  const handleDonePress = () => {
    setIsInputFocused(false);
  };

  // Clamp amount to the maximum allowed once the keypad/input is dismissed
  // Mirrors the PerpsClosePositionView behavior where, after leaving input,
  // values are normalized to valid limits.
  useEffect(() => {
    if (!isInputFocused) {
      const currentAmount = parseFloat(orderForm.amount || '0');
      const maxAllowed = Math.floor(availableBalance * orderForm.leverage);

      // If user-entered amount exceeds the max purchasable with current balance/leverage,
      // snap it down to the maximum once input is closed.
      if (currentAmount > maxAllowed) {
        setAmount(String(maxAllowed));
      }
    }
  }, [
    isInputFocused,
    orderForm.amount,
    availableBalance,
    orderForm.leverage,
    setAmount,
  ]);

  const handlePlaceOrder = useCallback(async () => {
    if (isSubmittingRef.current) {
      return;
    }
    isSubmittingRef.current = true;

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
        track(MetaMetricsEvents.PERPS_ERROR_ENCOUNTERED, {
          [PerpsEventProperties.ERROR_TYPE]:
            PerpsEventValues.ERROR_TYPE.VALIDATION,
          [PerpsEventProperties.ERROR_MESSAGE]: firstError,
        });

        isSubmittingRef.current = false; // Reset flag on early return
        return;
      }

      // Track trade transaction initiated
      track(MetaMetricsEvents.PERPS_TRADE_TRANSACTION_INITIATED, {
        [PerpsEventProperties.ASSET]: orderForm.asset,
        [PerpsEventProperties.DIRECTION]:
          orderForm.direction === 'long'
            ? PerpsEventValues.DIRECTION.LONG
            : PerpsEventValues.DIRECTION.SHORT,
        [PerpsEventProperties.ORDER_TYPE]: orderForm.type,
        [PerpsEventProperties.LEVERAGE]: orderForm.leverage,
        [PerpsEventProperties.ORDER_SIZE]: positionSize,
        [PerpsEventProperties.MARGIN_USED]: marginRequired,
      });

      // Execute order using the new hook
      // Only include TP/SL if they have valid, non-empty values
      const orderParams: OrderParams = {
        coin: orderForm.asset,
        isBuy: orderForm.direction === 'long',
        size: positionSize,
        orderType: orderForm.type,
        currentPrice: assetData.price,
        leverage: orderForm.leverage,
        // Only add TP/SL/Limit if they are truthy and/or not empty strings
        ...(orderForm.type === 'limit' && orderForm.limitPrice
          ? { price: orderForm.limitPrice }
          : {}),
        ...(orderForm.takeProfitPrice && orderForm.takeProfitPrice !== ''
          ? { takeProfitPrice: orderForm.takeProfitPrice }
          : {}),
        ...(orderForm.stopLossPrice && orderForm.stopLossPrice !== ''
          ? { stopLossPrice: orderForm.stopLossPrice }
          : {}),
      };

      navigation.navigate(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.MARKET_DETAILS,
        params: {
          market: navigationMarketData,
          isNavigationFromOrderSuccess: false,
        },
      });

      // Track trade transaction submitted
      track(MetaMetricsEvents.PERPS_TRADE_TRANSACTION_SUBMITTED, {
        [PerpsEventProperties.ASSET]: orderForm.asset,
        [PerpsEventProperties.DIRECTION]:
          orderForm.direction === 'long'
            ? PerpsEventValues.DIRECTION.LONG
            : PerpsEventValues.DIRECTION.SHORT,
        [PerpsEventProperties.ORDER_TYPE]: orderForm.type,
        [PerpsEventProperties.LEVERAGE]: orderForm.leverage,
        [PerpsEventProperties.ORDER_SIZE]: positionSize,
      });

      await executeOrder(orderParams);
    } catch (error) {
      // Track trade transaction failed
      track(MetaMetricsEvents.PERPS_TRADE_TRANSACTION_FAILED, {
        [PerpsEventProperties.ASSET]: orderForm.asset,
        [PerpsEventProperties.DIRECTION]:
          orderForm.direction === 'long'
            ? PerpsEventValues.DIRECTION.LONG
            : PerpsEventValues.DIRECTION.SHORT,
        [PerpsEventProperties.ERROR_MESSAGE]:
          error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
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
    orderForm.takeProfitPrice,
    orderForm.stopLossPrice,
    orderForm.limitPrice,
    positionSize,
    marginRequired,
    assetData.price,
    navigation,
    navigationMarketData,
    executeOrder,
    showToast,
    PerpsToastOptions.formValidation.orderForm,
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
  const placeOrderLabel =
    amountTimesLeverage < minimumOrderAmount
      ? strings('perps.order.validation.insufficient_funds')
      : strings(
          orderForm.direction === 'long'
            ? 'perps.order.button.long'
            : 'perps.order.button.short',
          { asset: orderForm.asset },
        );

  const doesStopLossRiskLiquidation = Boolean(
    orderForm.stopLossPrice &&
      !isStopLossSafeFromLiquidation(
        orderForm.stopLossPrice,
        liquidationPrice,
        orderForm.direction,
      ),
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <PerpsOrderHeader
        asset={orderForm.asset}
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
          showWarning={availableBalance === 0}
          onPress={handleAmountPress}
          isActive={isInputFocused}
          tokenAmount={positionSize}
          tokenSymbol={orderForm.asset}
          hasError={availableBalance > 0 && !!filteredErrors.length}
        />

        {/* Amount Slider - Hide when keypad is active */}
        {!isInputFocused && (
          <View style={styles.sliderSection}>
            <PerpsSlider
              value={parseFloat(orderForm.amount || '0')}
              onValueChange={(value) => setAmount(Math.floor(value).toString())}
              minimumValue={0}
              maximumValue={amountTimesLeverage}
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
                          color={IconColor.Muted}
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
                        {orderForm.limitPrice
                          ? formatPrice(orderForm.limitPrice)
                          : 'Set price'}
                      </Text>
                    </ListItemColumn>
                  </ListItem>
                </TouchableOpacity>
              </View>
            )}

            {/* Combined TP/SL row */}
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
                          color={IconColor.Muted}
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
            {doesStopLossRiskLiquidation && (
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
                  color={IconColor.Muted}
                  testID={PerpsOrderViewSelectorsIDs.MARGIN_INFO_ICON}
                />
              </TouchableOpacity>
            </View>
            <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
              {marginRequired ? formatPrice(marginRequired) : '--'}
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
                  color={IconColor.Muted}
                  testID={
                    PerpsOrderViewSelectorsIDs.LIQUIDATION_PRICE_INFO_ICON
                  }
                />
              </TouchableOpacity>
            </View>
            <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
              {parseFloat(orderForm.amount) > 0
                ? formatPerpsFiat(liquidationPrice, {
                    ranges: PRICE_RANGES_DETAILED_VIEW,
                  })
                : '--'}
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
                  color={IconColor.Muted}
                  testID={PerpsOrderViewSelectorsIDs.FEES_INFO_ICON}
                />
              </TouchableOpacity>
            </View>
            <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
              {parseFloat(orderForm.amount) > 0
                ? formatPerpsFiat(estimatedFees, {
                    ranges: PRICE_RANGES_MINIMAL_VIEW,
                  })
                : '--'}
            </Text>
          </View>
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
      {/* Fixed Place Order Button - Hide when keypad is active */}
      {!isInputFocused && (
        <View style={styles.fixedBottomContainer}>
          {filteredErrors.length > 0 && (
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
              doesStopLossRiskLiquidation
            }
            isLoading={isPlacingOrder}
            testID={PerpsOrderViewSelectorsIDs.PLACE_ORDER_BUTTON}
          >
            {placeOrderLabel}
          </ButtonSemantic>
        </View>
      )}
      {/* TP/SL Bottom Sheet */}
      <PerpsTPSLBottomSheet
        isVisible={isTPSLVisible}
        onClose={() => setIsTPSLVisible(false)}
        onConfirm={(takeProfitPrice, stopLossPrice) => {
          // Use the same clearing approach as the "Off" button
          // If values are undefined or empty, ensure they're cleared properly
          const tpToSet = takeProfitPrice || undefined;
          const slToSet = stopLossPrice || undefined;

          setTakeProfitPrice(tpToSet);
          setStopLossPrice(slToSet);
          setIsTPSLVisible(false);
        }}
        asset={orderForm.asset}
        currentPrice={assetData.price}
        direction={orderForm.direction}
        leverage={orderForm.leverage}
        marginRequired={marginRequired}
        initialTakeProfitPrice={orderForm.takeProfitPrice}
        initialStopLossPrice={orderForm.stopLossPrice}
        orderType={orderForm.type}
        limitPrice={orderForm.limitPrice}
      />
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
            [PerpsEventProperties.TIMESTAMP]: Date.now(),
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

          track(MetaMetricsEvents.PERPS_LEVERAGE_CHANGED, eventProperties);
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
  } = route.params || {};

  return (
    <PerpsOrderProvider
      initialAsset={asset}
      initialDirection={direction}
      initialAmount={paramAmount}
      initialLeverage={paramLeverage}
    >
      <PerpsOrderViewContent />
    </PerpsOrderProvider>
  );
};

export default PerpsOrderView;
