import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import {
  TRADING_DEFAULTS,
  DECIMAL_PRECISION_CONFIG,
  OrderType,
  PerpsMode,
  getMaxAllowedAmount,
  isLimitExecutionOrderType,
  isTriggerOrderType,
  selectTradeConfiguration,
  selectPendingTradeConfiguration,
  selectSelectedOrderType,
  type PerpsProviderType,
  type OrderFormState,
} from '@metamask/perps-controller';
import Engine from '../../../../core/Engine';
import {
  usePerpsLiveAccount,
  usePerpsLivePositions,
  usePerpsLivePrices,
} from './stream';
import {
  readAvailableToTradeUsd,
  usePerpsLiveAvailableToTrade,
} from './stream/usePerpsLiveAvailableToTrade';
import { usePerpsMarketData } from './usePerpsMarketData';
import { usePerpsNetwork } from './usePerpsNetwork';
import { usePerpsMaxSlippage } from './usePerpsMaxSlippage';
import { usePerpsSelector } from './usePerpsSelector';
import { selectPerpsMode } from '../selectors/perpsController';
import {
  getMaxAllowedAmountAtExecutionPrice,
  getProspectiveExecutionPrice,
  getTriggerMarketSlippageCapPrice,
} from '../utils/orderSizing';
import { canonicalizeOrderPrice } from '../utils/triggerOrderValidation';
import { resolvePerpsMaxSlippageBps } from '../constants/slippageConfig';

/**
 * Price-bearing field the user last focused in the order form.
 *
 * An order-book tap fills this field instead of the order type's default.
 * Scale and Chase fields live in the Pro form and register their own handlers.
 */
export type PerpsOrderPriceField =
  | 'limit'
  | 'trigger'
  | 'scaleStart'
  | 'scaleEnd'
  | 'chaseMaxDistance';

/**
 * Commit handlers for price fields this hook does not itself own. Registered
 * by `usePerpsProOrderForm` (Pro-only scale/chase state) so `commitPriceToField`
 * can route an order-book tap to them without lifting that state up here.
 */
export interface PerpsOrderPriceFieldHandlers {
  scaleStart?: (price?: string) => void;
  scaleEnd?: (price?: string) => void;
  chaseMaxDistance?: (price?: string) => void;
}

interface UsePerpsOrderFormParams {
  providerId?: PerpsProviderType;
  initialAsset?: string;
  initialDirection?: 'long' | 'short';
  initialAmount?: string;
  /** Surface-specific fallback used when no explicit or pending amount exists. */
  fallbackAmount?: string;
  initialLeverage?: number;
  initialType?: OrderType;
  /** Known market precision from navigation; avoids a duplicate market fetch. */
  initialSzDecimals?: number;
  /** When paying with a custom token, the selected token amount in USD; used to cap maxPossibleAmount and handlers */
  effectiveAvailableBalance?: number;
}

const isOrderTypeAllowedOnSurface = (
  type: OrderType | undefined,
  mode: PerpsMode,
): type is OrderType => {
  if (!type) {
    return false;
  }
  if (mode === PerpsMode.Lite) {
    return type === 'market' || type === 'limit';
  }
  return true;
};

export interface UsePerpsOrderFormReturn {
  orderForm: OrderFormState;
  updateOrderForm: (updates: Partial<OrderFormState>) => void;
  setAmount: (amount: string) => void;
  setLeverage: (leverage: number) => void;
  setDirection: (direction: 'long' | 'short') => void;
  setAsset: (asset: string) => void;
  setTakeProfitPrice: (price?: string) => void;
  setStopLossPrice: (price?: string) => void;
  setLimitPrice: (price?: string) => void;
  /** Marks a limit price as user-committed (including order-book selection). */
  commitLimitPrice: (price?: string) => void;
  /** Marks the trigger price as user-committed (including order-book selection). */
  commitTriggerPrice: (price?: string) => void;
  hasBlurredLimitPrice: boolean;
  hasBlurredTriggerPrice: boolean;
  /** Local to the form; not part of controller `OrderFormState`. */
  triggerPrice: string | undefined;
  setTriggerPrice: (price?: string) => void;
  /** Clears price-field interaction state without clearing entered prices. */
  resetPriceInputInteraction: () => void;
  /** Price field the user last focused; null once order type/asset changes. */
  activePriceField: PerpsOrderPriceField | null;
  setActivePriceField: (field: PerpsOrderPriceField | null) => void;
  /** Lets `usePerpsProOrderForm` expose commit handlers for fields it owns. */
  registerPriceFieldHandlers: (handlers: PerpsOrderPriceFieldHandlers) => void;
  /**
   * Commits an order-book price to `field`. Returns false when `field` has no
   * registered handler (e.g. a Pro-only field on a Lite surface), letting the
   * caller fall back to its own order-type-based default.
   */
  commitPriceToField: (field: PerpsOrderPriceField, price?: string) => boolean;
  setOrderType: (type: OrderType) => void;
  /** Reduce-only flag restored from the 30s pending draft, if present. */
  pendingReduceOnly: boolean | undefined;
  handlePercentageAmount: (percentage: number) => void;
  handleMaxAmount: () => void;
  handleMinAmount: () => void;
  maxPossibleAmount: number;
  /**
   * Temporarily replace the margin-based max (e.g. Reduce Only, where max is
   * the open position notional). Pass `null` to restore the margin-based cap.
   */
  setMaxPossibleAmountOverride: (amount: number | null) => void;
  /** Reserves the quoted trading fee (fraction of notional) in the margin-based max. */
  setEstimatedFeeRate: (rate: number) => void;
  /** Balance to use for validation and UI (Perps balance or selected token amount in USD when paying with custom token) */
  balanceForValidation: number;
  /**
   * Perps balance that caps the order for the current side, in USD: the venue
   * figure from `subscribeToAvailableToTrade`. If that stream reports an
   * error, it is the account `spendableBalance` (the pre-stream source), so the
   * form leaves loading instead of waiting forever. Undefined while it is
   * unknown. Not used when a payment balance caps the order.
   */
  perpsAvailableToTrade: number | undefined;
  /**
   * True while the perps balance is unknown: the venue figure has not arrived
   * and the stream has not failed. A selected payment balance does not wait on
   * the stream. `balanceForValidation` is 0 while this is true, so callers
   * must not treat that 0 as a real balance.
   */
  isAvailableToTradeLoading: boolean;
}

/**
 * Hook to manage the perpetual order form state and calculations
 * This hook is protocol-agnostic and handles form state management
 */
export function usePerpsOrderForm(
  params: UsePerpsOrderFormParams = {},
): UsePerpsOrderFormReturn {
  const {
    initialAsset = 'BTC',
    initialDirection,
    initialAmount,
    fallbackAmount: fallbackAmountParam,
    initialLeverage,
    initialType,
    initialSzDecimals,
    effectiveAvailableBalance: effectiveAvailableBalanceParam,
  } = params;

  const currentNetwork = usePerpsNetwork();
  const { maxSlippageBps, maxSlippageSource } = usePerpsMaxSlippage();
  const { account } = usePerpsLiveAccount();
  const { positions } = usePerpsLivePositions();
  const prices = usePerpsLivePrices({
    providerId: params.providerId,
    symbols: [initialAsset],
    throttleMs: 1000,
  });
  const currentPrice = prices[initialAsset];
  const { marketData } = usePerpsMarketData({
    asset: initialSzDecimals == null ? initialAsset : '',
    providerId: params.providerId,
  });
  const assetSzDecimals =
    initialSzDecimals ??
    marketData?.szDecimals ??
    DECIMAL_PRECISION_CONFIG.FallbackSizeDecimals;

  // Get existing position leverage for this asset (protocol constraint)
  // Positions load asynchronously via WebSocket, so this may be undefined initially
  const existingPositionLeverage = useMemo(
    () =>
      positions.find(
        (p) =>
          p.symbol === initialAsset &&
          (!p.providerId ||
            !params.providerId ||
            p.providerId === params.providerId),
      )?.leverage?.value,
    [positions, initialAsset, params.providerId],
  );

  // Get saved trade configuration for this asset (user preference for new positions)
  const savedConfig = usePerpsSelector((state) =>
    selectTradeConfiguration(state, initialAsset),
  );

  // Get pending trade configuration for this asset (temporary, expires after 30 seconds)
  const pendingConfig = usePerpsSelector((state) =>
    selectPendingTradeConfiguration(state, initialAsset),
  );

  const persistedOrderType = usePerpsSelector(selectSelectedOrderType);
  const perpsMode = useSelector(selectPerpsMode);

  // Determine default amount based on network
  const defaultAmount =
    currentNetwork === 'mainnet'
      ? TRADING_DEFAULTS.amount.mainnet
      : TRADING_DEFAULTS.amount.testnet;
  const fallbackAmount = fallbackAmountParam ?? defaultAmount.toString();

  // Priority for leverage: navigation param > existing position leverage > pending config > saved config > default (3x)
  const defaultLeverage =
    initialLeverage ||
    existingPositionLeverage ||
    pendingConfig?.leverage ||
    savedConfig?.leverage ||
    TRADING_DEFAULTS.leverage;

  // Navigation param > persisted global type > pending draft.
  // Pending is per-market, so it must not override a type chosen on another market.
  // Lite only offers market/limit; skip Pro-only types (twap, triggers) so they
  // stay stored for Pro instead of being submitted from Lite.
  const defaultOrderType =
    [initialType, persistedOrderType, pendingConfig?.orderType].find((type) =>
      isOrderTypeAllowedOnSurface(type, perpsMode),
    ) ?? 'market';

  // Navigation param > pending draft > long. Do not default the param to long
  // or a short draft cannot restore when the route omits direction.
  const defaultDirection =
    initialDirection ?? pendingConfig?.direction ?? 'long';

  const initialAmountSeed =
    initialAmount ?? pendingConfig?.amount ?? fallbackAmount;

  // Initialize form state with pending config if available. The venue
  // available-to-trade stream arrives after mount, and the effect below
  // replaces this seed once that figure can cap the amount.
  const [orderForm, setOrderForm] = useState<OrderFormState>({
    asset: initialAsset,
    direction: defaultDirection,
    amount: initialAmountSeed,
    leverage: defaultLeverage,
    balancePercent:
      initialAmountSeed === '' ? 0 : TRADING_DEFAULTS.marginPercent,
    takeProfitPrice: pendingConfig?.takeProfitPrice,
    stopLossPrice: pendingConfig?.stopLossPrice,
    limitPrice: pendingConfig?.limitPrice,
    type: defaultOrderType,
  });

  const { availableToTrade, isUnavailable: isAvailableToTradeStreamFailed } =
    usePerpsLiveAvailableToTrade({
      symbol: orderForm.asset,
    });
  // A wallet or Money Account payment caps size at that balance. Perps
  // balance is the venue's available to trade for this market and side. It
  // stays undefined until the venue reports. If the stream fails, fall back to
  // the account `spendableBalance` so the form does not wait forever, which is
  // the same fallback `useDefaultPayWithTokenWhenNoPerpsBalance` uses.
  const venueAvailableToTrade = readAvailableToTradeUsd(
    availableToTrade,
    orderForm.direction,
  );
  // Stays NaN while the account has not reported, so a failed stream does not
  // turn a missing balance into a real zero.
  const accountSpendableBalance =
    account?.spendableBalance == null
      ? Number.NaN
      : Number.parseFloat(account.spendableBalance.toString());
  const perpsAvailableToTrade =
    venueAvailableToTrade ??
    (isAvailableToTradeStreamFailed && Number.isFinite(accountSpendableBalance)
      ? accountSpendableBalance
      : undefined);
  const parsedPaymentBalance =
    effectiveAvailableBalanceParam != null
      ? Number.parseFloat(effectiveAvailableBalanceParam.toString())
      : Number.NaN;
  const hasPaymentBalance = Number.isFinite(parsedPaymentBalance);
  const isAvailableToTradeLoading =
    !hasPaymentBalance && perpsAvailableToTrade === undefined;
  // Stays undefined while the Perps balance is unknown. Sizing below waits on
  // it instead of treating it as zero.
  const balanceForMax: number | undefined = hasPaymentBalance
    ? parsedPaymentBalance
    : perpsAvailableToTrade;

  // Priority for amount: navigation param > pending config > calculated default.
  // The memo updates when the venue figure arrives so the effect can cap the seed.
  const initialAmountValue = useMemo(() => {
    if (initialAmount) {
      return initialAmount;
    }

    if (pendingConfig?.amount) {
      return pendingConfig.amount;
    }

    // Don't calculate if price is not available yet to avoid temporary 0 values
    if (!currentPrice?.price) {
      return fallbackAmount;
    }

    if (fallbackAmount === '') {
      return '';
    }

    if (balanceForMax === undefined) {
      return fallbackAmount;
    }

    const tempMaxAmount = getMaxAllowedAmount({
      spendableBalance: balanceForMax,
      assetPrice: Number.parseFloat(currentPrice.price),
      assetSzDecimals,
      leverage: defaultLeverage,
    });

    const numericFallbackAmount = Number.parseFloat(fallbackAmount);
    if (!Number.isFinite(numericFallbackAmount)) {
      return fallbackAmount;
    }

    // Return the target amount directly (USD as source of truth, no optimization).
    // Lite uses its conservative network default; other surfaces can opt out.
    const targetAmount =
      tempMaxAmount < numericFallbackAmount
        ? tempMaxAmount.toString()
        : fallbackAmount;

    return targetAmount;
  }, [
    initialAmount,
    pendingConfig?.amount,
    balanceForMax,
    fallbackAmount,
    currentPrice?.price,
    assetSzDecimals,
    defaultLeverage,
  ]);

  const [maxPossibleAmountOverride, setMaxPossibleAmountOverride] = useState<
    number | null
  >(null);
  const [triggerPrice, setTriggerPrice] = useState<string | undefined>();
  const [hasBlurredLimitPrice, setHasBlurredLimitPrice] = useState(false);
  const [hasBlurredTriggerPrice, setHasBlurredTriggerPrice] = useState(false);
  const resetPriceInputInteraction = useCallback(() => {
    setHasBlurredLimitPrice(false);
    setHasBlurredTriggerPrice(false);
  }, []);
  const [activePriceField, setActivePriceField] =
    useState<PerpsOrderPriceField | null>(null);
  const priceFieldHandlersRef = useRef<PerpsOrderPriceFieldHandlers>({});
  const registerPriceFieldHandlers = useCallback(
    (handlers: PerpsOrderPriceFieldHandlers) => {
      priceFieldHandlersRef.current = handlers;
    },
    [],
  );
  // Fee rate (protocol + MetaMask) as a fraction of notional, pushed in by the
  // order surface from its own resolved fee quote (`usePerpsOrderFees`), so the
  // max size and the displayed fee never diverge. Fees are charged on top of
  // margin, so the max size must leave room for them.
  const [estimatedFeeRate, setEstimatedFeeRate] = useState(0);

  const effectiveMaxSlippageBps = useMemo(
    () =>
      resolvePerpsMaxSlippageBps({
        orderType: orderForm.type,
        maxSlippageBps,
        maxSlippageSource,
      }),
    [maxSlippageBps, maxSlippageSource, orderForm.type],
  );

  // Calculate the maximum possible amount; when paying with custom token, capped by selected token amount in USD
  // For priced placements, use the prospective execution price so the 100% slider
  // correctly reflects the max order size at the user-specified price
  const marginBasedMaxPossibleAmount = useMemo(() => {
    // No cap can be derived until the Perps balance is known.
    if (balanceForMax === undefined) {
      return 0;
    }
    // Margin + fee <= balance, with fee = rate * notional = rate * margin * leverage.
    // Pay-with-token market orders also deposit margin plus the max slippage
    // (see `getPayWithTokenDepositAmount`), so that reserve must fit the
    // balance too or 100% always reads as insufficient funds.
    const isMarketOrder =
      !isLimitExecutionOrderType(orderForm.type) &&
      !isTriggerOrderType(orderForm.type);
    const slippageReserveRate =
      hasPaymentBalance && isMarketOrder ? effectiveMaxSlippageBps / 10_000 : 0;
    const feeAdjustedBalance =
      balanceForMax /
      (1 + estimatedFeeRate * orderForm.leverage + slippageReserveRate);
    const marketPrice = Number.parseFloat(currentPrice?.price) || 0;
    const sizeDecimals = assetSzDecimals;
    const canonicalLimitPrice = canonicalizeOrderPrice(
      orderForm.limitPrice,
      sizeDecimals,
    );
    const canonicalTriggerPrice = canonicalizeOrderPrice(
      triggerPrice,
      sizeDecimals,
    );
    const effectiveAssetPrice = getProspectiveExecutionPrice({
      orderType: orderForm.type,
      limitPrice: canonicalLimitPrice,
      triggerPrice: canonicalTriggerPrice,
      marketPrice,
    });
    const isTriggerMarketOrder =
      isTriggerOrderType(orderForm.type) &&
      !isLimitExecutionOrderType(orderForm.type);
    const triggerMarketCapPrice =
      isTriggerMarketOrder && canonicalTriggerPrice
        ? getTriggerMarketSlippageCapPrice({
            triggerPrice: canonicalTriggerPrice,
            isBuy: orderForm.direction === 'long',
            maxSlippageBps: effectiveMaxSlippageBps,
            szDecimals: sizeDecimals,
          })
        : undefined;

    if (triggerMarketCapPrice !== undefined) {
      return getMaxAllowedAmountAtExecutionPrice({
        spendableBalance: feeAdjustedBalance,
        sizePrice: effectiveAssetPrice,
        executionPrice: triggerMarketCapPrice,
        assetSzDecimals: sizeDecimals,
        leverage: orderForm.leverage,
      });
    }

    return getMaxAllowedAmount({
      spendableBalance: feeAdjustedBalance,
      assetPrice: effectiveAssetPrice,
      assetSzDecimals,
      leverage: orderForm.leverage,
    });
  }, [
    balanceForMax,
    hasPaymentBalance,
    estimatedFeeRate,
    currentPrice?.price,
    orderForm.type,
    orderForm.direction,
    orderForm.limitPrice,
    triggerPrice,
    assetSzDecimals,
    orderForm.leverage,
    effectiveMaxSlippageBps,
  ]);

  const maxPossibleAmount =
    maxPossibleAmountOverride !== null
      ? maxPossibleAmountOverride
      : marginBasedMaxPossibleAmount;

  // Update amount only once when the hook first calculates the initial value.
  // Any amount the user sets also settles it, so a late venue figure never
  // overwrites their input.
  const hasSetInitialAmount = useRef(false);
  const isInitialAmountCapPending =
    !initialAmount &&
    !pendingConfig?.amount &&
    fallbackAmount !== '' &&
    (isAvailableToTradeLoading || !currentPrice?.price);
  useEffect(() => {
    // The default amount is capped by available to trade at the current
    // price. Wait for both; a confirmed zero balance still commits. The form
    // is already seeded, so waiting for an unknown balance changes only the
    // balance percent.
    if (
      hasSetInitialAmount.current ||
      isInitialAmountCapPending ||
      balanceForMax === undefined
    ) {
      return;
    }
    const parsedAmount = Number.parseFloat(initialAmountValue);
    const margin = Number.isFinite(parsedAmount)
      ? parsedAmount / defaultLeverage
      : 0;
    const percent =
      balanceForMax > 0 ? Math.min((margin / balanceForMax) * 100, 100) : 0;
    setOrderForm((prev) => ({
      ...prev,
      amount: initialAmountValue,
      balancePercent: Math.round(percent * 100) / 100,
    }));
    hasSetInitialAmount.current = true;
  }, [
    balanceForMax,
    defaultLeverage,
    initialAmountValue,
    isInitialAmountCapPending,
  ]);

  useEffect(() => {
    if (!pendingConfig) return;
    setOrderForm((prev) => ({
      ...prev,
      ...(pendingConfig.amount && { amount: pendingConfig.amount }),
      ...(pendingConfig.leverage && { leverage: pendingConfig.leverage }),
      ...(pendingConfig.takeProfitPrice !== undefined && {
        takeProfitPrice: pendingConfig.takeProfitPrice,
      }),
      ...(pendingConfig.stopLossPrice !== undefined && {
        stopLossPrice: pendingConfig.stopLossPrice,
      }),
      ...(pendingConfig.limitPrice !== undefined && {
        limitPrice: pendingConfig.limitPrice,
      }),
      ...(pendingConfig.direction &&
        initialDirection === undefined && {
          direction: pendingConfig.direction,
        }),
    }));
    // We don't need to depend on pendingConfig because we only want to restore it once when the component mounts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync leverage from existing position when it loads asynchronously
  // This handles the case where positions haven't loaded yet when form initializes
  const hasSyncedLeverage = useRef(false);
  useEffect(() => {
    // Only update if:
    // 1. Haven't synced yet (avoid fighting with user input)
    // 2. No explicit initialLeverage was provided (respect navigation params)
    // 3. existingPositionLeverage loaded (was undefined, now has value)
    // 4. Current leverage would cause protocol violation (< existing)
    if (
      !hasSyncedLeverage.current &&
      !initialLeverage &&
      existingPositionLeverage &&
      orderForm.leverage < existingPositionLeverage
    ) {
      setOrderForm((prev) => ({ ...prev, leverage: existingPositionLeverage }));
      hasSyncedLeverage.current = true;
    }
  }, [existingPositionLeverage, initialLeverage, orderForm.leverage]);

  // When user changes payment token (or effective balance drops), reset amount to MAX if current amount exceeds new max.
  // Skip while a max override is set (Reduce Only): size is capped by the open
  // position, not available margin, and the user may type above that cap.
  useEffect(() => {
    if (maxPossibleAmountOverride !== null) {
      return;
    }

    const currentAmount = Number.parseFloat(orderForm.amount);
    if (
      !Number.isFinite(currentAmount) ||
      currentAmount <= 0 ||
      maxPossibleAmount === 0 ||
      currentAmount < maxPossibleAmount
    )
      return;
    const newValue = String(Math.floor(maxPossibleAmount));

    setOrderForm((prev) => ({
      ...prev,
      amount: newValue,
    }));
  }, [
    balanceForMax,
    maxPossibleAmount,
    maxPossibleAmountOverride,
    orderForm.amount,
  ]);

  // Update entire form
  const updateOrderForm = useCallback(
    (updates: Partial<OrderFormState>) => {
      setOrderForm((prev) => ({ ...prev, ...updates }));
      if (updates.leverage !== undefined) {
        Engine.context.PerpsController.saveTradeConfiguration(
          initialAsset,
          updates.leverage,
        );
      }
      if (updates.type !== undefined) {
        Engine.context.PerpsController.setSelectedOrderType(updates.type);
      }
    },
    [initialAsset],
  );

  // Individual setters for common operations
  const setAmount = useCallback((amount: string) => {
    hasSetInitialAmount.current = true;
    setOrderForm((prev) => ({ ...prev, amount: amount || '0' }));
  }, []);

  const setLeverage = useCallback(
    (leverage: number) => {
      setOrderForm((prev) => ({ ...prev, leverage }));
      Engine.context.PerpsController.saveTradeConfiguration(
        initialAsset,
        leverage,
      );
    },
    [initialAsset],
  );

  const setDirection = useCallback((direction: 'long' | 'short') => {
    setOrderForm((prev) => ({ ...prev, direction }));
  }, []);

  // Asset-specific price drafts and their blur-validation state must not carry
  // across markets.
  const setAsset = useCallback(
    (asset: string) => {
      setOrderForm((prev) => ({
        ...prev,
        asset,
        limitPrice: undefined,
      }));
      setTriggerPrice(undefined);
      resetPriceInputInteraction();
      setActivePriceField(null);
    },
    [resetPriceInputInteraction],
  );

  const setTakeProfitPrice = useCallback((price?: string) => {
    // Convert empty string to undefined for proper clearing
    const cleanedPrice = price === '' || price === null ? undefined : price;
    setOrderForm((prev) => ({ ...prev, takeProfitPrice: cleanedPrice }));
  }, []);

  const setStopLossPrice = useCallback((price?: string) => {
    // Convert empty string to undefined for proper clearing
    const cleanedPrice = price === '' || price === null ? undefined : price;
    setOrderForm((prev) => {
      const newState = { ...prev, stopLossPrice: cleanedPrice };
      DevLogger.log('[Order Debug] setStopLossPrice state update:', {
        previousStopLoss: prev.stopLossPrice,
        newStopLoss: newState.stopLossPrice,
        actualNewValue: cleanedPrice,
        wasCleared: cleanedPrice === undefined,
      });
      return newState;
    });
  }, []);

  const setLimitPrice = useCallback((price?: string) => {
    setOrderForm((prev) => {
      const newState = { ...prev, limitPrice: price };
      return newState;
    });
    setHasBlurredLimitPrice(false);
  }, []);

  const setTriggerPriceValue = useCallback((price?: string) => {
    setTriggerPrice(price);
    setHasBlurredTriggerPrice(false);
  }, []);

  const commitLimitPrice = useCallback((price?: string) => {
    setOrderForm((prev) => ({ ...prev, limitPrice: price }));
    setHasBlurredLimitPrice(true);
  }, []);

  const commitTriggerPrice = useCallback((price?: string) => {
    setTriggerPrice(price);
    setHasBlurredTriggerPrice(true);
  }, []);

  // A field tied to the previous order type (e.g. a Scale rung) no longer
  // exists once the type changes, so the selection must not carry over.
  const setOrderType = useCallback((type: OrderType) => {
    setOrderForm((prev) => ({ ...prev, type }));
    Engine.context.PerpsController.setSelectedOrderType(type);
    setActivePriceField(null);
  }, []);

  const commitPriceToField = useCallback(
    (field: PerpsOrderPriceField, price?: string): boolean => {
      if (field === 'limit') {
        commitLimitPrice(price);
        return true;
      }
      if (field === 'trigger') {
        commitTriggerPrice(price);
        return true;
      }
      const handler = priceFieldHandlersRef.current[field];
      if (!handler) {
        return false;
      }
      handler(price);
      return true;
    },
    [commitLimitPrice, commitTriggerPrice],
  );

  // Handle percentage-based amount selection (respects custom token amount when set).
  // Clamp to maxPossibleAmount so near-100% values never exceed the buffered max.
  const handlePercentageAmount = useCallback(
    (percentage: number) => {
      if (!balanceForMax) return;
      const raw = balanceForMax * orderForm.leverage * percentage;
      const clamped = Math.min(raw, maxPossibleAmount);
      const newAmount = Math.floor(clamped).toString();
      hasSetInitialAmount.current = true;
      setOrderForm((prev) => ({ ...prev, amount: newAmount }));
    },
    [balanceForMax, orderForm.leverage, maxPossibleAmount],
  );

  // Handle max amount selection (respects custom token amount when set).
  // Uses maxPossibleAmount (includes margin buffer) to avoid "Insufficient margin" rejections.
  const handleMaxAmount = useCallback(() => {
    if (!balanceForMax) return;
    hasSetInitialAmount.current = true;
    setOrderForm((prev) => ({
      ...prev,
      amount: Math.floor(maxPossibleAmount).toString(),
    }));
  }, [balanceForMax, maxPossibleAmount]);

  // Handle min amount selection
  const handleMinAmount = useCallback(() => {
    const minAmount =
      currentNetwork === 'mainnet'
        ? TRADING_DEFAULTS.amount.mainnet
        : TRADING_DEFAULTS.amount.testnet;
    hasSetInitialAmount.current = true;
    setOrderForm((prev) => ({
      ...prev,
      amount: minAmount.toString(),
    }));
  }, [currentNetwork]);

  return useMemo(
    () => ({
      orderForm,
      updateOrderForm,
      setAmount,
      setLeverage,
      setDirection,
      setAsset,
      setTakeProfitPrice,
      setStopLossPrice,
      setLimitPrice,
      commitLimitPrice,
      commitTriggerPrice,
      hasBlurredLimitPrice,
      hasBlurredTriggerPrice,
      triggerPrice,
      setTriggerPrice: setTriggerPriceValue,
      resetPriceInputInteraction,
      activePriceField,
      setActivePriceField,
      registerPriceFieldHandlers,
      commitPriceToField,
      setOrderType,
      pendingReduceOnly: pendingConfig?.reduceOnly,
      handlePercentageAmount,
      handleMaxAmount,
      handleMinAmount,
      maxPossibleAmount,
      setMaxPossibleAmountOverride,
      setEstimatedFeeRate,
      // 0 only while `isAvailableToTradeLoading`; callers gate on that flag.
      balanceForValidation: balanceForMax ?? 0,
      perpsAvailableToTrade,
      isAvailableToTradeLoading,
    }),
    [
      orderForm,
      updateOrderForm,
      setAmount,
      setLeverage,
      setDirection,
      setAsset,
      setTakeProfitPrice,
      setStopLossPrice,
      setLimitPrice,
      commitLimitPrice,
      commitTriggerPrice,
      hasBlurredLimitPrice,
      hasBlurredTriggerPrice,
      triggerPrice,
      setTriggerPriceValue,
      resetPriceInputInteraction,
      activePriceField,
      setActivePriceField,
      registerPriceFieldHandlers,
      commitPriceToField,
      setOrderType,
      pendingConfig?.reduceOnly,
      handlePercentageAmount,
      handleMaxAmount,
      handleMinAmount,
      maxPossibleAmount,
      setMaxPossibleAmountOverride,
      setEstimatedFeeRate,
      balanceForMax,
      perpsAvailableToTrade,
      isAvailableToTradeLoading,
    ],
  );
}
