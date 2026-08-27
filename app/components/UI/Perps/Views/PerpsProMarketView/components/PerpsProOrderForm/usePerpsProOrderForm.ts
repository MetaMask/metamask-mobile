import {
  DECIMAL_PRECISION_CONFIG,
  PERPS_CONSTANTS,
  PERPS_ERROR_CODES,
  SCALE_ORDER_COUNT,
  calculateMarginRequired,
  computeScalePriceLadder,
  formatHyperLiquidSize,
  formatHyperLiquidPrice,
  getTriggerExecution,
  isLimitExecutionOrderType,
  isTriggerOrderType,
  splitScaleSizes,
  type OrderType,
  type PerpsMarketData,
  type PerpsProviderType,
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
import BigNumber from 'bignumber.js';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../../../../locales/i18n';
import Engine from '../../../../../../../core/Engine';
import { MetaMetricsEvents } from '../../../../../../../core/Analytics';
import Routes from '../../../../../../../constants/navigation/Routes';
import type { AppNavigationProp } from '../../../../../../../core/NavigationService/types';
import { selectSelectedInternalAccountAddress } from '../../../../../../../selectors/accountsController';
import { ImpactMoment, useHaptics } from '../../../../../../../util/haptics';
import { useVipTier } from '../../../../../Rewards/hooks/useVipTier';
import { useComplianceGate } from '../../../../../Compliance';
import type { PerpsTooltipContentKey } from '../../../../components/PerpsBottomSheetTooltip/PerpsBottomSheetTooltip.types';
import { PERPS_ANALYTICS_PREVIOUS_LEVERAGE } from '../../../../constants/perpsAnalytics';
import {
  bpsToPercent,
  resolvePerpsMaxSlippageBps,
} from '../../../../constants/slippageConfig';
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
import { useMinimumOrderAmount } from '../../../../hooks/useMinimumOrderAmount';
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
import {
  deriveOrderSizing,
  getProspectiveExecutionPrice,
  getReduceOnlyMaxUsdAmount,
} from '../../../../utils/orderSizing';
import { willFlipPosition } from '../../../../utils/orderUtils';
import {
  validateReduceOnlyOrder,
  getReduceOnlyPositionError,
  type ReduceOnlyValidationCode,
} from '../../../../utils/reduceOnlyValidation';
import {
  getPerpsOrderTpSlWarnings,
  type PerpsOrderTpSlWarnings,
} from '../../../../utils/tpslValidation';
import {
  canonicalizeOrderPrice,
  getLimitPriceCrossingWarning,
  getOrderFormFieldIssueMessage,
  getOrderFormFieldIssues,
} from '../../../../utils/triggerOrderValidation';
import {
  MAX_PERPS_INPUT_DIGITS,
  PERPS_TWAP_UI_CONFIG,
} from '../../../../constants/perpsConfig';
import {
  finalizeNumericTextInput,
  normalizeNumericTextInput,
} from '../../../../../../Base/Keypad/normalizeNumericTextInput';
import { selectPerpsAdvancedChartEnabledFlag } from '../../../../selectors/featureFlags';
import type {
  PerpsProOrderDirection,
  PerpsProOrderNotice,
  PerpsProOrderSummaryProps,
  PerpsProScaleOrderModel,
  PerpsProSizeInputModel,
  PerpsProSizeSliderModel,
  PerpsProTwapModel,
} from './PerpsProOrderForm.types';
import { usePerpsProSizeInput } from './usePerpsProSizeInput';

const SCALE_DEFAULT_ORDERS = 5;
const SCALE_DEFAULT_SKEW = '1.00';
const SCALE_SKEW_DECIMAL_PLACES = 2;
const SCALE_SIZE_SEARCH_MAX_STEPS = Math.ceil(
  Math.log2(Number.MAX_SAFE_INTEGER),
);
const SCALE_EVENT_PROPERTY = {
  ORDER_COUNT: 'scale_order_count',
  RANGE_PERCENT: 'scale_range_pct',
  SKEW: 'scale_skew',
  REDUCE_ONLY: 'reduce_only',
} as const;
const SCALE_INTERACTION_TYPE = {
  CONFIG_CHANGED: 'scale_config_changed',
  PREVIEW_EXPANDED: 'scale_preview_expanded',
  VALIDATION_ERROR_SHOWN: 'scale_validation_error_shown',
} as const;
const SCALE_SETTING_TYPE = {
  START_PRICE: 'start_price',
  END_PRICE: 'end_price',
  TOTAL_ORDERS: 'total_orders',
  SIZE_SKEW: 'size_skew',
} as const;

type ScaleOrderValidationCode =
  | 'prices_required'
  | 'invalid_range'
  | 'invalid_order_count'
  | 'invalid_skew'
  | 'minimum_lot';

type ScaleSettingType =
  (typeof SCALE_SETTING_TYPE)[keyof typeof SCALE_SETTING_TYPE];

type ScaleLadderResult =
  | {
      success: true;
      rungs: PerpsProScaleOrderModel['rungs'];
      minPrice: string;
      maxPrice: string;
      orderCount: number;
      skew: number;
      orderValue: string;
      totalSize: string;
    }
  | { success: false; code: ScaleOrderValidationCode };

const REDUCE_ONLY_ERROR_I18N_KEYS: Record<ReduceOnlyValidationCode, string> = {
  no_position: 'perps.order.validation.reduce_only_no_position',
  wrong_side: 'perps.order.validation.reduce_only_wrong_side',
  too_large: 'perps.order.validation.reduce_only_too_large',
};

const SCALE_ERROR_I18N_KEYS: Record<ScaleOrderValidationCode, string> = {
  prices_required: 'perps.pro_order_form.scale.validation.prices_required',
  invalid_range: 'perps.pro_order_form.scale.validation.invalid_range',
  invalid_order_count:
    'perps.pro_order_form.scale.validation.invalid_order_count',
  invalid_skew: 'perps.pro_order_form.scale.validation.invalid_skew',
  minimum_lot: 'perps.pro_order_form.scale.validation.minimum_lot',
};

const coerceScaleSkew = (value: string): string => {
  const parsed = new BigNumber(value);
  return parsed.isFinite() && parsed.gt(0)
    ? parsed
        .decimalPlaces(SCALE_SKEW_DECIMAL_PLACES, BigNumber.ROUND_HALF_UP)
        .toFixed(SCALE_SKEW_DECIMAL_PLACES)
    : value;
};

const getScaleRangePercentage = (minPrice: number, maxPrice: number) =>
  minPrice > 0 && maxPrice > minPrice
    ? ((maxPrice - minPrice) / minPrice) * 100
    : undefined;

/** Prefix of the interpolated insufficient-balance message (stable across amounts). */
const INSUFFICIENT_BALANCE_PREFIX = strings(
  'perps.order.validation.insufficient_balance',
  { required: '__REQ__', available: '__AVAIL__' },
).split('__REQ__')[0];

const TWAP_OWNED_PROTOCOL_ERROR_CODES = [
  PERPS_ERROR_CODES.ORDER_TWAP_DURATION_REQUIRED,
  PERPS_ERROR_CODES.ORDER_TWAP_DURATION_INVALID,
  PERPS_ERROR_CODES.ORDER_TWAP_NOTIONAL_TOO_SMALL,
] as const;

const normalizeTwapDurationPart = (value: string): string =>
  value
    .replace(/\D/gu, '')
    .replace(/^0+(?=\d)/u, '')
    .slice(0, MAX_PERPS_INPUT_DIGITS);

const isMarginValidationError = (message: string): boolean =>
  message.startsWith(INSUFFICIENT_BALANCE_PREFIX) ||
  message === strings('perps.order.validation.insufficient_funds') ||
  message ===
    strings('perps.order.validation.insufficient_funds_to_cover_trade');

const isLimitPriceValidationError = (message: string): boolean =>
  message === strings('perps.order.validation.limit_price_required') ||
  message === strings('perps.order.validation.please_set_a_limit_price') ||
  message ===
    strings(
      'perps.order.validation.limit_price_must_be_set_before_configuring_tpsl',
    );

type MarketDataBlockingReason = 'loading' | 'error' | 'price-unavailable';

const getMarketDataBlockingReason = ({
  isLoading,
  hasError,
  price,
}: {
  isLoading: boolean;
  hasError: boolean;
  price: number;
}): MarketDataBlockingReason | null => {
  if (hasError) {
    return 'error';
  }
  if (isLoading) {
    return 'loading';
  }
  return price > 0 ? null : 'price-unavailable';
};

const getBlockingNotices = ({
  reduceOnlyErrorCode,
  isReduceOnlyPositionLoading,
  isTriggerOrderUnavailable,
  marketDataBlockingReason,
  filteredErrors,
}: {
  reduceOnlyErrorCode?: ReduceOnlyValidationCode;
  isReduceOnlyPositionLoading: boolean;
  isTriggerOrderUnavailable: boolean;
  marketDataBlockingReason: MarketDataBlockingReason | null;
  filteredErrors: string[];
}): PerpsProOrderNotice[] => {
  if (isTriggerOrderUnavailable) {
    return [
      {
        id: 'trigger-orders-unavailable',
        variant: 'banner',
        message: strings('perps.order.validation.trigger_orders_unavailable'),
      },
    ];
  }

  if (marketDataBlockingReason === 'loading') {
    return [];
  }

  if (marketDataBlockingReason === 'error') {
    return [
      {
        id: 'market-data',
        variant: 'banner',
        message: strings('perps.failed_to_load_market_data'),
      },
    ];
  }

  if (marketDataBlockingReason === 'price-unavailable') {
    return [
      {
        id: 'price-unavailable',
        variant: 'banner',
        message: strings('perps.pro_order_form.price_unavailable'),
      },
    ];
  }

  // Position data is unresolved — skipValidation retains prior errors, so hide
  // stale validation errors until the live reduce-only state can be evaluated.
  if (isReduceOnlyPositionLoading) {
    return [
      {
        id: 'position-loading',
        variant: 'banner',
        message: strings('perps.loading_positions'),
      },
    ];
  }

  if (reduceOnlyErrorCode) {
    return [
      {
        id: 'reduce-only',
        variant: 'banner',
        message: strings(REDUCE_ONLY_ERROR_I18N_KEYS[reduceOnlyErrorCode]),
      },
    ];
  }

  const marginError = filteredErrors.find(isMarginValidationError);
  if (marginError) {
    return [{ id: 'margin', variant: 'banner', message: marginError }];
  }

  const limitPriceError = filteredErrors.find(isLimitPriceValidationError);
  if (limitPriceError) {
    return [
      {
        id: 'limit-price',
        variant: 'banner',
        message: limitPriceError,
      },
    ];
  }

  return filteredErrors.map((message, index) => ({
    id: `validation-${index}`,
    variant: 'inline',
    message,
  }));
};

const getTpslNotices = ({
  reduceOnly,
  direction,
  doesStopLossRiskLiquidation,
  isTakeProfitPriceInvalid,
  isStopLossPriceInvalid,
  tpslPriceType,
}: {
  reduceOnly: boolean;
  direction: PerpsProOrderDirection;
  doesStopLossRiskLiquidation: boolean;
  isTakeProfitPriceInvalid: boolean;
  isStopLossPriceInvalid: boolean;
  tpslPriceType: PerpsOrderTpSlWarnings['tpslPriceType'];
}): PerpsProOrderNotice[] => {
  if (reduceOnly) {
    return [];
  }

  const notices: PerpsProOrderNotice[] = [];
  const isLong = direction === 'long';

  if (doesStopLossRiskLiquidation) {
    notices.push({
      id: 'sl-liq-risk',
      variant: 'inline',
      message: strings('perps.tpsl.stop_loss_order_view_warning', {
        direction: strings(isLong ? 'perps.tpsl.below' : 'perps.tpsl.above'),
      }),
    });
  }

  if (isTakeProfitPriceInvalid) {
    notices.push({
      id: 'tp-invalid',
      variant: 'inline',
      message: strings('perps.tpsl.take_profit_wrong_side_warning', {
        direction: strings(isLong ? 'perps.tpsl.above' : 'perps.tpsl.below'),
        priceType: tpslPriceType,
      }),
    });
  }

  if (isStopLossPriceInvalid) {
    notices.push({
      id: 'sl-invalid',
      variant: 'inline',
      message: strings('perps.tpsl.stop_loss_wrong_side_warning', {
        direction: strings(isLong ? 'perps.tpsl.below' : 'perps.tpsl.above'),
        priceType: tpslPriceType,
      }),
    });
  }

  return notices;
};

export interface UsePerpsProOrderFormParams {
  market: PerpsMarketData;
  /** Feature-gate trigger order placement as well as the type picker. */
  isTriggeredOrdersEnabled: boolean;
  /** Gate Hyperliquid TWAP placement as well as the type picker. */
  isTwapEnabled: boolean;
  /** True while a rollout-enabled market capability query is unresolved. */
  isTwapAvailabilityPending: boolean;
  /** Concrete provider route returned by the ready capability response. */
  resolvedTwapProviderId?: PerpsProviderType;
  /** Feature-gate Scale order placement as well as the type picker. */
  isScaleOrdersEnabled: boolean;
  /** Prevent placement while selected-route Scale support is refreshing. */
  isScaleOrderSupportPending: boolean;
  /** Re-check selected-route Scale support immediately before placement. */
  checkScaleOrderSupport: () => Promise<boolean>;
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
  onLimitPriceBlur: () => void;
  onUseMidPricePress: () => void;
  triggerPrice: string;
  onTriggerPriceChange: (value: string) => void;
  onTriggerPriceBlur: () => void;
  priceCardMessage?: {
    severity: 'error' | 'warning';
    message: string;
  };
  sizeInput: PerpsProSizeInputModel;
  sizeSlider: PerpsProSizeSliderModel;
  effectiveUsdAmount: string;
  availableBalance: string;
  onAddFundsPress: () => void;
  reduceOnly: boolean;
  onReduceOnlyChange: (value: boolean) => void;
  twap: PerpsProTwapModel;
  isTPSLConfigured: boolean;
  onTPSLPress: () => void;
  notices: PerpsProOrderNotice[];
  summary: PerpsProOrderSummaryProps;
  scaleOrder: PerpsProScaleOrderModel;
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
  isTriggeredOrdersEnabled,
  isTwapEnabled,
  isTwapAvailabilityPending,
  resolvedTwapProviderId,
  isScaleOrdersEnabled,
  isScaleOrderSupportPending,
  checkScaleOrderSupport,
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
  const { playImpact } = useHaptics();
  const { showToast, PerpsToastOptions } = usePerpsToasts();
  const { updatePositionTPSL } = usePerpsTrading();

  const {
    orderForm,
    updateOrderForm,
    setAmount,
    setLeverage,
    setDirection,
    setTakeProfitPrice,
    setStopLossPrice,
    setLimitPrice,
    commitLimitPrice,
    commitTriggerPrice,
    hasBlurredLimitPrice,
    hasBlurredTriggerPrice,
    triggerPrice,
    setTriggerPrice,
    resetPriceInputInteraction,
    setOrderType,
    maxPossibleAmount,
    setMaxPossibleAmountOverride,
    balanceForValidation: spendableBalance,
  } = usePerpsOrderContext();

  // Local (Pro-only) state
  const [reduceOnly, setReduceOnly] = useState(false);
  const [twapDays, setTwapDays] = useState('');
  const [twapHours, setTwapHours] = useState('');
  const [twapMinutes, setTwapMinutes] = useState(
    PERPS_TWAP_UI_CONFIG.DefaultMinutes,
  );
  const [twapRandomize, setTwapRandomize] = useState(false);
  const resetTwapDraft = useCallback(() => {
    setTwapDays('');
    setTwapHours('');
    setTwapMinutes(PERPS_TWAP_UI_CONFIG.DefaultMinutes);
    setTwapRandomize(false);
  }, []);
  const [isLeverageVisible, setIsLeverageVisible] = useState(false);
  const [isSlippageVisible, setIsSlippageVisible] = useState(false);
  const [isOrderTypeVisible, setIsOrderTypeVisible] = useState(false);
  const [scaleStartPrice, setScaleStartPrice] = useState('');
  const [scaleEndPrice, setScaleEndPrice] = useState('');
  const [scaleTotalOrders, setScaleTotalOrders] = useState(
    SCALE_DEFAULT_ORDERS.toString(),
  );
  const [scaleSizeSkew, setScaleSizeSkew] = useState(SCALE_DEFAULT_SKEW);
  const [selectedTooltip, setSelectedTooltip] =
    useState<PerpsTooltipContentKey | null>(null);
  const isSubmittingRef = useRef(false);
  const lastTrackedScaleValidationRef = useRef<
    ScaleOrderValidationCode | undefined
  >(undefined);

  const { maxSlippageBps, maxSlippageSource, setMaxSlippage } =
    usePerpsMaxSlippage();
  const resolvedMaxSlippageBps = resolvePerpsMaxSlippageBps({
    orderType: orderForm.type,
    maxSlippageBps,
    maxSlippageSource,
  });
  const { isAtCap } = usePerpsOICap(symbol);
  const vipTier = useVipTier();

  const {
    handleAddFunds,
    isEligible,
    isEligibilityModalVisible,
    closeEligibilityModal,
    showEligibilityModal,
  } = usePerpsHomeActions({
    buttonLocation: PERPS_EVENT_VALUE.BUTTON_LOCATION.PERPS_ASSET_SCREEN,
  });

  const selectedAddress = useSelector(selectSelectedInternalAccountAddress);
  const { gate } = useComplianceGate(selectedAddress ?? '');

  const {
    marketData,
    isLoading: isMarketDataLoading,
    error: marketDataError,
  } = usePerpsMarketData({
    asset: symbol,
    showErrorToast: false,
  });
  const { minimumOrderAmount } = useMinimumOrderAmount({ asset: symbol });
  const szDecimals =
    marketData?.szDecimals ?? DECIMAL_PRECISION_CONFIG.FallbackSizeDecimals;
  const maxLeverage =
    marketData?.maxLeverage ?? PERPS_CONSTANTS.DefaultMaxLeverage;
  const isLoadingMarketData = isMarketDataLoading && marketData === null;
  const isScaleOrder = orderForm.type === 'scale';

  useEffect(() => {
    if (isScaleOrder && !isScaleOrderSupportPending && !isScaleOrdersEnabled) {
      setOrderType('market');
    }
  }, [
    isScaleOrder,
    isScaleOrdersEnabled,
    isScaleOrderSupportPending,
    setOrderType,
  ]);

  const normalizeScaleInput = useCallback(
    (value: string, previousValue: string, setter: (next: string) => void) => {
      const result = normalizeNumericTextInput(value, previousValue, {
        maxDigits: MAX_PERPS_INPUT_DIGITS,
        acceptedDecimalSeparators: ['.', ','],
      });
      if (result.ok) {
        setter(result.value);
      }
    },
    [],
  );

  const {
    existingPosition: currentMarketPosition,
    isLoading: isPositionStreamLoading,
  } = useHasExistingPosition({
    asset: symbol,
    loadOnMount: true,
  });
  const isReduceOnlyPositionLoading = reduceOnly && isPositionStreamLoading;

  const prices = usePerpsLivePrices({ symbols: [symbol], throttleMs: 1000 });
  const currentPrice = prices[symbol];
  const currentTopOfBook = usePerpsTopOfBook({ symbol });

  const assetData = useMemo(() => {
    if (!currentPrice) {
      return { price: 0, change: 0, markPrice: 0 };
    }
    const price = Number.parseFloat(currentPrice.price || '0');
    const markPrice = Number.parseFloat(currentPrice.markPrice || '0');
    const change = Number.parseFloat(currentPrice.percentChange24h || '0');
    return {
      price: Number.isNaN(price) ? 0 : price,
      markPrice: Number.isNaN(markPrice) ? 0 : markPrice,
      change: Number.isNaN(change) ? 0 : change,
    };
  }, [currentPrice]);
  const latestMidPriceRef = useRef(assetData.price);
  useLayoutEffect(() => {
    latestMidPriceRef.current = assetData.price;
  }, [assetData.price]);

  const marketDataBlockingReason = getMarketDataBlockingReason({
    isLoading: isLoadingMarketData,
    hasError: Boolean(marketDataError),
    price: assetData.price,
  });
  const isMarketDataBlocking = marketDataBlockingReason !== null;

  const normalizedTriggerPrice = canonicalizeOrderPrice(
    triggerPrice,
    szDecimals,
  );
  const normalizedLimitPrice = canonicalizeOrderPrice(
    orderForm.limitPrice,
    szDecimals,
  );

  const effectiveInputPrice = useMemo(
    () =>
      getProspectiveExecutionPrice({
        orderType: orderForm.type,
        limitPrice: normalizedLimitPrice,
        triggerPrice: normalizedTriggerPrice,
        marketPrice: assetData.price,
      }),
    [
      assetData.price,
      normalizedLimitPrice,
      normalizedTriggerPrice,
      orderForm.type,
    ],
  );

  const reduceOnlyPositionError = useMemo(
    () =>
      getReduceOnlyPositionError({
        reduceOnly,
        direction: orderForm.direction,
        position: currentMarketPosition,
      }),
    [currentMarketPosition, orderForm.direction, reduceOnly],
  );
  const keepReduceOnlySizeEmpty =
    Boolean(reduceOnlyPositionError) && !isReduceOnlyPositionLoading;

  // Reduce-only orders close existing size; slider 100% is the open position,
  // not available-margin × leverage. Position errors keep the margin-based
  // range so the slider stays movable while the size field stays empty.
  // While the position stream is unresolved, keep the margin-based range and
  // typed size — same as notices skipping until the snapshot can be evaluated.
  const sizeSliderMaxAmount = useMemo(() => {
    if (!reduceOnly || isReduceOnlyPositionLoading || keepReduceOnlySizeEmpty) {
      return maxPossibleAmount;
    }

    return getReduceOnlyMaxUsdAmount({
      positionSize: currentMarketPosition?.size,
      price: effectiveInputPrice,
    });
  }, [
    currentMarketPosition?.size,
    effectiveInputPrice,
    isReduceOnlyPositionLoading,
    keepReduceOnlySizeEmpty,
    maxPossibleAmount,
    reduceOnly,
  ]);

  const {
    sizeInput,
    sizeSlider,
    effectiveUsdAmount,
    commitPendingSliderPreview,
    isAtMaxAmount,
  } = usePerpsProSizeInput({
    usdAmount: orderForm.amount,
    setAmount,
    assetSymbol: symbol,
    effectivePrice: effectiveInputPrice,
    szDecimals,
    maxPossibleAmount: sizeSliderMaxAmount,
    maxDigits: MAX_PERPS_INPUT_DIGITS,
    keepSizeEmpty: keepReduceOnlySizeEmpty,
  });

  const isTwapOrder = orderForm.type === 'twap';
  const orderProviderId = isTwapOrder ? resolvedTwapProviderId : undefined;
  const isTwapEnabledRef = useRef(isTwapEnabled);
  const resolvedTwapProviderIdRef = useRef(resolvedTwapProviderId);

  useLayoutEffect(() => {
    isTwapEnabledRef.current = isTwapEnabled;
    resolvedTwapProviderIdRef.current = resolvedTwapProviderId;
  }, [isTwapEnabled, resolvedTwapProviderId]);

  useEffect(() => {
    if (isTwapOrder && !isTwapEnabled && !isTwapAvailabilityPending) {
      setOrderType('market');
      resetTwapDraft();
    }
  }, [
    isTwapAvailabilityPending,
    isTwapEnabled,
    isTwapOrder,
    resetTwapDraft,
    setOrderType,
  ]);

  const exactFullCloseSize = useMemo(() => {
    if (
      !reduceOnly ||
      !isAtMaxAmount ||
      isReduceOnlyPositionLoading ||
      keepReduceOnlySizeEmpty ||
      !currentMarketPosition?.size
    ) {
      return undefined;
    }

    const absolutePositionSize = new BigNumber(
      currentMarketPosition.size,
    ).abs();
    if (!absolutePositionSize.isFinite() || absolutePositionSize.lte(0)) {
      return undefined;
    }

    return formatHyperLiquidSize({
      size: absolutePositionSize.toString(),
      szDecimals,
    });
  }, [
    currentMarketPosition?.size,
    isAtMaxAmount,
    isReduceOnlyPositionLoading,
    keepReduceOnlySizeEmpty,
    reduceOnly,
    szDecimals,
  ]);
  const isExactFullClose = exactFullCloseSize !== undefined;

  const scaleLadderResult = useMemo<ScaleLadderResult>(() => {
    const minPrice = Number(scaleStartPrice);
    const maxPrice = Number(scaleEndPrice);
    const orderCount = Number(scaleTotalOrders);
    const skew = Number(scaleSizeSkew);
    const targetOrderValue = new BigNumber(effectiveUsdAmount);

    if (
      !Number.isFinite(minPrice) ||
      !Number.isFinite(maxPrice) ||
      minPrice <= 0 ||
      maxPrice <= 0
    ) {
      return { success: false, code: 'prices_required' };
    }
    if (minPrice >= maxPrice) {
      return { success: false, code: 'invalid_range' };
    }
    if (
      !Number.isInteger(orderCount) ||
      orderCount < SCALE_ORDER_COUNT.min ||
      orderCount > SCALE_ORDER_COUNT.max
    ) {
      return { success: false, code: 'invalid_order_count' };
    }
    if (!Number.isFinite(skew) || skew <= 0) {
      return { success: false, code: 'invalid_skew' };
    }
    if (
      exactFullCloseSize === undefined &&
      (!targetOrderValue.isFinite() || targetOrderValue.lte(0))
    ) {
      return { success: false, code: 'minimum_lot' };
    }

    try {
      const scalePrices = computeScalePriceLadder({
        minPrice,
        maxPrice,
        count: orderCount,
      }).map((price) => formatHyperLiquidPrice({ price, szDecimals }));
      if (new Set(scalePrices).size !== scalePrices.length) {
        return { success: false, code: 'invalid_range' };
      }

      const weights = scalePrices.map(
        (_price, index) => 1 + ((skew - 1) * index) / (orderCount - 1),
      );
      const weightTotal = weights.reduce(
        (total, weight) => total.plus(weight),
        new BigNumber(0),
      );
      const weightedAveragePrice = scalePrices
        .reduce(
          (total, price, index) =>
            total.plus(new BigNumber(price).times(weights[index])),
          new BigNumber(0),
        )
        .div(weightTotal);
      let totalSize =
        exactFullCloseSize ??
        targetOrderValue
          .div(weightedAveragePrice)
          .decimalPlaces(szDecimals, BigNumber.ROUND_CEIL)
          .toFixed(szDecimals);

      const buildRungs = (size: string) => {
        const sizes = splitScaleSizes({
          totalSize: Number(size),
          count: orderCount,
          szDecimals,
          skew,
        });
        return scalePrices.map((price, index) => ({
          index,
          price,
          size: sizes[index],
        }));
      };
      const getOrderValue = (rungs: PerpsProScaleOrderModel['rungs']) =>
        rungs.reduce(
          (total, rung) =>
            total.plus(new BigNumber(rung.size).times(rung.price)),
          new BigNumber(0),
        );

      let rungs = buildRungs(totalSize);
      let orderValue = getOrderValue(rungs);
      if (exactFullCloseSize === undefined && orderValue.lt(targetOrderValue)) {
        const sizeMultiplier = new BigNumber(10).pow(szDecimals);
        const initialSizeUnits = new BigNumber(totalSize)
          .times(sizeMultiplier)
          .integerValue(BigNumber.ROUND_HALF_UP);
        const maxSafeSizeUnits = new BigNumber(Number.MAX_SAFE_INTEGER);
        let lowerSizeUnits = initialSizeUnits;
        let upperLadder:
          | {
              sizeUnits: BigNumber;
              rungs: PerpsProScaleOrderModel['rungs'];
              orderValue: BigNumber;
            }
          | undefined;
        let sizeStep = new BigNumber(1);

        // Bracket a valid grid size exponentially so extreme accepted skews do
        // not block the UI by advancing one venue increment at a time.
        for (
          let attempt = 0;
          attempt < SCALE_SIZE_SEARCH_MAX_STEPS;
          attempt += 1
        ) {
          const candidateSizeUnits = initialSizeUnits.plus(sizeStep);
          if (candidateSizeUnits.gt(maxSafeSizeUnits)) {
            break;
          }
          const candidateSize = candidateSizeUnits
            .div(sizeMultiplier)
            .toFixed(szDecimals);
          const candidateRungs = buildRungs(candidateSize);
          const candidateOrderValue = getOrderValue(candidateRungs);

          if (candidateOrderValue.gte(targetOrderValue)) {
            upperLadder = {
              sizeUnits: candidateSizeUnits,
              rungs: candidateRungs,
              orderValue: candidateOrderValue,
            };
            break;
          }

          lowerSizeUnits = candidateSizeUnits;
          sizeStep = sizeStep.times(2);
        }

        if (!upperLadder) {
          return { success: false, code: 'minimum_lot' };
        }

        // Refine the bracket in bounded time. The upper endpoint always holds
        // a controller-accepted ladder that meets the requested notional.
        for (
          let attempt = 0;
          attempt < SCALE_SIZE_SEARCH_MAX_STEPS &&
          upperLadder.sizeUnits.minus(lowerSizeUnits).gt(1);
          attempt += 1
        ) {
          const candidateSizeUnits = lowerSizeUnits
            .plus(upperLadder.sizeUnits)
            .div(2)
            .integerValue(BigNumber.ROUND_FLOOR);
          const candidateSize = candidateSizeUnits
            .div(sizeMultiplier)
            .toFixed(szDecimals);
          const candidateRungs = buildRungs(candidateSize);
          const candidateOrderValue = getOrderValue(candidateRungs);

          if (candidateOrderValue.gte(targetOrderValue)) {
            upperLadder = {
              sizeUnits: candidateSizeUnits,
              rungs: candidateRungs,
              orderValue: candidateOrderValue,
            };
          } else {
            lowerSizeUnits = candidateSizeUnits;
          }
        }

        totalSize = upperLadder.sizeUnits
          .div(sizeMultiplier)
          .toFixed(szDecimals);
        rungs = upperLadder.rungs;
        orderValue = upperLadder.orderValue;
      }
      if (
        rungs.some(
          (rung) => Number(rung.size) * Number(rung.price) < minimumOrderAmount,
        )
      ) {
        return { success: false, code: 'minimum_lot' };
      }

      return {
        success: true,
        rungs,
        minPrice: minPrice.toString(),
        maxPrice: maxPrice.toString(),
        orderCount,
        skew,
        orderValue: orderValue.toFixed(),
        totalSize: formatHyperLiquidSize({ size: totalSize, szDecimals }),
      };
    } catch {
      // Controller preview helpers reject values that cannot survive venue
      // precision; translate that expected validation outcome into form copy.
      return { success: false, code: 'minimum_lot' };
    }
  }, [
    effectiveUsdAmount,
    exactFullCloseSize,
    minimumOrderAmount,
    scaleEndPrice,
    scaleSizeSkew,
    scaleStartPrice,
    scaleTotalOrders,
    szDecimals,
  ]);

  const scaleAveragePrice = useMemo(() => {
    if (scaleLadderResult.success) {
      return new BigNumber(scaleLadderResult.orderValue)
        .div(scaleLadderResult.totalSize)
        .toFixed();
    }

    const start = Number.parseFloat(scaleStartPrice);
    const end = Number.parseFloat(scaleEndPrice);
    return Number.isFinite(start) && Number.isFinite(end)
      ? ((start + end) / 2).toString()
      : undefined;
  }, [scaleEndPrice, scaleLadderResult, scaleStartPrice]);
  const calculationOrderType: OrderType = isScaleOrder
    ? 'limit'
    : orderForm.type;
  const calculationLimitPrice = isScaleOrder
    ? scaleAveragePrice
    : normalizedLimitPrice;
  const calculationUsdAmount =
    isScaleOrder && scaleLadderResult.success
      ? scaleLadderResult.orderValue
      : effectiveUsdAmount;

  const feeResults = usePerpsOrderFees({
    orderType: calculationOrderType,
    amount: calculationUsdAmount,
    symbol: orderForm.asset,
    providerId: orderProviderId,
    isClosing: reduceOnly,
    limitPrice: calculationLimitPrice,
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

  const isMarketOrder = calculationOrderType === 'market';
  const isTriggerMarketOrder =
    isTriggerOrderType(orderForm.type) &&
    getTriggerExecution(orderForm.type) === 'market';
  const hidesSlippage =
    isScaleOrder || isLimitExecutionOrderType(orderForm.type) || isTwapOrder;
  const hasValidAmount = Number.parseFloat(effectiveUsdAmount) > 0;

  const orderUsdAmount = useMemo(
    () => Number.parseFloat(effectiveUsdAmount) || 0,
    [effectiveUsdAmount],
  );
  const twapDuration = useMemo(
    () =>
      (Number.parseInt(twapDays, 10) || 0) *
        PERPS_TWAP_UI_CONFIG.HoursPerDay *
        PERPS_TWAP_UI_CONFIG.MinutesPerHour +
      (Number.parseInt(twapHours, 10) || 0) *
        PERPS_TWAP_UI_CONFIG.MinutesPerHour +
      (Number.parseInt(twapMinutes, 10) || 0),
    [twapDays, twapHours, twapMinutes],
  );
  const hasTwapDurationInput =
    twapDays !== '' || twapHours !== '' || twapMinutes !== '';
  const twapDurationMissing = isTwapOrder && !hasTwapDurationInput;
  const twapPartError =
    isTwapOrder &&
    ((twapDays !== '' &&
      Number.parseInt(twapDays, 10) > PERPS_TWAP_UI_CONFIG.MaximumDays) ||
      (twapHours !== '' &&
        Number.parseInt(twapHours, 10) > PERPS_TWAP_UI_CONFIG.MaximumHours) ||
      (twapMinutes !== '' &&
        Number.parseInt(twapMinutes, 10) >
          PERPS_TWAP_UI_CONFIG.MaximumMinutes));
  const twapDurationError =
    isTwapOrder &&
    hasTwapDurationInput &&
    (twapPartError ||
      twapDuration < PERPS_TWAP_UI_CONFIG.MinimumDurationMinutes ||
      twapDuration > PERPS_TWAP_UI_CONFIG.MaximumDurationMinutes);
  const twapDurationErrorMessage = twapDurationError
    ? strings(
        'perps.pro_order_form.twap.duration_range',
        PERPS_TWAP_UI_CONFIG.DurationRangeI18nValues,
      )
    : twapDurationMissing
      ? strings('perps.errors.orderValidation.twapDurationRequired')
      : undefined;
  const twapMinimumSizeError =
    isTwapOrder &&
    orderUsdAmount > 0 &&
    orderUsdAmount < PERPS_TWAP_UI_CONFIG.MinimumNotionalUsd;
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
    estimatedSlippageBps > resolvedMaxSlippageBps;

  const { effectivePrice, positionSize, marginRequired } = useMemo(
    () =>
      deriveOrderSizing({
        amount: calculationUsdAmount,
        orderType: calculationOrderType,
        limitPrice: calculationLimitPrice,
        triggerPrice: normalizedTriggerPrice,
        marketPrice: assetData.price,
        markPrice: assetData.markPrice,
        leverage: orderForm.leverage,
        szDecimals,
        isBuy: orderForm.direction === 'long',
        maxSlippageBps: resolvedMaxSlippageBps,
        isLoadingMarketData,
      }),
    [
      calculationUsdAmount,
      calculationOrderType,
      calculationLimitPrice,
      normalizedTriggerPrice,
      orderForm.leverage,
      orderForm.direction,
      assetData.price,
      assetData.markPrice,
      szDecimals,
      isLoadingMarketData,
      resolvedMaxSlippageBps,
    ],
  );
  const submissionPositionSize =
    isScaleOrder && scaleLadderResult.success
      ? scaleLadderResult.totalSize
      : (exactFullCloseSize ?? positionSize);
  const effectiveMarginRequired =
    isScaleOrder && scaleLadderResult.success
      ? calculateMarginRequired({
          amount: scaleLadderResult.orderValue,
          leverage: orderForm.leverage,
        })
      : marginRequired;
  const scaleRungs = useMemo(
    () => (scaleLadderResult.success ? scaleLadderResult.rungs : []),
    [scaleLadderResult],
  );
  const scaleAnalyticsProperties = useMemo(() => {
    const minPrice = Number(scaleStartPrice);
    const maxPrice = Number(scaleEndPrice);
    const orderCount = Number(scaleTotalOrders);
    const skew = Number(scaleSizeSkew);
    const orderValue = Number(
      scaleLadderResult.success
        ? scaleLadderResult.orderValue
        : effectiveUsdAmount,
    );
    const scaleRangePercentage = getScaleRangePercentage(minPrice, maxPrice);

    return {
      [PERPS_EVENT_PROPERTY.ASSET]: orderForm.asset,
      [PERPS_EVENT_PROPERTY.ORDER_TYPE]: PERPS_EVENT_VALUE.ORDER_TYPE.SCALE,
      [PERPS_EVENT_PROPERTY.ORDER_VALUE]:
        Number.isFinite(orderValue) && orderValue > 0 ? orderValue : undefined,
      [SCALE_EVENT_PROPERTY.ORDER_COUNT]: Number.isInteger(orderCount)
        ? orderCount
        : undefined,
      [SCALE_EVENT_PROPERTY.RANGE_PERCENT]: scaleRangePercentage,
      [SCALE_EVENT_PROPERTY.SKEW]: Number.isFinite(skew) ? skew : undefined,
      [SCALE_EVENT_PROPERTY.REDUCE_ONLY]: reduceOnly,
    };
  }, [
    effectiveUsdAmount,
    orderForm.asset,
    reduceOnly,
    scaleEndPrice,
    scaleLadderResult,
    scaleSizeSkew,
    scaleStartPrice,
    scaleTotalOrders,
  ]);

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
  const effectiveOrderForm = useMemo(
    () => ({
      ...orderForm,
      amount: calculationUsdAmount,
      type: calculationOrderType,
      limitPrice: calculationLimitPrice,
    }),
    [
      calculationLimitPrice,
      calculationOrderType,
      calculationUsdAmount,
      orderForm,
    ],
  );

  const reduceOnlyValidation = useMemo(
    () =>
      validateReduceOnlyOrder({
        reduceOnly,
        direction: orderForm.direction,
        orderSize: submissionPositionSize,
        position: currentMarketPosition,
      }),
    [
      reduceOnly,
      orderForm.direction,
      submissionPositionSize,
      currentMarketPosition,
    ],
  );

  const orderValidation = usePerpsOrderValidation({
    orderForm: effectiveOrderForm,
    positionSize: submissionPositionSize,
    assetPrice: assetData.price,
    spendableBalance,
    // Reduce-only orders release margin from the existing position; they don't
    // draw from spendableBalance. Pass '0' so the balance gate is not triggered
    // for a valid close/reduce when free collateral is low.
    marginRequired: reduceOnly ? '0' : effectiveMarginRequired || '0',
    existingPositionLeverage: existingPositionLeverageForValidation,
    // Skip protocol validation until position data is ready so we don't flash
    // unrelated errors while waiting for the position snapshot.
    skipValidation: isReduceOnlyPositionLoading,
    originalUsdAmount:
      isExactFullClose || isScaleOrder ? undefined : effectiveUsdAmount,
    reduceOnly,
    isFullClose: reduceOnlyValidation.isFullClose || isExactFullClose,
    triggerPrice: normalizedTriggerPrice,
    midPrice: assetData.price,
    szDecimals,
    twapDuration: isTwapOrder ? twapDuration : undefined,
    twapRandomize: isTwapOrder ? twapRandomize : undefined,
    providerId: orderProviderId,
    suppressedProtocolErrorCodes: isTwapOrder
      ? TWAP_OWNED_PROTOCOL_ERROR_CODES
      : undefined,
  });
  const { validateNow } = orderValidation;

  const filteredErrors = useMemo(() => {
    const sizePositiveMsg = strings(
      'perps.errors.orderValidation.sizePositive',
    );
    const withoutSize = orderValidation.errors.filter(
      (err) => err !== sizePositiveMsg,
    );
    const fieldMessages = new Set(
      orderValidation.fieldIssues.map(getOrderFormFieldIssueMessage),
    );
    return withoutSize.filter((err) => !fieldMessages.has(err));
  }, [orderValidation.errors, orderValidation.fieldIssues]);
  const scaleValidationNotice = useMemo<PerpsProOrderNotice | undefined>(() => {
    if (!isScaleOrder || scaleLadderResult.success) {
      return undefined;
    }
    return {
      id: 'scale',
      variant: 'banner',
      message: strings(SCALE_ERROR_I18N_KEYS[scaleLadderResult.code]),
    };
  }, [isScaleOrder, scaleLadderResult]);

  useEffect(() => {
    if (!isScaleOrder || scaleLadderResult.success) {
      lastTrackedScaleValidationRef.current = undefined;
      return;
    }
    if (lastTrackedScaleValidationRef.current === scaleLadderResult.code) {
      return;
    }

    lastTrackedScaleValidationRef.current = scaleLadderResult.code;
    track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
      [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
        SCALE_INTERACTION_TYPE.VALIDATION_ERROR_SHOWN,
      [PERPS_EVENT_PROPERTY.ERROR_TYPE]: scaleLadderResult.code,
      ...scaleAnalyticsProperties,
    });
  }, [isScaleOrder, scaleAnalyticsProperties, scaleLadderResult, track]);

  const {
    doesStopLossRiskLiquidation,
    isTakeProfitPriceInvalid,
    isStopLossPriceInvalid,
    tpslPriceType,
  } = getPerpsOrderTpSlWarnings({
    orderType: orderForm.type,
    limitPrice: normalizedLimitPrice,
    direction: orderForm.direction,
    takeProfitPrice: orderForm.takeProfitPrice,
    stopLossPrice: orderForm.stopLossPrice,
    liquidationPrice,
    marketPrice: assetData.price,
  });
  const standardOrderToastOptions =
    isScaleOrder ||
    isLimitExecutionOrderType(orderForm.type) ||
    isTriggerOrderType(orderForm.type)
      ? PerpsToastOptions.orderManagement.limit
      : PerpsToastOptions.orderManagement.market;

  const { placeOrder: executeOrder, isPlacing } = usePerpsOrderExecution({
    onSuccess: () => {
      if (isScaleOrder) {
        return;
      }
      const toast = isTwapOrder
        ? PerpsToastOptions.orderManagement.twap.confirmed(
            orderForm.direction,
            submissionPositionSize,
            orderForm.asset,
            twapDuration,
          )
        : standardOrderToastOptions.confirmed(
            orderForm.direction,
            submissionPositionSize,
            orderForm.asset,
          );
      showToast(toast);
    },
    onError: (error) => {
      const toast = isTwapOrder
        ? PerpsToastOptions.orderManagement.twap.creationFailed(error)
        : standardOrderToastOptions.creationFailed(error);
      showToast(toast);
    },
  });

  const hasTpslBlocker =
    !reduceOnly &&
    !isTriggerOrderType(orderForm.type) &&
    (doesStopLossRiskLiquidation ||
      isTakeProfitPriceInvalid ||
      isStopLossPriceInvalid);
  const directionTrackingValue =
    orderForm.direction === 'long'
      ? PERPS_EVENT_VALUE.DIRECTION.LONG
      : PERPS_EVENT_VALUE.DIRECTION.SHORT;

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
      [PERPS_EVENT_PROPERTY.DIRECTION]: directionTrackingValue,
    });

    if (!isTriggeredOrdersEnabled && isTriggerOrderType(orderForm.type)) {
      showToast(
        PerpsToastOptions.formValidation.orderForm.validationError(
          strings('perps.order.validation.trigger_orders_unavailable'),
        ),
      );
      return;
    }

    if (!isTwapEnabledRef.current && isTwapOrder) {
      showToast(
        PerpsToastOptions.formValidation.orderForm.validationError(
          strings('perps.order.validation.twap_unavailable'),
        ),
      );
      return;
    }

    // Defensive guard for stale or programmatic invocations. The rendered CTA
    // is already disabled for both expected blocking states.
    if (isMarketDataBlocking || isAtCap) {
      return;
    }

    const reportValidationFailure = (message: string) => {
      showToast(
        PerpsToastOptions.formValidation.orderForm.validationError(message),
      );
      track(MetaMetricsEvents.PERPS_ERROR, {
        [PERPS_EVENT_PROPERTY.ERROR_TYPE]:
          PERPS_EVENT_VALUE.ERROR_TYPE.VALIDATION,
        [PERPS_EVENT_PROPERTY.ERROR_MESSAGE]: message,
        [PERPS_EVENT_PROPERTY.SCREEN_NAME]:
          PERPS_EVENT_VALUE.SCREEN_NAME.PERPS_ORDER,
        [PERPS_EVENT_PROPERTY.SCREEN_TYPE]:
          PERPS_EVENT_VALUE.SCREEN_TYPE.TRADING,
      });
    };

    if ((!isScaleOrdersEnabled || isScaleOrderSupportPending) && isScaleOrder) {
      showToast(
        PerpsToastOptions.formValidation.orderForm.validationError(
          strings('perps.pro_order_form.scale.validation.unavailable'),
        ),
      );
      return;
    }

    const currentFieldIssues = isScaleOrder
      ? []
      : getOrderFormFieldIssues({
          orderType: orderForm.type,
          direction: orderForm.direction,
          triggerPrice: normalizedTriggerPrice,
          limitPrice: normalizedLimitPrice,
          midPrice: assetData.price,
          szDecimals,
        });
    if (currentFieldIssues.length > 0) {
      const firstIssue = currentFieldIssues[0];
      const message = getOrderFormFieldIssueMessage(firstIssue);
      reportValidationFailure(message);
      return;
    }

    if (exceedsMaxSlippage && typeof estimatedSlippageBps === 'number') {
      const estPct = bpsToPercent(estimatedSlippageBps);
      const maxPct = bpsToPercent(resolvedMaxSlippageBps);
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

    if (hasTpslBlocker) {
      return;
    }

    if (twapDurationMissing || twapDurationError || twapMinimumSizeError) {
      return;
    }

    if (
      isReduceOnlyPositionLoading ||
      (reduceOnly && !reduceOnlyValidation.isValid)
    ) {
      return;
    }

    isSubmittingRef.current = true;

    try {
      const validationResult = await validateNow();
      if (!validationResult.isValid) {
        const firstFieldIssue = validationResult.fieldIssues[0];
        const firstError =
          validationResult.errors[0] ||
          (firstFieldIssue
            ? getOrderFormFieldIssueMessage(firstFieldIssue)
            : strings('perps.order.validation.error'));
        reportValidationFailure(firstError);
        return;
      }

      if (
        isTwapOrder &&
        (!isTwapEnabledRef.current ||
          resolvedTwapProviderIdRef.current !== orderProviderId)
      ) {
        reportValidationFailure(
          strings('perps.order.validation.twap_unavailable'),
        );
        return;
      }

      const latestFieldIssues = getOrderFormFieldIssues({
        orderType: orderForm.type,
        direction: orderForm.direction,
        triggerPrice: normalizedTriggerPrice,
        limitPrice: normalizedLimitPrice,
        midPrice: latestMidPriceRef.current,
        szDecimals,
      });
      if (latestFieldIssues.length > 0) {
        reportValidationFailure(
          getOrderFormFieldIssueMessage(latestFieldIssues[0]),
        );
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
        return;
      }

      if (isScaleOrder) {
        if (!(await checkScaleOrderSupport())) {
          showToast(
            PerpsToastOptions.formValidation.orderForm.validationError(
              strings('perps.pro_order_form.scale.validation.unavailable'),
            ),
          );
          return;
        }

        if (!scaleLadderResult.success) {
          showToast(
            PerpsToastOptions.formValidation.orderForm.validationError(
              strings(SCALE_ERROR_I18N_KEYS[scaleLadderResult.code]),
            ),
          );
          return;
        }

        const trackingData = buildPerpsOrderTrackingData({
          marginRequired: effectiveMarginRequired,
          feeResults,
          marketPrice: assetData.price,
          inputMethod: 'default',
          source,
          sourceSection,
          currentMarketPosition,
          direction: orderForm.direction,
          chartLibrary,
          vipTier,
        });
        const scaleOrderParams = {
          ...buildPerpsOrderParams({
            asset: orderForm.asset,
            isBuy: orderForm.direction === 'long',
            size: submissionPositionSize,
            orderType: 'scale',
            effectivePrice,
            leverage: orderForm.leverage,
            maxSlippageBps: resolvedMaxSlippageBps,
            reduceOnly,
            isFullClose: reduceOnly
              ? reduceOnlyValidation.isFullClose || isExactFullClose
              : undefined,
            trackingData,
          }),
          scaleMinPrice: scaleLadderResult.minPrice,
          scaleMaxPrice: scaleLadderResult.maxPrice,
          scaleNumOrders: scaleLadderResult.orderCount,
          scaleSkew: scaleLadderResult.skew,
        };

        // Haptics are non-critical feedback; a device haptics failure must not
        // prevent the already-validated controller request from being placed.
        playImpact(ImpactMoment.PrimaryCTA).catch(() => undefined);
        showToast({
          ...PerpsToastOptions.orderManagement.limit.submitted(
            orderForm.direction,
            submissionPositionSize,
            orderForm.asset,
          ),
          labelOptions: [
            {
              label: strings('perps.pro_order_form.scale.orders_submitted'),
            },
            {
              label: strings('perps.pro_order_form.scale.submission_summary', {
                totalCount: scaleLadderResult.orderCount,
                size: submissionPositionSize,
                assetSymbol: orderForm.asset,
              }),
            },
          ],
        });

        const orderResult = await executeOrder(scaleOrderParams);
        if (!orderResult?.success) {
          return;
        }

        const submittedOrderCount =
          orderResult.childOrderIds?.length ?? scaleLadderResult.orderCount;
        const submittedSize =
          orderResult.submittedSize ?? submissionPositionSize;
        const isPartialPlacement =
          submittedOrderCount < scaleLadderResult.orderCount;
        showToast({
          ...PerpsToastOptions.orderManagement.limit.confirmed(
            orderForm.direction,
            submittedSize,
            orderForm.asset,
          ),
          labelOptions: [
            {
              label: strings(
                isPartialPlacement
                  ? 'perps.pro_order_form.scale.orders_partially_placed'
                  : 'perps.pro_order_form.scale.orders_placed',
              ),
            },
            {
              label: strings(
                isPartialPlacement
                  ? 'perps.pro_order_form.scale.partial_placement_summary'
                  : 'perps.pro_order_form.scale.placement_summary',
                {
                  submittedCount: submittedOrderCount,
                  totalCount: scaleLadderResult.orderCount,
                  size: submittedSize,
                  assetSymbol: orderForm.asset,
                },
              ),
            },
          ],
        });
        Engine.context.PerpsController?.clearPendingTradeConfiguration(
          orderForm.asset,
        );
        updateOrderForm({
          amount: '',
          direction: 'long',
          type: 'market',
          balancePercent: 0,
          limitPrice: undefined,
          takeProfitPrice: undefined,
          stopLossPrice: undefined,
        });
        setLimitPrice(undefined);
        setTriggerPrice(undefined);
        setScaleStartPrice('');
        setScaleEndPrice('');
        setScaleTotalOrders(SCALE_DEFAULT_ORDERS.toString());
        setScaleSizeSkew(SCALE_DEFAULT_SKEW);
        setReduceOnly(false);
        return;
      }

      // reduce-only is Pro-specific (TAT-3595); the direct Pro path never
      // uses pay-with-any-token, so those tracking fields are omitted.
      // Finalize trailing decimals so Place Order does not depend on blur timing.
      const finalizedLimitPrice = orderForm.limitPrice
        ? canonicalizeOrderPrice(
            finalizeNumericTextInput(orderForm.limitPrice),
            szDecimals,
          )
        : orderForm.limitPrice;
      const finalizedTriggerPrice = normalizedTriggerPrice;

      const orderParams = buildPerpsOrderParams({
        asset: orderForm.asset,
        isBuy: orderForm.direction === 'long',
        size: submissionPositionSize,
        orderType: orderForm.type,
        effectivePrice,
        leverage: orderForm.leverage,
        usdAmount: isExactFullClose ? undefined : effectiveUsdAmount,
        maxSlippageBps: resolvedMaxSlippageBps,
        limitPrice: finalizedLimitPrice,
        triggerPrice: finalizedTriggerPrice,
        takeProfitPrice: isTriggerOrderType(orderForm.type)
          ? undefined
          : orderForm.takeProfitPrice,
        stopLossPrice: isTriggerOrderType(orderForm.type)
          ? undefined
          : orderForm.stopLossPrice,
        reduceOnly,
        twapDuration: isTwapOrder ? twapDuration : undefined,
        twapRandomize: isTwapOrder ? twapRandomize : undefined,
        providerId: orderProviderId,
        isFullClose: reduceOnly
          ? reduceOnlyValidation.isFullClose || isExactFullClose
          : undefined,
        trackingData: buildPerpsOrderTrackingData({
          marginRequired: effectiveMarginRequired,
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

      playImpact(ImpactMoment.PrimaryCTA).catch(() => undefined);
      const submittedToast = isTwapOrder
        ? PerpsToastOptions.orderManagement.twap.submitted(
            orderForm.direction,
            submissionPositionSize,
            orderForm.asset,
            twapDuration,
          )
        : standardOrderToastOptions.submitted(
            orderForm.direction,
            submissionPositionSize,
            orderForm.asset,
          );
      showToast(submittedToast);

      const shouldHandleTPSLSeparately =
        !isTwapOrder &&
        !reduceOnly &&
        !isTriggerOrderType(orderForm.type) &&
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
      updateOrderForm({
        amount: '',
        direction: 'long',
        type: 'market',
        balancePercent: 0,
        limitPrice: undefined,
        takeProfitPrice: undefined,
        stopLossPrice: undefined,
      });
      setLimitPrice(undefined);
      setTriggerPrice(undefined);
      setReduceOnly(false);
      resetTwapDraft();
    } finally {
      isSubmittingRef.current = false;
    }
  }, [
    track,
    orderForm.asset,
    orderForm.direction,
    orderForm.type,
    normalizedTriggerPrice,
    normalizedLimitPrice,
    orderForm.leverage,
    orderForm.limitPrice,
    orderForm.takeProfitPrice,
    orderForm.stopLossPrice,
    effectiveUsdAmount,
    exceedsMaxSlippage,
    estimatedSlippageBps,
    resolvedMaxSlippageBps,
    maxSlippageSource,
    isTriggeredOrdersEnabled,
    isMarketDataBlocking,
    isAtCap,
    isScaleOrdersEnabled,
    isScaleOrderSupportPending,
    checkScaleOrderSupport,
    isScaleOrder,
    scaleLadderResult,
    hasTpslBlocker,
    twapDurationMissing,
    twapDurationError,
    twapMinimumSizeError,
    isReduceOnlyPositionLoading,
    reduceOnlyValidation.isValid,
    reduceOnlyValidation.isFullClose,
    isExactFullClose,
    directionTrackingValue,
    validateNow,
    currentMarketPosition,
    navigation,
    submissionPositionSize,
    effectivePrice,
    reduceOnly,
    isTwapOrder,
    orderProviderId,
    twapDuration,
    twapRandomize,
    effectiveMarginRequired,
    feeResults,
    assetData.price,
    szDecimals,
    source,
    sourceSection,
    chartLibrary,
    vipTier,
    playImpact,
    executeOrder,
    updateOrderForm,
    setLimitPrice,
    setTriggerPrice,
    updatePositionTPSL,
    showToast,
    PerpsToastOptions.formValidation.orderForm,
    PerpsToastOptions.orderManagement,
    PerpsToastOptions.positionManagement.tpsl,
    standardOrderToastOptions,
    resetTwapDraft,
  ]);

  const onTPSLPress = useCallback(() => {
    if (orderForm.type === 'limit' && !orderForm.limitPrice) {
      showToast(PerpsToastOptions.formValidation.orderForm.limitPriceRequired);
      return;
    }
    playImpact(ImpactMoment.PageNavigation).catch(() => undefined);
    navigation.navigate(Routes.PERPS.TPSL, {
      asset: orderForm.asset,
      currentPrice: assetData.price,
      direction: orderForm.direction,
      leverage: orderForm.leverage,
      orderType: orderForm.type,
      limitPrice: normalizedLimitPrice,
      initialTakeProfitPrice: orderForm.takeProfitPrice,
      initialStopLossPrice: orderForm.stopLossPrice,
      amount: effectiveUsdAmount,
      szDecimals,
      enableHaptics: true,
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
    normalizedLimitPrice,
    orderForm.limitPrice,
    orderForm.type,
    orderForm.asset,
    orderForm.direction,
    orderForm.leverage,
    orderForm.takeProfitPrice,
    orderForm.stopLossPrice,
    effectiveUsdAmount,
    assetData.price,
    showToast,
    navigation,
    playImpact,
    setTakeProfitPrice,
    setStopLossPrice,
    szDecimals,
  ]);

  const onLeverageConfirm = useCallback(
    (leverage: number, inputMethod?: 'slider' | 'preset') => {
      setLeverage(leverage);

      const currentAmount = Number.parseFloat(effectiveUsdAmount || '0');
      const newMaxAmount = spendableBalance * leverage;
      if (!reduceOnly && currentAmount > newMaxAmount) {
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
        [PERPS_ANALYTICS_PREVIOUS_LEVERAGE]: orderForm.leverage,
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
      effectiveUsdAmount,
      orderForm.asset,
      orderForm.direction,
      orderForm.leverage,
      reduceOnly,
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
      if (!isTriggeredOrdersEnabled && isTriggerOrderType(type)) {
        setIsOrderTypeVisible(false);
        return;
      }
      if (!isTwapEnabled && type === 'twap') {
        setIsOrderTypeVisible(false);
        return;
      }
      if (!isScaleOrdersEnabled && type === 'scale') {
        setIsOrderTypeVisible(false);
        return;
      }
      if (type !== orderForm.type) {
        resetPriceInputInteraction();
      }
      setOrderType(type);
      if (type === 'twap') {
        setLimitPrice(undefined);
        setTriggerPrice(undefined);
        setTakeProfitPrice(undefined);
        setStopLossPrice(undefined);
      }
      if (type === 'scale') {
        setLimitPrice(undefined);
        setTriggerPrice(undefined);
        setTakeProfitPrice(undefined);
        setStopLossPrice(undefined);
      }
      setIsOrderTypeVisible(false);
    },
    [
      isTriggeredOrdersEnabled,
      isScaleOrdersEnabled,
      isTwapEnabled,
      orderForm.type,
      resetPriceInputInteraction,
      setLimitPrice,
      setOrderType,
      setStopLossPrice,
      setTakeProfitPrice,
      setTriggerPrice,
    ],
  );

  const onUseMidPricePress = useCallback(() => {
    if (assetData.price > 0) {
      commitLimitPrice(
        canonicalizeOrderPrice(
          formatWithSignificantDigits(
            assetData.price,
            DECIMAL_PRECISION_CONFIG.MaxSignificantFigures,
          ).value.toString(),
          szDecimals,
        ),
      );
    }
  }, [assetData.price, commitLimitPrice, szDecimals]);

  const availableBalance = useMemo(() => {
    if (!isInitialized) {
      return strings('perps.pro_order_form.available_balance_unavailable');
    }

    return strings('perps.pro_order_form.available_balance', {
      amount: formatPerpsFiat(spendableBalance, {
        ranges: PRICE_RANGES_MINIMAL_VIEW,
      }),
    });
  }, [isInitialized, spendableBalance]);

  const isTriggerOrderUnavailable =
    !isTriggeredOrdersEnabled && isTriggerOrderType(orderForm.type);

  const notices = useMemo<PerpsProOrderNotice[]>(() => {
    const list = [
      ...(scaleValidationNotice ? [scaleValidationNotice] : []),
      ...getBlockingNotices({
        reduceOnlyErrorCode: reduceOnly
          ? reduceOnlyValidation.errorCode
          : undefined,
        isReduceOnlyPositionLoading,
        isTriggerOrderUnavailable,
        marketDataBlockingReason,
        filteredErrors,
      }),
      ...getTpslNotices({
        reduceOnly: reduceOnly || isTriggerOrderType(orderForm.type),
        direction: orderForm.direction,
        doesStopLossRiskLiquidation,
        isTakeProfitPriceInvalid,
        isStopLossPriceInvalid,
        tpslPriceType,
      }),
    ];

    if (isAtCap) {
      list.push({
        id: 'oi-cap',
        variant: 'banner',
        message: strings('perps.order.validation.oi_cap_reached'),
      });
    }

    if (twapMinimumSizeError) {
      list.push({
        id: 'twap-min-size',
        variant: 'inline',
        message: strings(
          'perps.pro_order_form.twap.minimum_size',
          PERPS_TWAP_UI_CONFIG.MinimumSizeI18nValues,
        ),
      });
    }

    if (twapDurationError && twapDurationErrorMessage) {
      list.push({
        id: 'twap-duration',
        variant: 'inline',
        message: twapDurationErrorMessage,
      });
    }

    if (twapDurationMissing && twapDurationErrorMessage) {
      list.push({
        id: 'twap-duration-required',
        variant: 'inline',
        message: twapDurationErrorMessage,
      });
    }

    return list;
  }, [
    reduceOnly,
    scaleValidationNotice,
    isReduceOnlyPositionLoading,
    isTriggerOrderUnavailable,
    marketDataBlockingReason,
    reduceOnlyValidation.errorCode,
    filteredErrors,
    doesStopLossRiskLiquidation,
    isTakeProfitPriceInvalid,
    isStopLossPriceInvalid,
    isAtCap,
    orderForm.direction,
    orderForm.type,
    tpslPriceType,
    twapDurationMissing,
    twapDurationError,
    twapDurationErrorMessage,
    twapMinimumSizeError,
  ]);

  const summary = useMemo<PerpsProOrderSummaryProps>(() => {
    // Limit-execution orders use a fixed default slippage in buildPerpsOrderParams
    // and the user-configured cap has no effect. Hide the row entirely.
    // Trigger-market shows maximum tolerance only; live market shows est/max.
    let slippage: string | undefined;
    if (!hidesSlippage) {
      if (isTriggerMarketOrder) {
        slippage = strings('perps.slippage.row_format_max', {
          value: bpsToPercent(resolvedMaxSlippageBps),
        });
      } else if (isMarketOrder) {
        slippage =
          estimatedSlippagePctDisplay === null
            ? strings('perps.slippage.row_format_pending', {
                value: bpsToPercent(maxSlippageBps),
              })
            : strings('perps.slippage.row_format', {
                est: estimatedSlippagePctDisplay,
                value: bpsToPercent(maxSlippageBps),
              });
      }
    }
    return {
      margin:
        effectiveMarginRequired !== undefined &&
        effectiveMarginRequired !== null
          ? formatPerpsFiat(effectiveMarginRequired, {
              ranges: PRICE_RANGES_MINIMAL_VIEW,
            })
          : PERPS_CONSTANTS.FallbackDataDisplay,
      liquidationPrice: hasValidAmount
        ? formatPerpsFiat(liquidationPrice, { ranges: PRICE_RANGES_UNIVERSAL })
        : PERPS_CONSTANTS.FallbackDataDisplay,
      slippage,
      onSlippagePress:
        isMarketOrder || isTriggerMarketOrder ? onSlippagePress : undefined,
      fee: hasValidAmount ? estimatedFees : undefined,
      originalFee: hasValidAmount ? undiscountedEstimatedFees : undefined,
      feeDiscountPercentage: feeResults.feeDiscountPercentage,
      onFeesInfoPress: () => setSelectedTooltip('fees'),
    };
  }, [
    isMarketOrder,
    isTriggerMarketOrder,
    hidesSlippage,
    effectiveMarginRequired,
    hasValidAmount,
    liquidationPrice,
    estimatedSlippagePctDisplay,
    maxSlippageBps,
    resolvedMaxSlippageBps,
    estimatedFees,
    undiscountedEstimatedFees,
    feeResults.feeDiscountPercentage,
    onSlippagePress,
  ]);

  const trackScaleConfiguration = useCallback(
    (
      settingType: ScaleSettingType,
      overrides: Record<string, unknown> = {},
    ) => {
      track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
        [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
          SCALE_INTERACTION_TYPE.CONFIG_CHANGED,
        [PERPS_EVENT_PROPERTY.SETTING_TYPE]: settingType,
        ...scaleAnalyticsProperties,
        ...overrides,
      });
    },
    [scaleAnalyticsProperties, track],
  );

  const scaleOrder = useMemo<PerpsProScaleOrderModel>(
    () => ({
      startPrice: scaleStartPrice,
      endPrice: scaleEndPrice,
      totalOrders: scaleTotalOrders,
      sizeSkew: scaleSizeSkew,
      onStartPriceChange: (value) =>
        normalizeScaleInput(value, scaleStartPrice, setScaleStartPrice),
      onStartPriceBlur: () =>
        trackScaleConfiguration(SCALE_SETTING_TYPE.START_PRICE),
      onEndPriceChange: (value) =>
        normalizeScaleInput(value, scaleEndPrice, setScaleEndPrice),
      onEndPriceBlur: () =>
        trackScaleConfiguration(SCALE_SETTING_TYPE.END_PRICE),
      onTotalOrdersChange: (value) =>
        normalizeScaleInput(value, scaleTotalOrders, setScaleTotalOrders),
      onTotalOrdersBlur: () =>
        trackScaleConfiguration(SCALE_SETTING_TYPE.TOTAL_ORDERS),
      onSizeSkewChange: (value) =>
        normalizeScaleInput(value, scaleSizeSkew, setScaleSizeSkew),
      onSizeSkewBlur: () => {
        const coercedSkew = coerceScaleSkew(scaleSizeSkew);
        setScaleSizeSkew(coercedSkew);
        trackScaleConfiguration(SCALE_SETTING_TYPE.SIZE_SKEW, {
          [SCALE_EVENT_PROPERTY.SKEW]: Number(coercedSkew),
        });
      },
      onSizeSkewInfoPress: () => setSelectedTooltip('size_skew'),
      onPreviewToggle: (isExpanded) => {
        if (isExpanded) {
          track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
            [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
              SCALE_INTERACTION_TYPE.PREVIEW_EXPANDED,
            ...scaleAnalyticsProperties,
          });
        }
      },
      rungs: scaleRungs,
      orderValue: scaleLadderResult.success
        ? formatPerpsFiat(scaleLadderResult.orderValue, {
            ranges: PRICE_RANGES_MINIMAL_VIEW,
          })
        : PERPS_CONSTANTS.FallbackDataDisplay,
      marginRequired:
        scaleLadderResult.success &&
        effectiveMarginRequired !== undefined &&
        effectiveMarginRequired !== null &&
        effectiveMarginRequired !== ''
          ? formatPerpsFiat(effectiveMarginRequired, {
              ranges: PRICE_RANGES_MINIMAL_VIEW,
            })
          : PERPS_CONSTANTS.FallbackDataDisplay,
      fees:
        scaleLadderResult.success &&
        estimatedFees !== undefined &&
        estimatedFees !== null
          ? formatPerpsFiat(estimatedFees, {
              ranges: PRICE_RANGES_MINIMAL_VIEW,
            })
          : PERPS_CONSTANTS.FallbackDataDisplay,
    }),
    [
      estimatedFees,
      effectiveMarginRequired,
      normalizeScaleInput,
      scaleAnalyticsProperties,
      scaleEndPrice,
      scaleLadderResult,
      scaleRungs,
      scaleSizeSkew,
      scaleStartPrice,
      scaleTotalOrders,
      track,
      trackScaleConfiguration,
    ],
  );

  const isPlaceOrderDisabled =
    !hasValidAmount ||
    !orderValidation.isValid ||
    isAtCap ||
    isPlacing ||
    isMarketDataBlocking ||
    isReduceOnlyPositionLoading ||
    (reduceOnly && !reduceOnlyValidation.isValid) ||
    (isScaleOrder && !scaleLadderResult.success) ||
    (isScaleOrder && !isScaleOrdersEnabled) ||
    (isScaleOrder && isScaleOrderSupportPending) ||
    (!isTwapEnabled && isTwapOrder) ||
    hasTpslBlocker ||
    isTriggerOrderUnavailable ||
    twapDurationMissing ||
    twapDurationError ||
    twapMinimumSizeError;

  const onDirectionChange = useCallback(
    (direction: PerpsProOrderDirection) => {
      setDirection(direction);
    },
    [setDirection],
  );

  const onLimitPriceChange = useCallback(
    (value: string) => {
      const result = normalizeNumericTextInput(
        value,
        orderForm.limitPrice ?? '',
        {
          maxDigits: MAX_PERPS_INPUT_DIGITS,
          acceptedDecimalSeparators: ['.', ','],
        },
      );
      if (!result.ok) {
        return;
      }
      setLimitPrice(result.value);
    },
    [orderForm.limitPrice, setLimitPrice],
  );

  const onLimitPriceBlur = useCallback(() => {
    const currentLimitPrice = orderForm.limitPrice ?? '';
    const finalizedLimitPrice = finalizeNumericTextInput(currentLimitPrice);
    commitLimitPrice(canonicalizeOrderPrice(finalizedLimitPrice, szDecimals));
  }, [commitLimitPrice, orderForm.limitPrice, szDecimals]);

  const onTriggerPriceChange = useCallback(
    (value: string) => {
      const result = normalizeNumericTextInput(value, triggerPrice ?? '', {
        maxDigits: MAX_PERPS_INPUT_DIGITS,
        acceptedDecimalSeparators: ['.', ','],
      });
      if (!result.ok) {
        return;
      }
      setTriggerPrice(result.value);
    },
    [setTriggerPrice, triggerPrice],
  );

  const onTriggerPriceBlur = useCallback(() => {
    const currentTriggerPrice = triggerPrice ?? '';
    const finalizedTriggerPrice = finalizeNumericTextInput(currentTriggerPrice);
    commitTriggerPrice(
      canonicalizeOrderPrice(finalizedTriggerPrice, szDecimals),
    );
  }, [commitTriggerPrice, szDecimals, triggerPrice]);

  const priceCardMessage = useMemo(() => {
    const fieldIssues = orderValidation.fieldIssues;
    const triggerIssue = fieldIssues.find(
      (fieldIssue) => fieldIssue.field === 'triggerPrice',
    );
    if (triggerIssue && hasBlurredTriggerPrice) {
      return {
        severity: 'error' as const,
        message: getOrderFormFieldIssueMessage(triggerIssue),
      };
    }

    const limitIssue = fieldIssues.find(
      (fieldIssue) => fieldIssue.field === 'limitPrice',
    );
    if (limitIssue && hasBlurredLimitPrice) {
      return {
        severity: 'error' as const,
        message: getOrderFormFieldIssueMessage(limitIssue),
      };
    }

    if (!hasBlurredLimitPrice) {
      return undefined;
    }

    const warning = getLimitPriceCrossingWarning({
      orderType: orderForm.type,
      direction: orderForm.direction,
      limitPrice: normalizedLimitPrice,
      midPrice: assetData.price,
      szDecimals,
    });
    if (!warning) {
      return undefined;
    }

    return { severity: 'warning' as const, message: warning };
  }, [
    assetData.price,
    hasBlurredLimitPrice,
    hasBlurredTriggerPrice,
    orderForm.direction,
    normalizedLimitPrice,
    orderForm.type,
    orderValidation.fieldIssues,
    szDecimals,
  ]);

  const onPlaceOrderPress = useCallback(() => {
    // Gesture cancellation can bypass both onDragEnd and RN onTouchCancel.
    // Flush a pending preview and wait for canonical order state to re-render
    // before submitting, matching Lite's interrupted-drag guard.
    if (commitPendingSliderPreview()) {
      return;
    }

    // Compliance first, then geographic eligibility — matches Lite trade entry
    // and the canonical compliance gate ordering (docs/compliance.md).
    return gate(async () => {
      if (!isEligible) {
        showEligibilityModal(PERPS_EVENT_VALUE.SOURCE.TRADE_ACTION);
        return;
      }
      await handlePlaceOrder();
    });
  }, [
    commitPendingSliderPreview,
    gate,
    handlePlaceOrder,
    isEligible,
    showEligibilityModal,
  ]);

  const onReduceOnlyChange = useCallback(
    (value: boolean) => {
      setReduceOnly(value);
      if (value) {
        setTakeProfitPrice(undefined);
        setStopLossPrice(undefined);
      }
    },
    [setTakeProfitPrice, setStopLossPrice],
  );

  const onTwapDaysChange = useCallback(
    (value: string) => setTwapDays(normalizeTwapDurationPart(value)),
    [],
  );
  const onTwapHoursChange = useCallback(
    (value: string) => setTwapHours(normalizeTwapDurationPart(value)),
    [],
  );
  const onTwapMinutesChange = useCallback(
    (value: string) => setTwapMinutes(normalizeTwapDurationPart(value)),
    [],
  );
  const onTwapRandomizeChange = useCallback(
    (value: boolean) => setTwapRandomize(value),
    [],
  );
  const twap = useMemo<PerpsProTwapModel>(
    () => ({
      days: twapDays,
      hours: twapHours,
      minutes: twapMinutes,
      randomize: twapRandomize,
      durationError: twapDurationErrorMessage,
      onDaysChange: onTwapDaysChange,
      onHoursChange: onTwapHoursChange,
      onMinutesChange: onTwapMinutesChange,
      onRandomizeChange: onTwapRandomizeChange,
    }),
    [
      onTwapDaysChange,
      onTwapHoursChange,
      onTwapMinutesChange,
      onTwapRandomizeChange,
      twapDays,
      twapDurationErrorMessage,
      twapHours,
      twapMinutes,
      twapRandomize,
    ],
  );

  // Single owner for the Reduce Only size-max override. Toggle and submit only
  // flip `reduceOnly`; this effect applies or clears the cap.
  useEffect(() => {
    if (!reduceOnly) {
      setMaxPossibleAmountOverride(null);
      return;
    }

    if (isReduceOnlyPositionLoading) {
      return;
    }

    if (keepReduceOnlySizeEmpty) {
      setMaxPossibleAmountOverride(null);
      return;
    }

    setMaxPossibleAmountOverride(
      getReduceOnlyMaxUsdAmount({
        positionSize: currentMarketPosition?.size,
        price: effectiveInputPrice,
      }),
    );
  }, [
    currentMarketPosition?.size,
    effectiveInputPrice,
    isReduceOnlyPositionLoading,
    keepReduceOnlySizeEmpty,
    reduceOnly,
    setMaxPossibleAmountOverride,
  ]);

  const orderAmountRef = useRef(orderForm.amount);
  orderAmountRef.current = orderForm.amount;

  useEffect(() => {
    if (!keepReduceOnlySizeEmpty) {
      return;
    }

    const amount = orderAmountRef.current;
    if (amount !== '0' && amount !== '') {
      setAmount('0');
    }
  }, [keepReduceOnlySizeEmpty, setAmount]);

  return {
    direction: orderForm.direction,
    onDirectionChange,
    leverage: orderForm.leverage,
    onLeveragePress: () => setIsLeverageVisible(true),
    orderType: orderForm.type,
    onOrderTypeButtonPress: () => setIsOrderTypeVisible(true),
    limitPrice: orderForm.limitPrice ?? '',
    onLimitPriceChange,
    onLimitPriceBlur,
    onUseMidPricePress,
    triggerPrice: triggerPrice ?? '',
    onTriggerPriceChange,
    onTriggerPriceBlur,
    priceCardMessage,
    sizeInput,
    sizeSlider,
    effectiveUsdAmount,
    availableBalance,
    onAddFundsPress: handleAddFunds,
    reduceOnly,
    onReduceOnlyChange,
    twap,
    isTPSLConfigured: Boolean(
      orderForm.takeProfitPrice || orderForm.stopLossPrice,
    ),
    onTPSLPress,
    notices,
    summary,
    scaleOrder,
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
