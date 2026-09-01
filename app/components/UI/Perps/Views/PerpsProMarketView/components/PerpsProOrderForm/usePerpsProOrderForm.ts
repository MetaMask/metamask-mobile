import {
  BASIS_POINTS_DIVISOR,
  DECIMAL_PRECISION_CONFIG,
  CHASE_ORDER_CONFIG,
  PERPS_CONSTANTS,
  PERPS_ERROR_CODES,
  SCALE_ORDER_COUNT,
  TRADING_DEFAULTS,
  calculateMarginRequired,
  computeScalePriceLadder,
  formatHyperLiquidPrice,
  formatPositionSize,
  getTriggerExecution,
  isLimitExecutionOrderType,
  isTriggerOrderType,
  splitScaleSizes,
  type ChaseOrder,
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
import Logger from '../../../../../../../util/Logger';
import { ensureError } from '../../../../../../../util/errorUtils';
import { useVipTier } from '../../../../../Rewards/hooks/useVipTier';
import { useComplianceGate } from '../../../../../Compliance';
import type { PerpsTooltipContentKey } from '../../../../components/PerpsBottomSheetTooltip/PerpsBottomSheetTooltip.types';
import { PERPS_ANALYTICS_PREVIOUS_LEVERAGE } from '../../../../constants/perpsAnalytics';
import {
  bpsToPercent,
  resolvePerpsMaxSlippageBps,
} from '../../../../constants/slippageConfig';
import { usePerpsOrderContext } from '../../../../contexts/PerpsOrderContext';
import { usePerpsSavePendingConfig } from '../../../../hooks/usePerpsSavePendingConfig';
import {
  useHasExistingPosition,
  usePerpsLiquidationPrice,
  usePerpsMarketData,
  usePerpsNetwork,
  usePerpsOrderExecution,
  usePerpsOrderFees,
  usePerpsOrderValidation,
  usePerpsToasts,
  usePerpsTrading,
  getPerpsToastLabels,
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
import { usePerpsChaseOrders } from '../../../../hooks/usePerpsChaseOrders';
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
  CHASE_ORDER_UI_CONFIG,
  CHASE_RETAINED_STATUSES,
  MAX_PERPS_INPUT_DIGITS,
  PERPS_TWAP_UI_CONFIG,
  PROVIDER_CONFIG,
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

const SCALE_DEFAULT_SKEW = '1.00';
const SCALE_SKEW_DECIMAL_PLACES = 2;
// A binary search needs at most 53 halvings across the safe-integer domain.
const SCALE_SIZE_SEARCH_MAX_STEPS = Math.ceil(
  Math.log2(Number.MAX_SAFE_INTEGER),
);
const SCALE_VALIDATION_MAX_ATTEMPTS = 2;
const CHASE_VALIDATION_MAX_ATTEMPTS = 2;
const occupiesChasePlacementSlot = (order: Pick<ChaseOrder, 'status'>) =>
  CHASE_RETAINED_STATUSES.has(order.status);
type ScaleOrderValidationCode =
  | 'prices_required'
  | 'size_required'
  | 'invalid_range'
  | 'invalid_order_count'
  | 'invalid_skew'
  | 'minimum_lot'
  | 'calculation_error';

// The authorized controller-v13 Yarn patch backports this shared Scale
// analytics contract until a published controller release includes it.
type ScaleSettingType =
  | typeof PERPS_EVENT_VALUE.SETTING_TYPE.SCALE_START_PRICE
  | typeof PERPS_EVENT_VALUE.SETTING_TYPE.SCALE_END_PRICE
  | typeof PERPS_EVENT_VALUE.SETTING_TYPE.SCALE_TOTAL_ORDERS
  | typeof PERPS_EVENT_VALUE.SETTING_TYPE.SCALE_SIZE_SKEW;

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
  size_required: 'perps.pro_order_form.scale.validation.size_required',
  invalid_range: 'perps.pro_order_form.scale.validation.invalid_range',
  invalid_order_count:
    'perps.pro_order_form.scale.validation.invalid_order_count',
  invalid_skew: 'perps.pro_order_form.scale.validation.invalid_skew',
  minimum_lot: 'perps.pro_order_form.scale.validation.minimum_lot',
  calculation_error: 'perps.order.validation.error',
};

const getScaleValidationMessage = (code: ScaleOrderValidationCode): string =>
  strings(
    SCALE_ERROR_I18N_KEYS[code],
    code === 'invalid_order_count'
      ? {
          minOrderCount: SCALE_ORDER_COUNT.min,
          maxOrderCount: SCALE_ORDER_COUNT.max,
        }
      : undefined,
  );

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
  /** Re-check selected-route TWAP support immediately before placement. */
  checkTwapOrderSupport: () => Promise<boolean>;
  /** Concrete provider route used for Scale capability discovery. */
  scaleProviderId: PerpsProviderType | undefined;
  /** Feature-gate Scale order placement as well as the type picker. */
  isScaleOrdersEnabled: boolean;
  /** Prevent placement while selected-route Scale support is refreshing. */
  isScaleOrderSupportPending: boolean;
  /** Re-check selected-route Scale support immediately before placement. */
  checkScaleOrderSupport: () => Promise<boolean>;
  /** Flag and selected-provider capability gate for Chase. */
  isChaseEnabled: boolean;
  /** Preserve a selected Chase draft while route capability is unresolved. */
  isChaseAvailabilityPending: boolean;
  /** Re-checks selected market/provider capability at the submit boundary. */
  refreshChaseCapability: () => Promise<PerpsProviderType | null>;
  /** Concrete controller-resolved route used by validation and placement. */
  chaseProviderId: PerpsProviderType | null;
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
  chaseMaxDistance: string;
  chaseMaxDistanceUnit: 'usd' | 'percent';
  onChaseMaxDistanceUnitChange: (unit: 'usd' | 'percent') => void;
  chaseReferencePrice: string;
  activeChaseCount: number;
  onChaseMaxDistanceChange: (value: string) => void;
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
  onPlaceOrderPress: () => Promise<void>;
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
  checkTwapOrderSupport,
  scaleProviderId,
  isScaleOrdersEnabled,
  isScaleOrderSupportPending,
  checkScaleOrderSupport,
  isChaseEnabled,
  isChaseAvailabilityPending,
  refreshChaseCapability,
  chaseProviderId,
}: UsePerpsProOrderFormParams): UsePerpsProOrderFormResult => {
  const symbol = market.symbol;
  const selectedAddress = useSelector(selectSelectedInternalAccountAddress);
  const normalizedSelectedAddress = selectedAddress?.toLowerCase() ?? '';
  const selectedAddressRef = useRef(normalizedSelectedAddress);
  useLayoutEffect(() => {
    selectedAddressRef.current = normalizedSelectedAddress;
  }, [normalizedSelectedAddress]);

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
    pendingReduceOnly,
    maxPossibleAmount,
    setMaxPossibleAmountOverride,
    balanceForValidation: spendableBalance,
  } = usePerpsOrderContext();

  // Restore reduce-only from the 30s pending draft.
  const [reduceOnly, setReduceOnly] = useState(Boolean(pendingReduceOnly));
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
  const [scaleTotalOrders, setScaleTotalOrders] = useState('');
  const [scaleSizeSkew, setScaleSizeSkew] = useState(SCALE_DEFAULT_SKEW);
  const [hasScaleValidationInteraction, setHasScaleValidationInteraction] =
    useState(false);
  const [isScalePlacementPending, setIsScalePlacementPending] = useState(false);
  const { chaseOrders, getChaseOrders } = usePerpsChaseOrders({
    isEnabled: isChaseEnabled,
  });
  const [chaseMaxDistance, setChaseMaxDistance] = useState('');
  const [chaseMaxDistanceUnit, setChaseMaxDistanceUnit] = useState<
    'usd' | 'percent'
  >('usd');
  const activeChaseCount = useMemo(
    () => chaseOrders.filter(occupiesChasePlacementSlot).length,
    [chaseOrders],
  );
  const parsedChaseMaxDistance = Number.parseFloat(chaseMaxDistance);
  const isChaseMaxDistanceNumeric = /^(?:\d+(?:\.\d*)?|\.\d+)$/u.test(
    chaseMaxDistance.trim(),
  );
  const [selectedTooltip, setSelectedTooltip] =
    useState<PerpsTooltipContentKey | null>(null);
  const isSubmittingRef = useRef(false);
  const isScalePlacementLockedRef = useRef(false);
  const scalePlacementProviderIdRef = useRef<PerpsProviderType | undefined>(
    undefined,
  );
  const isScaleOrdersEnabledRef = useRef(isScaleOrdersEnabled);
  const isScaleOrderSupportPendingRef = useRef(isScaleOrderSupportPending);
  const scaleProviderIdRef = useRef(scaleProviderId);
  const checkScaleOrderSupportRef = useRef(checkScaleOrderSupport);
  const isChaseEnabledRef = useRef(isChaseEnabled);
  const isChaseAvailabilityPendingRef = useRef(isChaseAvailabilityPending);
  const chaseProviderIdRef = useRef(chaseProviderId);
  const refreshChaseCapabilityRef = useRef(refreshChaseCapability);
  useLayoutEffect(() => {
    isScaleOrdersEnabledRef.current = isScaleOrdersEnabled;
    isScaleOrderSupportPendingRef.current = isScaleOrderSupportPending;
    scaleProviderIdRef.current = scaleProviderId;
    checkScaleOrderSupportRef.current = checkScaleOrderSupport;
    isChaseEnabledRef.current = isChaseEnabled;
    isChaseAvailabilityPendingRef.current = isChaseAvailabilityPending;
    chaseProviderIdRef.current = chaseProviderId;
    refreshChaseCapabilityRef.current = refreshChaseCapability;
  }, [
    chaseProviderId,
    checkScaleOrderSupport,
    isChaseAvailabilityPending,
    isChaseEnabled,
    isScaleOrdersEnabled,
    isScaleOrderSupportPending,
    refreshChaseCapability,
    scaleProviderId,
  ]);
  const lastTrackedScaleValidationRef = useRef<
    ScaleOrderValidationCode | undefined
  >(undefined);
  const submissionStateRef = useRef('');
  useEffect(() => {
    if (
      orderForm.type === 'chase' &&
      !isChaseAvailabilityPending &&
      !isChaseEnabled
    ) {
      setOrderType('market');
      setChaseMaxDistance('');
      setChaseMaxDistanceUnit('usd');
      setIsOrderTypeVisible(false);
    }
  }, [
    isChaseAvailabilityPending,
    isChaseEnabled,
    orderForm.type,
    setOrderType,
  ]);
  usePerpsSavePendingConfig(orderForm, { reduceOnly });

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

  const { gate } = useComplianceGate(selectedAddress ?? '');

  const {
    marketData,
    isLoading: isMarketDataLoading,
    error: marketDataError,
  } = usePerpsMarketData({
    asset: symbol,
    showErrorToast: false,
  });
  const network = usePerpsNetwork();
  const scaleMinimumOrderAmount =
    network === 'mainnet'
      ? TRADING_DEFAULTS.amount.mainnet
      : TRADING_DEFAULTS.amount.testnet;
  const szDecimals =
    marketData?.szDecimals ?? DECIMAL_PRECISION_CONFIG.FallbackSizeDecimals;
  const maxLeverage =
    marketData?.maxLeverage ?? PERPS_CONSTANTS.DefaultMaxLeverage;
  const isLoadingMarketData = isMarketDataLoading && marketData === null;
  const isScaleOrder = orderForm.type === 'scale';
  const guardScaleMutation = useCallback((mutation: () => void) => {
    if (isScalePlacementLockedRef.current) {
      return;
    }
    mutation();
  }, []);

  useEffect(() => {
    if (
      isScaleOrder &&
      !isScalePlacementPending &&
      !isScaleOrderSupportPending &&
      !isScaleOrdersEnabled &&
      !isScalePlacementLockedRef.current
    ) {
      setOrderType('market');
    }
  }, [
    isScaleOrder,
    isScaleOrdersEnabled,
    isScaleOrderSupportPending,
    isScalePlacementPending,
    setOrderType,
  ]);

  const normalizeScaleInput = useCallback(
    (
      value: string,
      previousValue: string,
      setter: (next: string) => void,
      maxDecimalPlaces?: number,
    ) => {
      const result = normalizeNumericTextInput(value, previousValue, {
        maxDigits: MAX_PERPS_INPUT_DIGITS,
        maxDecimalPlaces,
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
  const chaseMaxDistanceBps =
    chaseMaxDistanceUnit === 'percent'
      ? parsedChaseMaxDistance * 100
      : assetData.price > 0
        ? (parsedChaseMaxDistance / assetData.price) * BASIS_POINTS_DIVISOR
        : Number.NaN;
  const isChaseMaxDistanceBpsResolvable =
    chaseMaxDistanceUnit === 'percent' || assetData.price > 0;
  const isChaseMaxDistanceInvalid =
    orderForm.type === 'chase' &&
    chaseMaxDistance.trim().length > 0 &&
    (!isChaseMaxDistanceNumeric ||
      !Number.isFinite(parsedChaseMaxDistance) ||
      parsedChaseMaxDistance <= 0 ||
      (isChaseMaxDistanceBpsResolvable &&
        (!Number.isFinite(chaseMaxDistanceBps) ||
          chaseMaxDistanceBps >= BASIS_POINTS_DIVISOR)));
  const chaseMaxDistanceErrorMessage = strings(
    chaseMaxDistanceUnit === 'usd'
      ? 'perps.order.validation.chase_max_distance_usd'
      : 'perps.order.validation.chase_max_distance_percent',
  );

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
    forceUsd: isScaleOrder,
    keepSizeEmpty: keepReduceOnlySizeEmpty,
    preserveMaxIntent: orderForm.type === 'chase',
  });
  const currentSubmissionState =
    orderForm.type === 'chase'
      ? JSON.stringify({
          type: orderForm.type,
          asset: orderForm.asset,
          direction: orderForm.direction,
          sizeIntent: isAtMaxAmount
            ? { mode: 'max' }
            : { mode: 'explicit', amount: orderForm.amount },
          leverage: orderForm.leverage,
          reduceOnly,
          chaseMaxDistance,
          chaseMaxDistanceUnit,
          selectedAddress: normalizedSelectedAddress,
        })
      : orderForm.type;
  useLayoutEffect(() => {
    submissionStateRef.current = currentSubmissionState;
  }, [currentSubmissionState]);

  const isTwapOrder = orderForm.type === 'twap';
  const isChaseOrder = orderForm.type === 'chase';
  const orderProviderId = isTwapOrder
    ? resolvedTwapProviderId
    : isScaleOrder
      ? scaleProviderId
      : isChaseOrder
        ? (chaseProviderId ?? undefined)
        : undefined;
  const isTwapEnabledRef = useRef(isTwapEnabled);
  const resolvedTwapProviderIdRef = useRef(resolvedTwapProviderId);
  const checkTwapOrderSupportRef = useRef(checkTwapOrderSupport);

  useLayoutEffect(() => {
    isTwapEnabledRef.current = isTwapEnabled;
    resolvedTwapProviderIdRef.current = resolvedTwapProviderId;
    checkTwapOrderSupportRef.current = checkTwapOrderSupport;
  }, [checkTwapOrderSupport, isTwapEnabled, resolvedTwapProviderId]);

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

    return formatPositionSize(absolutePositionSize.toFixed(), szDecimals);
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
      return { success: false, code: 'size_required' };
    }
    if (scaleProviderId !== PROVIDER_CONFIG.DefaultProvider) {
      return { success: false, code: 'calculation_error' };
    }

    try {
      // TODO: Replace this composition with normalizeHyperLiquidScalePriceLadder once the controller exports it.
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
          (rung) =>
            Number(rung.size) * Number(rung.price) < scaleMinimumOrderAmount,
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
        totalSize: new BigNumber(totalSize).toFixed(),
      };
    } catch (error) {
      const normalizedError = ensureError(
        error,
        'usePerpsProOrderForm.calculateScaleLadder',
      );
      if (
        normalizedError.message === PERPS_ERROR_CODES.ORDER_SCALE_COUNT_INVALID
      ) {
        return { success: false, code: 'invalid_order_count' };
      }
      if (
        normalizedError.message === PERPS_ERROR_CODES.ORDER_SCALE_RANGE_INVALID
      ) {
        return { success: false, code: 'invalid_range' };
      }
      if (
        normalizedError.message === PERPS_ERROR_CODES.ORDER_SCALE_SIZE_TOO_SMALL
      ) {
        return { success: false, code: 'minimum_lot' };
      }

      Logger.error(normalizedError, {
        tags: {
          feature: PERPS_CONSTANTS.FeatureName,
          component: 'usePerpsProOrderForm',
          action: 'calculate_scale_ladder',
        },
      });
      return { success: false, code: 'calculation_error' };
    }
  }, [
    effectiveUsdAmount,
    exactFullCloseSize,
    scaleMinimumOrderAmount,
    scaleEndPrice,
    scaleSizeSkew,
    scaleStartPrice,
    scaleTotalOrders,
    scaleProviderId,
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
      [PERPS_EVENT_PROPERTY.SCALE_ORDER_COUNT]: Number.isInteger(orderCount)
        ? orderCount
        : undefined,
      [PERPS_EVENT_PROPERTY.SCALE_RANGE_PCT]: scaleRangePercentage,
      [PERPS_EVENT_PROPERTY.SCALE_SKEW]: Number.isFinite(skew)
        ? skew
        : undefined,
      [PERPS_EVENT_PROPERTY.REDUCE_ONLY]: reduceOnly,
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
      entryPrice: isScaleOrder ? 0 : effectivePrice,
      leverage: orderForm.leverage,
      direction: orderForm.direction,
      asset: orderForm.asset,
    }),
    [
      effectivePrice,
      isScaleOrder,
      orderForm.leverage,
      orderForm.direction,
      orderForm.asset,
    ],
  );
  const { liquidationPrice } = usePerpsLiquidationPrice(liquidationPriceParams);
  const scaleStartEntryPrice = Number(scaleRungs[0]?.price ?? 0);
  const scaleEndEntryPrice = Number(
    scaleRungs[scaleRungs.length - 1]?.price ?? 0,
  );
  const {
    liquidationPrice: scaleStartLiquidationPrice,
    isCalculating: isScaleStartLiquidationCalculating,
  } = usePerpsLiquidationPrice({
    entryPrice: isScaleOrder ? scaleStartEntryPrice : 0,
    leverage: orderForm.leverage,
    direction: orderForm.direction,
    asset: orderForm.asset,
  });
  const {
    liquidationPrice: scaleEndLiquidationPrice,
    isCalculating: isScaleEndLiquidationCalculating,
  } = usePerpsLiquidationPrice({
    entryPrice: isScaleOrder ? scaleEndEntryPrice : 0,
    leverage: orderForm.leverage,
    direction: orderForm.direction,
    asset: orderForm.asset,
  });

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
    skipValidation:
      isReduceOnlyPositionLoading ||
      (orderForm.type === 'chase' &&
        (!isChaseEnabled || chaseProviderId === null)),
    originalUsdAmount:
      isExactFullClose || isScaleOrder ? undefined : effectiveUsdAmount,
    reduceOnly,
    isFullClose: reduceOnlyValidation.isFullClose || isExactFullClose,
    providerId:
      orderForm.type === 'chase'
        ? (chaseProviderId ?? undefined)
        : orderProviderId,
    triggerPrice: normalizedTriggerPrice,
    midPrice: assetData.price,
    szDecimals,
    twapDuration: isTwapOrder ? twapDuration : undefined,
    twapRandomize: isTwapOrder ? twapRandomize : undefined,
    suppressedProtocolErrorCodes: isTwapOrder
      ? TWAP_OWNED_PROTOCOL_ERROR_CODES
      : undefined,
  });
  const { validateNow } = orderValidation;
  const scaleValidationInputKey = JSON.stringify({
    orderForm: effectiveOrderForm,
    positionSize: submissionPositionSize,
    spendableBalance,
    marginRequired: reduceOnly ? '0' : effectiveMarginRequired || '0',
    existingPositionLeverage: existingPositionLeverageForValidation,
    skipValidation: isReduceOnlyPositionLoading,
    reduceOnly,
    isFullClose: reduceOnlyValidation.isFullClose || isExactFullClose,
    triggerPrice: normalizedTriggerPrice,
    szDecimals,
    providerId: orderProviderId,
  });
  const currentScalePlacementSnapshot = useMemo(
    () => ({
      assetPrice: assetData.price,
      currentMarketPosition,
      effectiveMarginRequired,
      effectivePrice,
      feeResults,
      isExactFullClose,
      isReduceOnlyPositionLoading,
      normalizedLimitPrice,
      normalizedTriggerPrice,
      orderForm,
      reduceOnly,
      reduceOnlyValidation,
      scaleLadderResult,
      scaleValidationInputKey,
      submissionPositionSize,
      szDecimals,
      validateNow,
    }),
    [
      assetData.price,
      currentMarketPosition,
      effectiveMarginRequired,
      effectivePrice,
      feeResults,
      isExactFullClose,
      isReduceOnlyPositionLoading,
      normalizedLimitPrice,
      normalizedTriggerPrice,
      orderForm,
      reduceOnly,
      reduceOnlyValidation,
      scaleLadderResult,
      scaleValidationInputKey,
      submissionPositionSize,
      szDecimals,
      validateNow,
    ],
  );
  const scalePlacementSnapshotRef = useRef(currentScalePlacementSnapshot);
  useLayoutEffect(() => {
    scalePlacementSnapshotRef.current = currentScalePlacementSnapshot;
  }, [currentScalePlacementSnapshot]);
  const validateLatestScalePlacement = useCallback(async () => {
    for (
      let attempt = 0;
      attempt < SCALE_VALIDATION_MAX_ATTEMPTS;
      attempt += 1
    ) {
      const snapshot = scalePlacementSnapshotRef.current;
      const validationResult = await snapshot.validateNow();
      const latestSnapshot = scalePlacementSnapshotRef.current;
      if (
        snapshot.scaleValidationInputKey ===
        latestSnapshot.scaleValidationInputKey
      ) {
        return { snapshot: latestSnapshot, validationResult };
      }
    }
    return undefined;
  }, []);
  const chaseValidationInputKey = JSON.stringify({
    asset: orderForm.asset,
    direction: orderForm.direction,
    amount: effectiveUsdAmount,
    leverage: orderForm.leverage,
    spendableBalance,
    currentPositionIdentity: currentMarketPosition
      ? {
          symbol: currentMarketPosition.symbol,
          size: currentMarketPosition.size,
          providerId: currentMarketPosition.providerId ?? null,
        }
      : null,
    existingPositionLeverage: currentMarketPosition
      ? {
          type: currentMarketPosition.leverage.type,
          value: currentMarketPosition.leverage.value,
        }
      : null,
    reduceOnly,
    isReduceOnlyPositionLoading,
    isFullClose: reduceOnlyValidation.isFullClose || isExactFullClose,
    providerId: chaseProviderId,
  });
  const currentChasePlacementSnapshot = useMemo(
    () => ({
      assetPrice: assetData.price,
      chaseValidationInputKey,
      currentMarketPosition,
      effectiveMarginRequired,
      effectivePrice,
      effectiveUsdAmount,
      feeResults,
      isExactFullClose,
      isReduceOnlyPositionLoading,
      orderForm,
      reduceOnly,
      reduceOnlyValidation,
      submissionPositionSize,
      validateNow,
    }),
    [
      assetData.price,
      chaseValidationInputKey,
      currentMarketPosition,
      effectiveMarginRequired,
      effectivePrice,
      effectiveUsdAmount,
      feeResults,
      isExactFullClose,
      isReduceOnlyPositionLoading,
      orderForm,
      reduceOnly,
      reduceOnlyValidation,
      submissionPositionSize,
      validateNow,
    ],
  );
  const chasePlacementSnapshotRef = useRef(currentChasePlacementSnapshot);
  useLayoutEffect(() => {
    chasePlacementSnapshotRef.current = currentChasePlacementSnapshot;
  }, [currentChasePlacementSnapshot]);
  const validateLatestChasePlacement = useCallback(async () => {
    for (
      let attempt = 0;
      attempt < CHASE_VALIDATION_MAX_ATTEMPTS;
      attempt += 1
    ) {
      const snapshot = chasePlacementSnapshotRef.current;
      const validationResult = await snapshot.validateNow();
      const latestSnapshot = chasePlacementSnapshotRef.current;
      if (
        snapshot.chaseValidationInputKey ===
        latestSnapshot.chaseValidationInputKey
      ) {
        return { snapshot, validationResult };
      }
    }
    return undefined;
  }, []);

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
    if (
      !isScaleOrder ||
      !hasScaleValidationInteraction ||
      scaleLadderResult.success
    ) {
      return undefined;
    }
    return {
      id: 'scale',
      variant: 'banner',
      message: getScaleValidationMessage(scaleLadderResult.code),
    };
  }, [hasScaleValidationInteraction, isScaleOrder, scaleLadderResult]);

  useEffect(() => {
    if (
      !isScaleOrder ||
      !hasScaleValidationInteraction ||
      scaleLadderResult.success
    ) {
      lastTrackedScaleValidationRef.current = undefined;
      return;
    }
    if (lastTrackedScaleValidationRef.current === scaleLadderResult.code) {
      return;
    }

    lastTrackedScaleValidationRef.current = scaleLadderResult.code;
    track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
      [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
        PERPS_EVENT_VALUE.INTERACTION_TYPE.SCALE_VALIDATION_ERROR_SHOWN,
      [PERPS_EVENT_PROPERTY.ERROR_TYPE]: scaleLadderResult.code,
      ...scaleAnalyticsProperties,
    });
  }, [
    hasScaleValidationInteraction,
    isScaleOrder,
    scaleAnalyticsProperties,
    scaleLadderResult,
    track,
  ]);

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
  const chaseConfirmationPositionSizeRef = useRef(submissionPositionSize);
  const isChaseExecutionRef = useRef(false);

  const { placeOrder: executeOrder, isPlacing } = usePerpsOrderExecution({
    onSuccess: () => {
      if (isScaleOrder) {
        return;
      }
      const confirmationPositionSize = isChaseExecutionRef.current
        ? chaseConfirmationPositionSizeRef.current
        : submissionPositionSize;
      const toast = isTwapOrder
        ? PerpsToastOptions.orderManagement.twap.confirmed(
            orderForm.direction,
            confirmationPositionSize,
            orderForm.asset,
            twapDuration,
          )
        : isChaseExecutionRef.current
          ? PerpsToastOptions.orderManagement.chase.confirmed(
              orderForm.direction,
              confirmationPositionSize,
              orderForm.asset,
            )
          : standardOrderToastOptions.confirmed(
              orderForm.direction,
              confirmationPositionSize,
              orderForm.asset,
            );
      showToast(toast);
    },
    onError: (error) => {
      const toast = isTwapOrder
        ? PerpsToastOptions.orderManagement.twap.creationFailed(error)
        : isChaseExecutionRef.current
          ? PerpsToastOptions.orderManagement.chase.creationFailed(error)
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
  const rejectCrossMarginPosition = useCallback(
    (position?: Position | null) => {
      if (position?.leverage?.type !== 'cross') {
        return false;
      }

      navigation.navigate(Routes.PERPS.MODALS.ROOT, {
        screen: Routes.PERPS.MODALS.CROSS_MARGIN_WARNING,
      });
      track(MetaMetricsEvents.PERPS_ERROR, {
        [PERPS_EVENT_PROPERTY.ERROR_TYPE]:
          PERPS_EVENT_VALUE.ERROR_TYPE.VALIDATION,
        [PERPS_EVENT_PROPERTY.ERROR_MESSAGE]: 'Cross margin position detected',
        [PERPS_EVENT_PROPERTY.SCREEN_NAME]:
          PERPS_EVENT_VALUE.SCREEN_NAME.PERPS_ORDER,
        [PERPS_EVENT_PROPERTY.SCREEN_TYPE]:
          PERPS_EVENT_VALUE.SCREEN_TYPE.TRADING,
      });
      return true;
    },
    [navigation, track],
  );

  const handlePlaceOrder = async (
    expectedState: string,
    expectedSelectedAddress: string,
    isChaseSubmission: boolean,
  ) => {
    if (isSubmittingRef.current) {
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
    const reportChaseSubmissionChanged = () =>
      reportValidationFailure(
        strings(
          selectedAddressRef.current !== expectedSelectedAddress
            ? 'perps.order.validation.chase_account_changed'
            : 'perps.order.validation.chase_details_changed',
        ),
      );
    const isCurrentSubmission = () =>
      submissionStateRef.current === expectedState;
    if (!isCurrentSubmission()) {
      if (isChaseSubmission) reportChaseSubmissionChanged();
      return;
    }

    track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
      [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
        PERPS_EVENT_VALUE.INTERACTION_TYPE.TAP,
      [PERPS_EVENT_PROPERTY.BUTTON_CLICKED]:
        PERPS_EVENT_VALUE.BUTTON_CLICKED.PLACE_ORDER,
      [PERPS_EVENT_PROPERTY.ASSET]: orderForm.asset,
      [PERPS_EVENT_PROPERTY.DIRECTION]: directionTrackingValue,
      ...(isChaseSubmission
        ? {
            [PERPS_EVENT_PROPERTY.ORDER_TYPE]:
              PERPS_EVENT_VALUE.ORDER_TYPE.CHASE,
            [PERPS_EVENT_PROPERTY.REDUCE_ONLY]: reduceOnly,
          }
        : {}),
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

    if (
      orderForm.type === 'chase' &&
      (isChaseAvailabilityPending ||
        !isChaseEnabled ||
        chaseProviderId === null)
    ) {
      showToast(
        PerpsToastOptions.formValidation.orderForm.validationError(
          strings('perps.order.validation.chase_unavailable'),
        ),
      );
      return;
    }

    // Defensive guard for stale or programmatic invocations. The rendered CTA
    // is already disabled for both expected blocking states.
    if (isMarketDataBlocking || isAtCap) {
      return;
    }

    if (
      isScaleOrder &&
      (!isScaleOrdersEnabledRef.current ||
        isScaleOrderSupportPendingRef.current ||
        scaleProviderIdRef.current !== scalePlacementProviderIdRef.current)
    ) {
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
      let submissionChaseProviderId = chaseProviderIdRef.current;
      let submissionChaseState: string | undefined;
      let isCurrentChaseRoute: (() => boolean) | undefined;
      if (orderForm.type === 'chase') {
        submissionChaseState = expectedState;
        const expectedProviderId = chaseProviderIdRef.current;
        const refreshCapability = refreshChaseCapabilityRef.current;
        isCurrentChaseRoute = () =>
          !isChaseAvailabilityPendingRef.current &&
          isChaseEnabledRef.current &&
          expectedProviderId !== null &&
          chaseProviderIdRef.current === expectedProviderId &&
          refreshChaseCapabilityRef.current === refreshCapability;
        const refreshedProviderId = await refreshCapability();
        // A route change during the async refresh invalidates this submission.
        // The new route becomes available on the next user submit.
        if (
          !isCurrentChaseRoute() ||
          refreshedProviderId !== expectedProviderId
        ) {
          showToast(
            PerpsToastOptions.formValidation.orderForm.validationError(
              strings('perps.order.validation.chase_unavailable'),
            ),
          );
          return;
        }
        submissionChaseProviderId = expectedProviderId;
        let latestChases: ChaseOrder[];
        try {
          latestChases = await getChaseOrders();
        } catch {
          showToast(
            PerpsToastOptions.formValidation.orderForm.validationError(
              strings('perps.order.validation.chase_unavailable'),
            ),
          );
          return;
        }
        if (
          submissionChaseState !== submissionStateRef.current ||
          !isCurrentChaseRoute()
        ) {
          if (!isCurrentChaseRoute()) {
            showToast(
              PerpsToastOptions.formValidation.orderForm.validationError(
                strings('perps.order.validation.chase_unavailable'),
              ),
            );
          } else {
            reportChaseSubmissionChanged();
          }
          return;
        }
        if (
          latestChases.filter(occupiesChasePlacementSlot).length >=
          CHASE_ORDER_CONFIG.MaxActiveSessions
        ) {
          showToast(
            PerpsToastOptions.formValidation.orderForm.validationError(
              strings('perps.order.validation.chase_limit', {
                count: CHASE_ORDER_CONFIG.MaxActiveSessions,
              }),
            ),
          );
          return;
        }
      }

      const initialScaleValidation = isScaleOrder
        ? await validateLatestScalePlacement()
        : undefined;
      if (isScaleOrder && !initialScaleValidation) {
        reportValidationFailure(strings('perps.order.validation.error'));
        return;
      }
      const latestChaseValidation =
        orderForm.type === 'chase'
          ? await validateLatestChasePlacement()
          : undefined;
      if (orderForm.type === 'chase' && !latestChaseValidation) {
        reportChaseSubmissionChanged();
        return;
      }
      const submissionChaseSnapshot = latestChaseValidation?.snapshot;
      const validationResult = initialScaleValidation
        ? initialScaleValidation.validationResult
        : latestChaseValidation
          ? latestChaseValidation.validationResult
          : await validateNow();
      if (!isCurrentSubmission()) {
        if (isChaseSubmission) reportChaseSubmissionChanged();
        return;
      }
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
        (!orderProviderId ||
          !isTwapEnabledRef.current ||
          resolvedTwapProviderIdRef.current !== orderProviderId)
      ) {
        reportValidationFailure(
          strings('perps.order.validation.twap_unavailable'),
        );
        return;
      }

      if (isTwapOrder) {
        const expectedProviderId = orderProviderId;
        const checkCurrentTwapSupport = checkTwapOrderSupportRef.current;
        if (
          !expectedProviderId ||
          !(await checkCurrentTwapSupport()) ||
          !isTwapEnabledRef.current ||
          resolvedTwapProviderIdRef.current !== expectedProviderId ||
          checkTwapOrderSupportRef.current !== checkCurrentTwapSupport
        ) {
          reportValidationFailure(
            strings('perps.order.validation.twap_unavailable'),
          );
          return;
        }
        if (!isCurrentSubmission()) {
          return;
        }
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

      if (!isScaleOrder) {
        const validatedIsReduceOnlyPositionLoading =
          submissionChaseSnapshot?.isReduceOnlyPositionLoading ??
          isReduceOnlyPositionLoading;
        const validatedReduceOnly =
          submissionChaseSnapshot?.reduceOnly ?? reduceOnly;
        const validatedReduceOnlyValidation =
          submissionChaseSnapshot?.reduceOnlyValidation ?? reduceOnlyValidation;
        const validatedCurrentMarketPosition =
          submissionChaseSnapshot?.currentMarketPosition ??
          currentMarketPosition;
        if (
          validatedIsReduceOnlyPositionLoading ||
          (validatedReduceOnly && !validatedReduceOnlyValidation.isValid)
        ) {
          return;
        }
        if (rejectCrossMarginPosition(validatedCurrentMarketPosition)) {
          return;
        }
      }

      if (isScaleOrder) {
        const expectedProviderId = scalePlacementProviderIdRef.current;
        const checkCurrentScaleSupport = checkScaleOrderSupportRef.current;
        if (
          !expectedProviderId ||
          !isScaleOrdersEnabledRef.current ||
          isScaleOrderSupportPendingRef.current ||
          scaleProviderIdRef.current !== expectedProviderId ||
          !(await checkCurrentScaleSupport()) ||
          // Capability checks are async. Re-read every route guard before
          // accepting the result so a changed flag or provider fails closed.
          !isScaleOrdersEnabledRef.current ||
          isScaleOrderSupportPendingRef.current ||
          scaleProviderIdRef.current !== expectedProviderId ||
          checkScaleOrderSupportRef.current !== checkCurrentScaleSupport
        ) {
          showToast(
            PerpsToastOptions.formValidation.orderForm.validationError(
              strings('perps.pro_order_form.scale.validation.unavailable'),
            ),
          );
          return;
        }

        const latestScaleValidation = await validateLatestScalePlacement();
        if (!latestScaleValidation) {
          reportValidationFailure(strings('perps.order.validation.error'));
          return;
        }
        if (!latestScaleValidation.validationResult.isValid) {
          const firstFieldIssue =
            latestScaleValidation.validationResult.fieldIssues[0];
          const firstError =
            latestScaleValidation.validationResult.errors[0] ||
            (firstFieldIssue
              ? getOrderFormFieldIssueMessage(firstFieldIssue)
              : strings('perps.order.validation.error'));
          reportValidationFailure(firstError);
          return;
        }
        if (
          !isScaleOrdersEnabledRef.current ||
          isScaleOrderSupportPendingRef.current ||
          scaleProviderIdRef.current !== expectedProviderId ||
          checkScaleOrderSupportRef.current !== checkCurrentScaleSupport
        ) {
          reportValidationFailure(
            strings('perps.pro_order_form.scale.validation.unavailable'),
          );
          return;
        }

        const latestScale = latestScaleValidation.snapshot;
        if (
          latestScale.isReduceOnlyPositionLoading ||
          (latestScale.reduceOnly && !latestScale.reduceOnlyValidation.isValid)
        ) {
          return;
        }
        if (rejectCrossMarginPosition(latestScale.currentMarketPosition)) {
          return;
        }
        if (!latestScale.scaleLadderResult.success) {
          showToast(
            PerpsToastOptions.formValidation.orderForm.validationError(
              getScaleValidationMessage(latestScale.scaleLadderResult.code),
            ),
          );
          return;
        }

        const trackingData = buildPerpsOrderTrackingData({
          marginRequired: latestScale.effectiveMarginRequired,
          feeResults: latestScale.feeResults,
          marketPrice: latestScale.assetPrice,
          inputMethod: 'default',
          source,
          sourceSection,
          currentMarketPosition: latestScale.currentMarketPosition,
          direction: latestScale.orderForm.direction,
          chartLibrary,
          vipTier,
        });
        const scaleOrderParams = {
          ...buildPerpsOrderParams({
            asset: latestScale.orderForm.asset,
            isBuy: latestScale.orderForm.direction === 'long',
            size: latestScale.submissionPositionSize,
            orderType: 'scale',
            effectivePrice: latestScale.effectivePrice,
            leverage: latestScale.orderForm.leverage,
            maxSlippageBps: resolvedMaxSlippageBps,
            reduceOnly: latestScale.reduceOnly,
            providerId: expectedProviderId,
            isFullClose: latestScale.reduceOnly
              ? latestScale.reduceOnlyValidation.isFullClose ||
                latestScale.isExactFullClose
              : undefined,
            trackingData,
          }),
          scaleMinPrice: latestScale.scaleLadderResult.minPrice,
          scaleMaxPrice: latestScale.scaleLadderResult.maxPrice,
          scaleNumOrders: latestScale.scaleLadderResult.orderCount,
          scaleSkew: latestScale.scaleLadderResult.skew,
        };

        // Haptics are non-critical feedback; a device haptics failure must not
        // prevent the already-validated controller request from being placed.
        playImpact(ImpactMoment.PrimaryCTA).catch(() => undefined);
        const scaleSubmissionSummary = strings(
          'perps.pro_order_form.scale.submission_summary',
          {
            totalCount: latestScale.scaleLadderResult.orderCount,
            size: latestScale.submissionPositionSize,
            assetSymbol: latestScale.orderForm.asset,
          },
        );
        showToast({
          ...PerpsToastOptions.orderManagement.limit.submitted(
            latestScale.orderForm.direction,
            latestScale.submissionPositionSize,
            latestScale.orderForm.asset,
          ),
          labelOptions: getPerpsToastLabels(
            strings('perps.pro_order_form.scale.orders_submitted'),
            scaleSubmissionSummary,
          ),
        });

        const orderResult = await executeOrder(scaleOrderParams);
        if (!orderResult?.success) {
          return;
        }

        // Empty child arrays on a successful legacy result do not prove that
        // zero rungs were accepted. Use non-empty explicit counts, otherwise
        // fall back to the requested ladder rather than rendering "0 of N".
        const acceptedOrderCount =
          orderResult.acceptedChildren?.length ||
          orderResult.childOrderIds?.length ||
          latestScale.scaleLadderResult.orderCount;
        // Before `acceptedSize` existed, patched v13 providers returned the
        // accepted rung total in `submittedSize`. Keep that fallback until all
        // providers expose the new field, then fall back to the requested size.
        const acceptedSize =
          orderResult.acceptedSize ??
          orderResult.submittedSize ??
          latestScale.submissionPositionSize;
        const isPartialPlacement =
          acceptedOrderCount < latestScale.scaleLadderResult.orderCount;
        const scalePlacementTitle = strings(
          isPartialPlacement
            ? 'perps.pro_order_form.scale.orders_partially_placed'
            : 'perps.pro_order_form.scale.orders_placed',
        );
        const scalePlacementSummary = strings(
          isPartialPlacement
            ? 'perps.pro_order_form.scale.partial_placement_summary'
            : 'perps.pro_order_form.scale.placement_summary',
          {
            submittedCount: acceptedOrderCount,
            totalCount: latestScale.scaleLadderResult.orderCount,
            size: acceptedSize,
            assetSymbol: latestScale.orderForm.asset,
          },
        );
        showToast({
          ...PerpsToastOptions.orderManagement.limit.confirmed(
            latestScale.orderForm.direction,
            acceptedSize,
            latestScale.orderForm.asset,
          ),
          labelOptions: getPerpsToastLabels(
            scalePlacementTitle,
            scalePlacementSummary,
          ),
        });
        Engine.context.PerpsController?.clearPendingTradeConfiguration(
          latestScale.orderForm.asset,
        );
        updateOrderForm({
          amount: '',
          direction: 'long',
          balancePercent: 0,
          limitPrice: undefined,
          takeProfitPrice: undefined,
          stopLossPrice: undefined,
        });
        setLimitPrice(undefined);
        setTriggerPrice(undefined);
        setScaleStartPrice('');
        setScaleEndPrice('');
        setScaleTotalOrders('');
        setScaleSizeSkew(SCALE_DEFAULT_SKEW);
        setHasScaleValidationInteraction(false);
        setReduceOnly(false);
        return;
      }

      // reduce-only is Pro-specific (TAT-3595); the direct Pro path never
      // uses pay-with-any-token, so those tracking fields are omitted.
      // Finalize trailing decimals so Place Order does not depend on blur timing.
      if (orderForm.type === 'chase') {
        if (submissionChaseState !== submissionStateRef.current) {
          reportChaseSubmissionChanged();
          return;
        }
        if (!isCurrentChaseRoute?.()) {
          showToast(
            PerpsToastOptions.formValidation.orderForm.validationError(
              strings('perps.order.validation.chase_unavailable'),
            ),
          );
          return;
        }
      }
      if (!isCurrentSubmission()) {
        if (isChaseSubmission) reportChaseSubmissionChanged();
        return;
      }
      const finalizedLimitPrice = orderForm.limitPrice
        ? canonicalizeOrderPrice(
            finalizeNumericTextInput(orderForm.limitPrice),
            szDecimals,
          )
        : orderForm.limitPrice;
      const finalizedTriggerPrice = normalizedTriggerPrice;

      const latestChaseMaxDistanceBps =
        orderForm.type === 'chase' && chaseMaxDistance.trim()
          ? chaseMaxDistanceUnit === 'percent'
            ? parsedChaseMaxDistance * 100
            : latestMidPriceRef.current > 0
              ? (parsedChaseMaxDistance / latestMidPriceRef.current) *
                BASIS_POINTS_DIVISOR
              : Number.NaN
          : undefined;
      if (
        latestChaseMaxDistanceBps !== undefined &&
        (!Number.isFinite(latestChaseMaxDistanceBps) ||
          latestChaseMaxDistanceBps <= 0 ||
          latestChaseMaxDistanceBps >= BASIS_POINTS_DIVISOR)
      ) {
        reportValidationFailure(chaseMaxDistanceErrorMessage);
        return;
      }

      const placementOrderForm =
        submissionChaseSnapshot?.orderForm ?? orderForm;
      const placementPositionSize =
        submissionChaseSnapshot?.submissionPositionSize ??
        submissionPositionSize;
      if (placementOrderForm.type === 'chase') {
        chaseConfirmationPositionSizeRef.current = placementPositionSize;
      }
      const placementEffectivePrice =
        submissionChaseSnapshot?.effectivePrice ?? effectivePrice;
      const placementUsdAmount =
        submissionChaseSnapshot?.effectiveUsdAmount ?? effectiveUsdAmount;
      const placementReduceOnly =
        submissionChaseSnapshot?.reduceOnly ?? reduceOnly;
      const placementIsExactFullClose =
        submissionChaseSnapshot?.isExactFullClose ?? isExactFullClose;
      const placementReduceOnlyValidation =
        submissionChaseSnapshot?.reduceOnlyValidation ?? reduceOnlyValidation;
      const placementCurrentMarketPosition =
        submissionChaseSnapshot?.currentMarketPosition ?? currentMarketPosition;
      const orderParams = buildPerpsOrderParams({
        asset: placementOrderForm.asset,
        isBuy: placementOrderForm.direction === 'long',
        size: placementPositionSize,
        orderType: placementOrderForm.type,
        effectivePrice: placementEffectivePrice,
        leverage: placementOrderForm.leverage,
        usdAmount: placementIsExactFullClose ? undefined : placementUsdAmount,
        maxSlippageBps: resolvedMaxSlippageBps,
        limitPrice: finalizedLimitPrice,
        chaseMaxDistanceBps: latestChaseMaxDistanceBps,
        providerId:
          placementOrderForm.type === 'chase'
            ? (submissionChaseProviderId ?? undefined)
            : isTwapOrder
              ? resolvedTwapProviderIdRef.current
              : orderProviderId,
        triggerPrice: finalizedTriggerPrice,
        takeProfitPrice:
          isTriggerOrderType(placementOrderForm.type) ||
          placementOrderForm.type === 'chase'
            ? undefined
            : placementOrderForm.takeProfitPrice,
        stopLossPrice:
          isTriggerOrderType(placementOrderForm.type) ||
          placementOrderForm.type === 'chase'
            ? undefined
            : placementOrderForm.stopLossPrice,
        reduceOnly: placementReduceOnly,
        twapDuration: isTwapOrder ? twapDuration : undefined,
        twapRandomize: isTwapOrder ? twapRandomize : undefined,
        isFullClose: placementReduceOnly
          ? placementReduceOnlyValidation.isFullClose ||
            placementIsExactFullClose
          : undefined,
        trackingData: buildPerpsOrderTrackingData({
          marginRequired:
            submissionChaseSnapshot?.effectiveMarginRequired ??
            effectiveMarginRequired,
          feeResults: submissionChaseSnapshot?.feeResults ?? feeResults,
          marketPrice: submissionChaseSnapshot?.assetPrice ?? assetData.price,
          inputMethod: 'default',
          source,
          sourceSection,
          currentMarketPosition: placementCurrentMarketPosition,
          direction: placementOrderForm.direction,
          chartLibrary,
          vipTier,
        }),
      });

      playImpact(ImpactMoment.PrimaryCTA).catch(() => undefined);
      isChaseExecutionRef.current = isChaseSubmission;
      const submittedToast = isTwapOrder
        ? PerpsToastOptions.orderManagement.twap.submitted(
            placementOrderForm.direction,
            placementPositionSize,
            placementOrderForm.asset,
            twapDuration,
          )
        : isChaseSubmission
          ? PerpsToastOptions.orderManagement.chase.submitted(
              placementOrderForm.direction,
              placementPositionSize,
              placementOrderForm.asset,
            )
          : standardOrderToastOptions.submitted(
              placementOrderForm.direction,
              placementPositionSize,
              placementOrderForm.asset,
            );
      showToast(submittedToast);

      const shouldHandleTPSLSeparately =
        !isTwapOrder &&
        !reduceOnly &&
        !isTriggerOrderType(orderForm.type) &&
        orderForm.type !== 'chase' &&
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
        balancePercent: 0,
        limitPrice: undefined,
        takeProfitPrice: undefined,
        stopLossPrice: undefined,
      });
      setLimitPrice(undefined);
      setTriggerPrice(undefined);
      setReduceOnly(false);
      resetTwapDraft();
      setChaseMaxDistance('');
    } finally {
      isSubmittingRef.current = false;
    }
  };
  const handlePlaceOrderRef = useRef(handlePlaceOrder);
  useLayoutEffect(() => {
    handlePlaceOrderRef.current = handlePlaceOrder;
  });

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
      guardScaleMutation(() => {
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
      guardScaleMutation,
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
      guardScaleMutation(() => {
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
        if (type === 'chase' && !isChaseEnabled) {
          setIsOrderTypeVisible(false);
          return;
        }
        if (type !== orderForm.type) {
          resetPriceInputInteraction();
        }
        setOrderType(type);
        if (type === 'twap' || type === 'scale' || type === 'chase') {
          setLimitPrice(undefined);
          setTriggerPrice(undefined);
          setTakeProfitPrice(undefined);
          setStopLossPrice(undefined);
        }
        setIsOrderTypeVisible(false);
      });
    },
    [
      isTriggeredOrdersEnabled,
      isScaleOrdersEnabled,
      isTwapEnabled,
      isChaseEnabled,
      guardScaleMutation,
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

    if (
      orderForm.type === 'chase' &&
      activeChaseCount >= CHASE_ORDER_CONFIG.MaxActiveSessions
    ) {
      list.push({
        id: 'chase-limit',
        variant: 'banner',
        message: strings('perps.order.validation.chase_limit', {
          count: CHASE_ORDER_CONFIG.MaxActiveSessions,
        }),
      });
    }

    if (isChaseMaxDistanceInvalid) {
      list.push({
        id: 'chase-max-distance',
        variant: 'banner',
        message: chaseMaxDistanceErrorMessage,
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
    activeChaseCount,
    chaseMaxDistanceErrorMessage,
    isChaseMaxDistanceInvalid,
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
          PERPS_EVENT_VALUE.INTERACTION_TYPE.SCALE_CONFIG_CHANGED,
        [PERPS_EVENT_PROPERTY.SETTING_TYPE]: settingType,
        ...scaleAnalyticsProperties,
        ...overrides,
      });
    },
    [scaleAnalyticsProperties, track],
  );

  const scaleMarginRange = useMemo(() => {
    if (!scaleLadderResult.success || scaleRungs.length === 0) {
      return PERPS_CONSTANTS.FallbackPriceDisplay;
    }

    const rungMargins = scaleRungs.map(
      (rung) =>
        new BigNumber(
          calculateMarginRequired({
            amount: new BigNumber(rung.size).times(rung.price).toFixed(),
            leverage: orderForm.leverage,
          }),
        ),
    );
    const minimumMargin = formatPerpsFiat(
      BigNumber.min(...rungMargins).toFixed(),
      { ranges: PRICE_RANGES_MINIMAL_VIEW },
    );
    const maximumMargin = formatPerpsFiat(
      BigNumber.max(...rungMargins).toFixed(),
      { ranges: PRICE_RANGES_MINIMAL_VIEW },
    );
    return strings('perps.pro_order_form.scale.range', {
      start: minimumMargin,
      end: maximumMargin,
    });
  }, [orderForm.leverage, scaleLadderResult.success, scaleRungs]);

  const scaleLiquidationRange = useMemo(() => {
    if (
      !scaleLadderResult.success ||
      isScaleStartLiquidationCalculating ||
      isScaleEndLiquidationCalculating
    ) {
      return PERPS_CONSTANTS.FallbackPriceDisplay;
    }

    const start = new BigNumber(scaleStartLiquidationPrice);
    const end = new BigNumber(scaleEndLiquidationPrice);
    if (!start.isFinite() || !end.isFinite() || start.lte(0) || end.lte(0)) {
      return PERPS_CONSTANTS.FallbackPriceDisplay;
    }

    const minimum = formatPerpsFiat(BigNumber.min(start, end).toFixed(), {
      ranges: PRICE_RANGES_UNIVERSAL,
    });
    const maximum = formatPerpsFiat(BigNumber.max(start, end).toFixed(), {
      ranges: PRICE_RANGES_UNIVERSAL,
    });
    return strings('perps.pro_order_form.scale.range', {
      start: minimum,
      end: maximum,
    });
  }, [
    isScaleEndLiquidationCalculating,
    isScaleStartLiquidationCalculating,
    scaleEndLiquidationPrice,
    scaleLadderResult.success,
    scaleStartLiquidationPrice,
  ]);

  const scaleOrder = useMemo<PerpsProScaleOrderModel>(
    () => ({
      startPrice: scaleStartPrice,
      endPrice: scaleEndPrice,
      totalOrders: scaleTotalOrders,
      sizeSkew: scaleSizeSkew,
      onStartPriceChange: (value) =>
        guardScaleMutation(() => {
          setHasScaleValidationInteraction(true);
          normalizeScaleInput(value, scaleStartPrice, setScaleStartPrice);
        }),
      onStartPriceBlur: () =>
        guardScaleMutation(() => {
          trackScaleConfiguration(
            PERPS_EVENT_VALUE.SETTING_TYPE.SCALE_START_PRICE,
          );
        }),
      onEndPriceChange: (value) =>
        guardScaleMutation(() => {
          setHasScaleValidationInteraction(true);
          normalizeScaleInput(value, scaleEndPrice, setScaleEndPrice);
        }),
      onEndPriceBlur: () =>
        guardScaleMutation(() => {
          trackScaleConfiguration(
            PERPS_EVENT_VALUE.SETTING_TYPE.SCALE_END_PRICE,
          );
        }),
      onTotalOrdersChange: (value) =>
        guardScaleMutation(() => {
          setHasScaleValidationInteraction(true);
          normalizeScaleInput(value, scaleTotalOrders, setScaleTotalOrders, 0);
        }),
      onTotalOrdersBlur: () =>
        guardScaleMutation(() => {
          trackScaleConfiguration(
            PERPS_EVENT_VALUE.SETTING_TYPE.SCALE_TOTAL_ORDERS,
          );
        }),
      onSizeSkewChange: (value) =>
        guardScaleMutation(() => {
          setHasScaleValidationInteraction(true);
          normalizeScaleInput(
            value,
            scaleSizeSkew,
            setScaleSizeSkew,
            SCALE_SKEW_DECIMAL_PLACES,
          );
        }),
      onSizeSkewBlur: () =>
        guardScaleMutation(() => {
          const coercedSkew = scaleSizeSkew
            ? coerceScaleSkew(scaleSizeSkew)
            : SCALE_DEFAULT_SKEW;
          setScaleSizeSkew(coercedSkew);
          trackScaleConfiguration(
            PERPS_EVENT_VALUE.SETTING_TYPE.SCALE_SIZE_SKEW,
            {
              [PERPS_EVENT_PROPERTY.SCALE_SKEW]: Number(coercedSkew),
            },
          );
        }),
      onSizeSkewInfoPress: () =>
        guardScaleMutation(() => {
          setSelectedTooltip('size_skew');
        }),
      rungs: scaleRungs,
      marginRange: scaleMarginRange,
      liquidationRange: scaleLiquidationRange,
      fees:
        scaleLadderResult.success && typeof estimatedFees === 'number'
          ? formatPerpsFiat(estimatedFees, {
              ranges: PRICE_RANGES_MINIMAL_VIEW,
            })
          : PERPS_CONSTANTS.FallbackPriceDisplay,
    }),
    [
      estimatedFees,
      guardScaleMutation,
      normalizeScaleInput,
      scaleEndPrice,
      scaleLadderResult,
      scaleLiquidationRange,
      scaleMarginRange,
      scaleRungs,
      scaleSizeSkew,
      scaleStartPrice,
      scaleTotalOrders,
      trackScaleConfiguration,
    ],
  );

  const isPlaceOrderDisabled =
    !hasValidAmount ||
    !orderValidation.isValid ||
    isAtCap ||
    (orderForm.type === 'chase' &&
      activeChaseCount >= CHASE_ORDER_CONFIG.MaxActiveSessions) ||
    (orderForm.type === 'chase' &&
      (isChaseAvailabilityPending ||
        !isChaseEnabled ||
        chaseProviderId === null)) ||
    isChaseMaxDistanceInvalid ||
    isPlacing ||
    isScalePlacementPending ||
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
    (direction: PerpsProOrderDirection) =>
      guardScaleMutation(() => setDirection(direction)),
    [guardScaleMutation, setDirection],
  );

  const onLeveragePress = useCallback(() => {
    guardScaleMutation(() => setIsLeverageVisible(true));
  }, [guardScaleMutation]);

  const onOrderTypeButtonPress = useCallback(() => {
    guardScaleMutation(() => setIsOrderTypeVisible(true));
  }, [guardScaleMutation]);

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

  const onChaseMaxDistanceChange = useCallback(
    (value: string) => {
      const result = normalizeNumericTextInput(value, chaseMaxDistance, {
        maxDigits: MAX_PERPS_INPUT_DIGITS,
        acceptedDecimalSeparators: ['.', ','],
      });
      if (result.ok) {
        setChaseMaxDistance(result.value);
      }
    },
    [chaseMaxDistance, setChaseMaxDistance],
  );

  const onChaseMaxDistanceUnitChange = useCallback(
    (unit: 'usd' | 'percent') => {
      if (unit === chaseMaxDistanceUnit) {
        return;
      }
      setChaseMaxDistance('');
      setChaseMaxDistanceUnit(unit);
    },
    [chaseMaxDistanceUnit],
  );

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

  const onPlaceOrderPress = useCallback(async () => {
    if (isScalePlacementLockedRef.current) {
      return;
    }

    // Gesture cancellation can bypass both onDragEnd and RN onTouchCancel.
    // Flush a pending preview and wait for canonical order state to re-render
    // before submitting, matching Lite's interrupted-drag guard.
    if (commitPendingSliderPreview()) {
      return;
    }

    const expectedSubmissionState = submissionStateRef.current;
    const expectedSelectedAddress = selectedAddressRef.current;
    const isChaseSubmission = orderForm.type === 'chase';
    if (isScaleOrder) {
      setHasScaleValidationInteraction(true);
    }

    const locksScalePlacement = isScaleOrder;
    if (locksScalePlacement) {
      isScalePlacementLockedRef.current = true;
      scalePlacementProviderIdRef.current = scaleProviderIdRef.current;
      setIsScalePlacementPending(true);
    }

    try {
      // Compliance first, then geographic eligibility — matches Lite trade entry
      // and the canonical compliance gate ordering (docs/compliance.md).
      await gate(async () => {
        if (submissionStateRef.current !== expectedSubmissionState) {
          if (isChaseSubmission) {
            showToast(
              PerpsToastOptions.formValidation.orderForm.validationError(
                strings(
                  selectedAddressRef.current !== expectedSelectedAddress
                    ? 'perps.order.validation.chase_account_changed'
                    : 'perps.order.validation.chase_details_changed',
                ),
              ),
            );
          }
          return;
        }
        if (!isEligible) {
          showEligibilityModal(PERPS_EVENT_VALUE.SOURCE.TRADE_ACTION);
          return;
        }
        await handlePlaceOrderRef.current(
          expectedSubmissionState,
          expectedSelectedAddress,
          isChaseSubmission,
        );
      });
    } finally {
      if (locksScalePlacement) {
        isScalePlacementLockedRef.current = false;
        scalePlacementProviderIdRef.current = undefined;
        setIsScalePlacementPending(false);
      }
    }
  }, [
    commitPendingSliderPreview,
    gate,
    isEligible,
    orderForm.type,
    PerpsToastOptions.formValidation.orderForm,
    isScaleOrder,
    showToast,
    showEligibilityModal,
  ]);

  const onReduceOnlyChange = useCallback(
    (value: boolean) => {
      guardScaleMutation(() => {
        setReduceOnly(value);
        if (value) {
          setTakeProfitPrice(undefined);
          setStopLossPrice(undefined);
        }
      });
    },
    [guardScaleMutation, setTakeProfitPrice, setStopLossPrice],
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

  const presentedSizeInput = useMemo<PerpsProSizeInputModel>(
    () => ({
      ...sizeInput,
      onChange: (value) =>
        guardScaleMutation(() => {
          if (isScaleOrder) {
            setHasScaleValidationInteraction(true);
          }
          sizeInput.onChange(value);
        }),
      onFocus: () => guardScaleMutation(sizeInput.onFocus),
      onBlur: () => guardScaleMutation(sizeInput.onBlur),
      onToggleDenomination: () =>
        guardScaleMutation(sizeInput.onToggleDenomination),
    }),
    [guardScaleMutation, isScaleOrder, sizeInput],
  );
  const presentedSizeSlider = useMemo<PerpsProSizeSliderModel>(
    () => ({
      ...sizeSlider,
      onValueChange: (value) =>
        guardScaleMutation(() => sizeSlider.onValueChange(value)),
      onDragEnd: (value) =>
        guardScaleMutation(() => sizeSlider.onDragEnd(value)),
      onDragCancel: () => guardScaleMutation(sizeSlider.onDragCancel),
    }),
    [guardScaleMutation, sizeSlider],
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
    onLeveragePress,
    orderType: orderForm.type,
    activeChaseCount,
    onOrderTypeButtonPress,
    limitPrice: orderForm.limitPrice ?? '',
    chaseMaxDistance,
    chaseMaxDistanceUnit,
    onChaseMaxDistanceUnitChange,
    chaseReferencePrice:
      assetData.price > 0
        ? formatPerpsFiat(assetData.price)
        : PERPS_CONSTANTS.FallbackPriceDisplay,
    onChaseMaxDistanceChange,
    onLimitPriceChange,
    onLimitPriceBlur,
    onUseMidPricePress,
    triggerPrice: triggerPrice ?? '',
    onTriggerPriceChange,
    onTriggerPriceBlur,
    priceCardMessage,
    sizeInput: presentedSizeInput,
    sizeSlider: presentedSizeSlider,
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
    isPlaceOrderLoading: isScalePlacementPending || isPlacing,
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
