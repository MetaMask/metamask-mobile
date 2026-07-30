import {
  DECIMAL_PRECISION_CONFIG,
  PERPS_CONSTANTS,
  type OrderType,
  type PerpsMarketData,
  type Position,
} from '@metamask/perps-controller';
import {
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
} from '@metamask/perps-controller/constants';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../../../../locales/i18n';
import Engine from '../../../../../../../core/Engine';
import { MetaMetricsEvents } from '../../../../../../../core/Analytics';
import Routes from '../../../../../../../constants/navigation/Routes';
import type { AppNavigationProp } from '../../../../../../../core/NavigationService/types';
import { useVipTier } from '../../../../../Rewards/hooks/useVipTier';
import type { PerpsTooltipContentKey } from '../../../../components/PerpsBottomSheetTooltip/PerpsBottomSheetTooltip.types';
import { bpsToPercent } from '../../../../constants/slippageConfig';
import { usePerpsOrderContext } from '../../../../contexts/PerpsOrderContext';
import {
  useHasExistingPosition,
  usePerpsLiquidationPrice,
  usePerpsMarketData,
  usePerpsOrderExecution,
  usePerpsOrderFees,
  usePerpsOrderValidation,
  usePerpsToasts,
  usePerpsTrading,
} from '../../../../hooks';
import { usePerpsHomeActions } from '../../../../hooks/usePerpsHomeActions';
import {
  usePerpsLivePrices,
  usePerpsTopOfBook,
} from '../../../../hooks/stream';
import { usePerpsConnection } from '../../../../hooks/usePerpsConnection';
import { usePerpsEstimatedSlippage } from '../../../../hooks/usePerpsEstimatedSlippage';
import { usePerpsEventTracking } from '../../../../hooks/usePerpsEventTracking';
import { usePerpsMaxSlippage } from '../../../../hooks/usePerpsMaxSlippage';
import { usePerpsOICap } from '../../../../hooks/usePerpsOICap';
import type { PerpsStackParamList } from '../../../../types/navigation';
import { getPerpsChartLibrary } from '../../../../utils/chartAnalytics';
import {
  formatPerpsFiat,
  formatWithSignificantDigits,
  PRICE_RANGES_MINIMAL_VIEW,
  PRICE_RANGES_UNIVERSAL,
} from '../../../../utils/formatUtils';
import {
  buildPerpsOrderParams,
  buildPerpsOrderTrackingData,
} from '../../../../utils/orderParams';
import { deriveOrderSizing } from '../../../../utils/orderSizing';
import { willFlipPosition } from '../../../../utils/orderUtils';
import { getPerpsOrderTpSlWarnings } from '../../../../utils/tpslValidation';
import { selectPerpsAdvancedChartEnabledFlag } from '../../../../selectors/featureFlags';
import type {
  PerpsProOrderDirection,
  PerpsProOrderNotice,
  PerpsProOrderSummaryProps,
} from './PerpsProOrderForm.types';

export interface UsePerpsProOrderFormParams {
  market: PerpsMarketData;
}

export interface UsePerpsProOrderFormResult {
  // Presentational form props
  direction: PerpsProOrderDirection;
  onDirectionChange: (direction: PerpsProOrderDirection) => void;
  leverage: number;
  onLeveragePress: () => void;
  orderType: OrderType;
  onOrderTypeButtonPress: () => void;
  limitPrice: string;
  onLimitPriceChange: (value: string) => void;
  onUseMidPricePress: () => void;
  size: string;
  onSizeChange: (value: string) => void;
  balancePercentage: number;
  onBalancePercentageChange: (value: number) => void;
  availableBalance: string;
  onAddFundsPress: () => void;
  reduceOnly: boolean;
  onReduceOnlyChange: (value: boolean) => void;
  isTPSLConfigured: boolean;
  onTPSLPress: () => void;
  notices: PerpsProOrderNotice[];
  summary: PerpsProOrderSummaryProps;
  isPlaceOrderDisabled: boolean;
  isPlaceOrderLoading: boolean;
  onPlaceOrderPress: () => void;
  // Leverage sheet
  isLeverageVisible: boolean;
  minLeverage: number;
  maxLeverage: number;
  currentPrice: number;
  onLeverageConfirm: (
    leverage: number,
    inputMethod?: 'slider' | 'preset',
  ) => void;
  closeLeverage: () => void;
  // Slippage sheet
  isSlippageVisible: boolean;
  maxSlippageBps: number;
  onSlippageSave: (valueBps: number) => void;
  closeSlippage: () => void;
  // Order type sheet
  isOrderTypeVisible: boolean;
  onOrderTypeSelect: (type: OrderType) => void;
  closeOrderType: () => void;
  // Eligibility (geo-block) modal
  isEligibilityModalVisible: boolean;
  closeEligibilityModal: () => void;
  // Fees tooltip
  selectedTooltip: PerpsTooltipContentKey | null;
  closeTooltip: () => void;
  feeMetamaskFeeRate: number | undefined;
  feeProtocolFeeRate: number | undefined;
  feeOriginalMetamaskFeeRate: number | undefined;
  feeDiscountPercentage: number | undefined;
}

/**
 * Pro-local orchestration hook for the inline order form.
 *
 * Reuses the same business hooks lite (`PerpsOrderView`) uses and composes a
 * trimmed direct-path submit handler (no navigation-on-success, no
 * pay-with-any-token deposit branch, no abandonment tracking). Must render
 * within a `PerpsOrderProvider`.
 *
 * NOTE (TAT-3595): Bespoke Pro lifecycle traces (render trace, abandonment)
 * are intentionally deferred to a follow-up pending the product/analytics sync.
 */
export const usePerpsProOrderForm = ({
  market,
}: UsePerpsProOrderFormParams): UsePerpsProOrderFormResult => {
  const symbol = market.symbol;

  const navigation = useNavigation<AppNavigationProp>();
  const route =
    useRoute<RouteProp<PerpsStackParamList, 'PerpsMarketDetails'>>();
  const source = route.params?.source;
  const sourceSection = route.params?.source_section;

  const isAdvancedChartEnabled = useSelector(
    selectPerpsAdvancedChartEnabledFlag,
  );
  const chartLibrary = getPerpsChartLibrary(isAdvancedChartEnabled);

  const { isInitialized } = usePerpsConnection();
  const { track } = usePerpsEventTracking();
  const { showToast, PerpsToastOptions } = usePerpsToasts();
  const { updatePositionTPSL } = usePerpsTrading();

  const {
    orderForm,
    setAmount,
    setLeverage,
    setDirection,
    setTakeProfitPrice,
    setStopLossPrice,
    setLimitPrice,
    setOrderType,
    handlePercentageAmount,
    maxPossibleAmount,
    balanceForValidation: spendableBalance,
  } = usePerpsOrderContext();

  // Local (Pro-only) state
  const [reduceOnly, setReduceOnly] = useState(false);
  const [isLeverageVisible, setIsLeverageVisible] = useState(false);
  const [isSlippageVisible, setIsSlippageVisible] = useState(false);
  const [isOrderTypeVisible, setIsOrderTypeVisible] = useState(false);
  const [selectedTooltip, setSelectedTooltip] =
    useState<PerpsTooltipContentKey | null>(null);
  const isSubmittingRef = useRef(false);

  const { maxSlippageBps, maxSlippageSource, setMaxSlippage } =
    usePerpsMaxSlippage();
  const { isAtCap } = usePerpsOICap(symbol);
  const vipTier = useVipTier();

  const { handleAddFunds, isEligibilityModalVisible, closeEligibilityModal } =
    usePerpsHomeActions({
      buttonLocation: PERPS_EVENT_VALUE.BUTTON_LOCATION.PERPS_ASSET_SCREEN,
    });

  const { marketData, isLoading: isMarketDataLoading } = usePerpsMarketData({
    asset: symbol,
    showErrorToast: true,
  });
  const szDecimals =
    marketData?.szDecimals ?? DECIMAL_PRECISION_CONFIG.FallbackSizeDecimals;
  const maxLeverage =
    marketData?.maxLeverage ?? PERPS_CONSTANTS.DefaultMaxLeverage;
  const isLoadingMarketData = isMarketDataLoading && marketData === null;

  const { existingPosition: currentMarketPosition } = useHasExistingPosition({
    asset: symbol,
    loadOnMount: true,
  });

  const prices = usePerpsLivePrices({ symbols: [symbol], throttleMs: 1000 });
  const currentPrice = prices[symbol];
  const currentTopOfBook = usePerpsTopOfBook({ symbol });

  const assetData = useMemo(() => {
    if (!currentPrice) {
      return { price: 0, change: 0, markPrice: 0 };
    }
    const price = parseFloat(currentPrice.price || '0');
    const markPrice = parseFloat(currentPrice.markPrice || '0');
    const change = parseFloat(currentPrice.percentChange24h || '0');
    return {
      price: Number.isNaN(price) ? 0 : price,
      markPrice: Number.isNaN(markPrice) ? 0 : markPrice,
      change: Number.isNaN(change) ? 0 : change,
    };
  }, [currentPrice]);

  const feeResults = usePerpsOrderFees({
    orderType: orderForm.type,
    amount: orderForm.amount,
    symbol: orderForm.asset,
    isClosing: reduceOnly,
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
  const undiscountedEstimatedFees = feeResults.undiscountedTotalFee;

  const isMarketOrder = orderForm.type === 'market';
  const hasValidAmount = parseFloat(orderForm.amount) > 0;

  const orderUsdAmount = useMemo(
    () => parseFloat(orderForm.amount) || 0,
    [orderForm.amount],
  );
  const { estimatedSlippageBps } = usePerpsEstimatedSlippage({
    symbol: orderForm.asset,
    sizeUsd: orderUsdAmount,
    isBuy: orderForm.direction === 'long',
    enabled: isMarketOrder && hasValidAmount && isInitialized,
  });
  const estimatedSlippagePct: number | null = useMemo(
    () =>
      typeof estimatedSlippageBps === 'number'
        ? bpsToPercent(estimatedSlippageBps)
        : null,
    [estimatedSlippageBps],
  );
  const estimatedSlippagePctDisplay: string | null = useMemo(
    () =>
      estimatedSlippagePct === null ? null : estimatedSlippagePct.toFixed(2),
    [estimatedSlippagePct],
  );
  const exceedsMaxSlippage =
    isMarketOrder &&
    typeof estimatedSlippageBps === 'number' &&
    estimatedSlippageBps > maxSlippageBps;

  const { effectivePrice, positionSize, marginRequired } = useMemo(
    () =>
      deriveOrderSizing({
        amount: orderForm.amount,
        orderType: orderForm.type,
        limitPrice: orderForm.limitPrice,
        marketPrice: assetData.price,
        markPrice: assetData.markPrice,
        leverage: orderForm.leverage,
        szDecimals,
        isLoadingMarketData,
      }),
    [
      orderForm.amount,
      orderForm.type,
      orderForm.limitPrice,
      orderForm.leverage,
      assetData.price,
      assetData.markPrice,
      szDecimals,
      isLoadingMarketData,
    ],
  );

  const liquidationPriceParams = useMemo(
    () => ({
      entryPrice: effectivePrice,
      leverage: orderForm.leverage,
      direction: orderForm.direction,
      asset: orderForm.asset,
    }),
    [effectivePrice, orderForm.leverage, orderForm.direction, orderForm.asset],
  );
  const { liquidationPrice } = usePerpsLiquidationPrice(liquidationPriceParams);

  const existingPositionLeverageForValidation =
    currentMarketPosition?.leverage?.value;

  const orderValidation = usePerpsOrderValidation({
    orderForm,
    positionSize,
    assetPrice: assetData.price,
    spendableBalance,
    marginRequired: marginRequired || '0',
    existingPositionLeverage: existingPositionLeverageForValidation,
    skipValidation: false,
    originalUsdAmount: orderForm.amount,
  });

  const filteredErrors = useMemo(() => {
    const sizePositiveMsg = strings(
      'perps.errors.orderValidation.sizePositive',
    );
    return orderValidation.errors.filter((err) => err !== sizePositiveMsg);
  }, [orderValidation.errors]);

  const {
    doesStopLossRiskLiquidation,
    isTakeProfitPriceInvalid,
    isStopLossPriceInvalid,
    tpslPriceType,
  } = getPerpsOrderTpSlWarnings({
    orderType: orderForm.type,
    limitPrice: orderForm.limitPrice,
    direction: orderForm.direction,
    takeProfitPrice: orderForm.takeProfitPrice,
    stopLossPrice: orderForm.stopLossPrice,
    liquidationPrice,
    marketPrice: assetData.price,
  });

  const { placeOrder: executeOrder, isPlacing } = usePerpsOrderExecution({
    onSuccess: () => {
      showToast(
        PerpsToastOptions.orderManagement[orderForm.type].confirmed(
          orderForm.direction,
          positionSize,
          orderForm.asset,
        ),
      );
    },
    onError: (error) => {
      showToast(
        PerpsToastOptions.orderManagement[orderForm.type].creationFailed(error),
      );
    },
  });

  const handlePlaceOrder = useCallback(async () => {
    if (isSubmittingRef.current) {
      return;
    }

    track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
      [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
        PERPS_EVENT_VALUE.INTERACTION_TYPE.TAP,
      [PERPS_EVENT_PROPERTY.BUTTON_CLICKED]:
        PERPS_EVENT_VALUE.BUTTON_CLICKED.PLACE_ORDER,
      [PERPS_EVENT_PROPERTY.ASSET]: orderForm.asset,
      [PERPS_EVENT_PROPERTY.DIRECTION]:
        orderForm.direction === 'long'
          ? PERPS_EVENT_VALUE.DIRECTION.LONG
          : PERPS_EVENT_VALUE.DIRECTION.SHORT,
    });

    if (exceedsMaxSlippage && typeof estimatedSlippageBps === 'number') {
      const estPct = bpsToPercent(estimatedSlippageBps);
      const maxPct = bpsToPercent(maxSlippageBps);
      showToast(
        PerpsToastOptions.formValidation.orderForm.validationError(
          strings('perps.slippage.exceeds_max', {
            est: estPct.toFixed(2),
            max: maxPct.toFixed(2),
          }),
        ),
      );
      track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
        [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
          PERPS_EVENT_VALUE.INTERACTION_TYPE.SLIPPAGE_LIMIT_BLOCKED_ORDER,
        [PERPS_EVENT_PROPERTY.ASSET]: orderForm.asset,
        [PERPS_EVENT_PROPERTY.MAX_SLIPPAGE_PCT]: maxPct,
        [PERPS_EVENT_PROPERTY.ESTIMATED_SLIPPAGE_PCT]: estPct,
        [PERPS_EVENT_PROPERTY.MAX_SLIPPAGE_SOURCE]: maxSlippageSource,
      });
      return;
    }

    if (
      doesStopLossRiskLiquidation ||
      isTakeProfitPriceInvalid ||
      isStopLossPriceInvalid
    ) {
      return;
    }

    isSubmittingRef.current = true;

    try {
      if (!orderValidation.isValid) {
        const firstError = orderValidation.errors[0];
        showToast(
          PerpsToastOptions.formValidation.orderForm.validationError(
            firstError,
          ),
        );
        track(MetaMetricsEvents.PERPS_ERROR, {
          [PERPS_EVENT_PROPERTY.ERROR_TYPE]:
            PERPS_EVENT_VALUE.ERROR_TYPE.VALIDATION,
          [PERPS_EVENT_PROPERTY.ERROR_MESSAGE]: firstError,
          [PERPS_EVENT_PROPERTY.SCREEN_NAME]:
            PERPS_EVENT_VALUE.SCREEN_NAME.PERPS_ORDER,
          [PERPS_EVENT_PROPERTY.SCREEN_TYPE]:
            PERPS_EVENT_VALUE.SCREEN_TYPE.TRADING,
        });
        isSubmittingRef.current = false;
        return;
      }

      if (currentMarketPosition?.leverage?.type === 'cross') {
        navigation.navigate(Routes.PERPS.MODALS.ROOT, {
          screen: Routes.PERPS.MODALS.CROSS_MARGIN_WARNING,
        });
        track(MetaMetricsEvents.PERPS_ERROR, {
          [PERPS_EVENT_PROPERTY.ERROR_TYPE]:
            PERPS_EVENT_VALUE.ERROR_TYPE.VALIDATION,
          [PERPS_EVENT_PROPERTY.ERROR_MESSAGE]:
            'Cross margin position detected',
          [PERPS_EVENT_PROPERTY.SCREEN_NAME]:
            PERPS_EVENT_VALUE.SCREEN_NAME.PERPS_ORDER,
          [PERPS_EVENT_PROPERTY.SCREEN_TYPE]:
            PERPS_EVENT_VALUE.SCREEN_TYPE.TRADING,
        });
        isSubmittingRef.current = false;
        return;
      }

      // reduce-only is Pro-specific (TAT-3595); the direct Pro path never
      // uses pay-with-any-token, so those tracking fields are omitted.
      const orderParams = buildPerpsOrderParams({
        asset: orderForm.asset,
        isBuy: orderForm.direction === 'long',
        size: positionSize,
        orderType: orderForm.type,
        effectivePrice,
        leverage: orderForm.leverage,
        usdAmount: orderForm.amount,
        maxSlippageBps,
        limitPrice: orderForm.limitPrice,
        takeProfitPrice: orderForm.takeProfitPrice,
        stopLossPrice: orderForm.stopLossPrice,
        reduceOnly,
        trackingData: buildPerpsOrderTrackingData({
          marginRequired,
          feeResults,
          marketPrice: assetData.price,
          inputMethod: 'default',
          source,
          sourceSection,
          currentMarketPosition,
          direction: orderForm.direction,
          chartLibrary,
          vipTier,
        }),
      });

      showToast(
        PerpsToastOptions.orderManagement[orderForm.type].submitted(
          orderForm.direction,
          positionSize,
          orderForm.asset,
        ),
      );

      const shouldHandleTPSLSeparately =
        (orderForm.takeProfitPrice || orderForm.stopLossPrice) &&
        ((!currentMarketPosition && orderForm.type === 'market') ||
          (currentMarketPosition &&
            willFlipPosition(currentMarketPosition, orderParams)));

      if (shouldHandleTPSLSeparately) {
        const orderWithoutTPSL = { ...orderParams };
        delete orderWithoutTPSL.takeProfitPrice;
        delete orderWithoutTPSL.stopLossPrice;

        const orderResult = await executeOrder(orderWithoutTPSL);
        if (!orderResult?.success) {
          return;
        }

        const tpslResult = await updatePositionTPSL({
          symbol: orderForm.asset,
          takeProfitPrice: orderForm.takeProfitPrice,
          stopLossPrice: orderForm.stopLossPrice,
        });

        if (!tpslResult.success) {
          const errorMessage =
            tpslResult.error || strings('perps.errors.unknown');
          showToast(
            PerpsToastOptions.positionManagement.tpsl.updateTPSLError(
              errorMessage,
            ),
          );
        }
      } else {
        const orderResult = await executeOrder(orderParams);
        if (!orderResult?.success) {
          return;
        }
      }

      Engine.context.PerpsController?.clearPendingTradeConfiguration(
        orderForm.asset,
      );
    } finally {
      isSubmittingRef.current = false;
    }
  }, [
    track,
    orderForm.asset,
    orderForm.direction,
    orderForm.type,
    orderForm.leverage,
    orderForm.limitPrice,
    orderForm.takeProfitPrice,
    orderForm.stopLossPrice,
    orderForm.amount,
    exceedsMaxSlippage,
    estimatedSlippageBps,
    maxSlippageBps,
    maxSlippageSource,
    doesStopLossRiskLiquidation,
    isTakeProfitPriceInvalid,
    isStopLossPriceInvalid,
    orderValidation.isValid,
    orderValidation.errors,
    currentMarketPosition,
    navigation,
    positionSize,
    effectivePrice,
    reduceOnly,
    marginRequired,
    feeResults,
    assetData.price,
    source,
    sourceSection,
    chartLibrary,
    vipTier,
    executeOrder,
    updatePositionTPSL,
    showToast,
    PerpsToastOptions.formValidation.orderForm,
    PerpsToastOptions.orderManagement,
    PerpsToastOptions.positionManagement.tpsl,
  ]);

  const onTPSLPress = useCallback(() => {
    if (orderForm.type === 'limit' && !orderForm.limitPrice) {
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
      szDecimals,
      onConfirm: async (
        _position?: Position,
        takeProfitPrice?: string,
        stopLossPrice?: string,
      ) => {
        setTakeProfitPrice(takeProfitPrice || undefined);
        setStopLossPrice(stopLossPrice || undefined);
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
    szDecimals,
  ]);

  const onLeverageConfirm = useCallback(
    (leverage: number, inputMethod?: 'slider' | 'preset') => {
      setLeverage(leverage);

      const currentAmount = parseFloat(orderForm.amount || '0');
      const newMaxAmount = spendableBalance * leverage;
      if (currentAmount > newMaxAmount) {
        setAmount(Math.floor(newMaxAmount).toString());
      }

      setIsLeverageVisible(false);

      const eventProperties: Record<string, string | number> = {
        [PERPS_EVENT_PROPERTY.ASSET]: orderForm.asset,
        [PERPS_EVENT_PROPERTY.DIRECTION]:
          orderForm.direction === 'long'
            ? PERPS_EVENT_VALUE.DIRECTION.LONG
            : PERPS_EVENT_VALUE.DIRECTION.SHORT,
        [PERPS_EVENT_PROPERTY.LEVERAGE_USED]: leverage,
        previousLeverage: orderForm.leverage,
      };
      if (inputMethod) {
        eventProperties[PERPS_EVENT_PROPERTY.INPUT_METHOD] =
          inputMethod === 'slider'
            ? PERPS_EVENT_VALUE.INPUT_METHOD.SLIDER
            : PERPS_EVENT_VALUE.INPUT_METHOD.PRESET;
      }
      track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
        ...eventProperties,
        [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
          PERPS_EVENT_VALUE.INTERACTION_TYPE.LEVERAGE_CHANGED,
        [PERPS_EVENT_PROPERTY.SETTING_TYPE]:
          PERPS_EVENT_VALUE.SETTING_TYPE.LEVERAGE,
      });
    },
    [
      setLeverage,
      setAmount,
      orderForm.amount,
      orderForm.asset,
      orderForm.direction,
      orderForm.leverage,
      spendableBalance,
      track,
    ],
  );

  const onSlippageSave = useCallback(
    (valueBps: number) => {
      setMaxSlippage(valueBps);
      setIsSlippageVisible(false);
      track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
        [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
          PERPS_EVENT_VALUE.INTERACTION_TYPE.SLIPPAGE_CONFIG_CHANGED,
        [PERPS_EVENT_PROPERTY.ASSET]: orderForm.asset,
        [PERPS_EVENT_PROPERTY.MAX_SLIPPAGE_PCT]: bpsToPercent(valueBps),
        [PERPS_EVENT_PROPERTY.MAX_SLIPPAGE_SOURCE]:
          PERPS_EVENT_VALUE.MAX_SLIPPAGE_SOURCE.USER_CONFIGURED,
        [PERPS_EVENT_PROPERTY.SETTING_TYPE]:
          PERPS_EVENT_VALUE.SETTING_TYPE.SLIPPAGE,
      });
    },
    [setMaxSlippage, track, orderForm.asset],
  );

  const onSlippagePress = useCallback(() => {
    setIsSlippageVisible(true);
    track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
      [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
        PERPS_EVENT_VALUE.INTERACTION_TYPE.SLIPPAGE_CONFIG_OPENED,
      [PERPS_EVENT_PROPERTY.ASSET]: orderForm.asset,
      [PERPS_EVENT_PROPERTY.MAX_SLIPPAGE_PCT]: bpsToPercent(maxSlippageBps),
      [PERPS_EVENT_PROPERTY.MAX_SLIPPAGE_SOURCE]: maxSlippageSource,
    });
  }, [track, orderForm.asset, maxSlippageBps, maxSlippageSource]);

  const onOrderTypeSelect = useCallback(
    (type: OrderType) => {
      setOrderType(type);
      setIsOrderTypeVisible(false);
    },
    [setOrderType],
  );

  const onSizeChange = useCallback(
    (value: string) => {
      const digitCount = (value.match(/\d/g) || []).length;
      if (digitCount > 9) {
        return;
      }
      setAmount(value || '0');
    },
    [setAmount],
  );

  const onUseMidPricePress = useCallback(() => {
    if (assetData.price > 0) {
      setLimitPrice(
        formatWithSignificantDigits(
          assetData.price,
          DECIMAL_PRECISION_CONFIG.MaxSignificantFigures,
        ).value.toString(),
      );
    }
  }, [assetData.price, setLimitPrice]);

  const onBalancePercentageChange = useCallback(
    (pct: number) => {
      handlePercentageAmount(pct / 100);
    },
    [handlePercentageAmount],
  );

  const balancePercentage =
    maxPossibleAmount > 0
      ? Math.min(
          100,
          Math.round(
            (parseFloat(orderForm.amount || '0') / maxPossibleAmount) * 100,
          ),
        )
      : 0;

  const availableBalance = formatPerpsFiat(spendableBalance, {
    ranges: PRICE_RANGES_MINIMAL_VIEW,
  });

  const notices = useMemo<PerpsProOrderNotice[]>(() => {
    const list: PerpsProOrderNotice[] = [];

    filteredErrors.forEach((message, index) => {
      list.push({ id: `validation-${index}`, variant: 'inline', message });
    });

    if (doesStopLossRiskLiquidation) {
      list.push({
        id: 'sl-liq-risk',
        variant: 'inline',
        message: strings('perps.tpsl.stop_loss_order_view_warning', {
          direction:
            orderForm.direction === 'long'
              ? strings('perps.tpsl.below')
              : strings('perps.tpsl.above'),
        }),
      });
    }
    if (isTakeProfitPriceInvalid) {
      list.push({
        id: 'tp-invalid',
        variant: 'inline',
        message: strings('perps.tpsl.take_profit_wrong_side_warning', {
          direction:
            orderForm.direction === 'long'
              ? strings('perps.tpsl.above')
              : strings('perps.tpsl.below'),
          priceType: tpslPriceType,
        }),
      });
    }
    if (isStopLossPriceInvalid) {
      list.push({
        id: 'sl-invalid',
        variant: 'inline',
        message: strings('perps.tpsl.stop_loss_wrong_side_warning', {
          direction:
            orderForm.direction === 'long'
              ? strings('perps.tpsl.below')
              : strings('perps.tpsl.above'),
          priceType: tpslPriceType,
        }),
      });
    }
    if (isAtCap) {
      list.push({
        id: 'oi-cap',
        variant: 'banner',
        message: strings('perps.order.validation.oi_cap_reached'),
      });
    }

    return list;
  }, [
    filteredErrors,
    doesStopLossRiskLiquidation,
    isTakeProfitPriceInvalid,
    isStopLossPriceInvalid,
    isAtCap,
    orderForm.direction,
    tpslPriceType,
  ]);

  const summary = useMemo<PerpsProOrderSummaryProps>(
    () => ({
      margin:
        marginRequired !== undefined && marginRequired !== null
          ? formatPerpsFiat(marginRequired, {
              ranges: PRICE_RANGES_MINIMAL_VIEW,
            })
          : PERPS_CONSTANTS.FallbackDataDisplay,
      liquidationPrice: hasValidAmount
        ? formatPerpsFiat(liquidationPrice, { ranges: PRICE_RANGES_UNIVERSAL })
        : PERPS_CONSTANTS.FallbackDataDisplay,
      // Limit orders use a fixed default slippage in buildPerpsOrderParams and
      // the user-configured cap has no effect. Hide the row entirely for limit
      // orders so the UI matches what is actually sent, consistent with the
      // lite form which also skips slippage display for limit orders.
      slippage: isMarketOrder
        ? estimatedSlippagePctDisplay === null
          ? strings('perps.slippage.row_format_pending', {
              value: bpsToPercent(maxSlippageBps),
            })
          : strings('perps.slippage.row_format', {
              est: estimatedSlippagePctDisplay,
              value: bpsToPercent(maxSlippageBps),
            })
        : undefined,
      onSlippagePress: isMarketOrder ? onSlippagePress : undefined,
      fee: hasValidAmount ? estimatedFees : undefined,
      originalFee: hasValidAmount ? undiscountedEstimatedFees : undefined,
      feeDiscountPercentage: feeResults.feeDiscountPercentage,
      onFeesInfoPress: () => setSelectedTooltip('fees'),
    }),
    [
      isMarketOrder,
      marginRequired,
      hasValidAmount,
      liquidationPrice,
      estimatedSlippagePctDisplay,
      maxSlippageBps,
      estimatedFees,
      undiscountedEstimatedFees,
      feeResults.feeDiscountPercentage,
      onSlippagePress,
    ],
  );

  const isPlaceOrderDisabled =
    !orderValidation.isValid ||
    isAtCap ||
    isPlacing ||
    isLoadingMarketData ||
    doesStopLossRiskLiquidation ||
    isTakeProfitPriceInvalid ||
    isStopLossPriceInvalid;

  const onDirectionChange = useCallback(
    (direction: PerpsProOrderDirection) => {
      setDirection(direction);
    },
    [setDirection],
  );

  const onLimitPriceChange = useCallback(
    (value: string) => {
      setLimitPrice(value);
    },
    [setLimitPrice],
  );

  const onPlaceOrderPress = useCallback(() => {
    handlePlaceOrder();
  }, [handlePlaceOrder]);

  return {
    direction: orderForm.direction,
    onDirectionChange,
    leverage: orderForm.leverage,
    onLeveragePress: () => setIsLeverageVisible(true),
    orderType: orderForm.type,
    onOrderTypeButtonPress: () => setIsOrderTypeVisible(true),
    limitPrice: orderForm.limitPrice ?? '',
    onLimitPriceChange,
    onUseMidPricePress,
    size: orderForm.amount,
    onSizeChange,
    balancePercentage,
    onBalancePercentageChange,
    availableBalance,
    onAddFundsPress: handleAddFunds,
    reduceOnly,
    onReduceOnlyChange: setReduceOnly,
    isTPSLConfigured: Boolean(
      orderForm.takeProfitPrice || orderForm.stopLossPrice,
    ),
    onTPSLPress,
    notices,
    summary,
    isPlaceOrderDisabled,
    isPlaceOrderLoading: isPlacing,
    onPlaceOrderPress,
    // Leverage sheet
    isLeverageVisible,
    minLeverage: 1,
    maxLeverage,
    currentPrice: assetData.price,
    onLeverageConfirm,
    closeLeverage: () => setIsLeverageVisible(false),
    // Slippage sheet
    isSlippageVisible,
    maxSlippageBps,
    onSlippageSave,
    closeSlippage: () => setIsSlippageVisible(false),
    // Order type sheet
    isOrderTypeVisible,
    onOrderTypeSelect,
    closeOrderType: () => setIsOrderTypeVisible(false),
    // Eligibility (geo-block) modal
    isEligibilityModalVisible,
    closeEligibilityModal,
    // Fees tooltip
    selectedTooltip,
    closeTooltip: () => setSelectedTooltip(null),
    feeMetamaskFeeRate: feeResults.metamaskFeeRate,
    feeProtocolFeeRate: feeResults.protocolFeeRate,
    feeOriginalMetamaskFeeRate: feeResults.originalMetamaskFeeRate,
    feeDiscountPercentage: feeResults.feeDiscountPercentage,
  };
};

export default usePerpsProOrderForm;
