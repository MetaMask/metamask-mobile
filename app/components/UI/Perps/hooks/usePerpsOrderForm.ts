import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import {
  TRADING_DEFAULTS,
  DECIMAL_PRECISION_CONFIG,
  OrderType,
  getMaxAllowedAmount,
  isLimitExecutionOrderType,
  isTriggerOrderType,
  selectTradeConfiguration,
  selectPendingTradeConfiguration,
  selectSelectedOrderType,
  type OrderFormState,
} from '@metamask/perps-controller';
import Engine from '../../../../core/Engine';
import {
  usePerpsLiveAccount,
  usePerpsLivePositions,
  usePerpsLivePrices,
} from './stream';
import { usePerpsMarketData } from './usePerpsMarketData';
import { usePerpsNetwork } from './usePerpsNetwork';
import { usePerpsMaxSlippage } from './usePerpsMaxSlippage';
import { usePerpsSelector } from './usePerpsSelector';
import {
  getMaxAllowedAmountAtExecutionPrice,
  getProspectiveExecutionPrice,
  getTriggerMarketSlippageCapPrice,
} from '../utils/orderSizing';
import { canonicalizeOrderPrice } from '../utils/triggerOrderValidation';
import { resolvePerpsMaxSlippageBps } from '../constants/slippageConfig';

interface UsePerpsOrderFormParams {
  initialAsset?: string;
  initialDirection?: 'long' | 'short';
  initialAmount?: string;
  /** Surface-specific fallback used when no explicit or pending amount exists. */
  fallbackAmount?: string;
  initialLeverage?: number;
  initialType?: OrderType;
  /** When paying with a custom token, the selected token amount in USD; used to cap maxPossibleAmount and handlers */
  effectiveAvailableBalance?: number;
}

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
  /** Balance to use for validation and UI (Perps balance or selected token amount in USD when paying with custom token) */
  balanceForValidation: number;
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
    initialDirection = 'long',
    initialAmount,
    fallbackAmount: fallbackAmountParam,
    initialLeverage,
    initialType,
    effectiveAvailableBalance: effectiveAvailableBalanceParam,
  } = params;

  const currentNetwork = usePerpsNetwork();
  const { maxSlippageBps, maxSlippageSource } = usePerpsMaxSlippage();
  const { account } = usePerpsLiveAccount();
  const { positions } = usePerpsLivePositions();
  const prices = usePerpsLivePrices({
    symbols: [initialAsset],
    throttleMs: 1000,
  });
  const currentPrice = prices[initialAsset];
  const { marketData } = usePerpsMarketData(initialAsset);

  // Get existing position leverage for this asset (protocol constraint)
  // Positions load asynchronously via WebSocket, so this may be undefined initially
  const existingPositionLeverage = useMemo(
    () => positions.find((p) => p.symbol === initialAsset)?.leverage?.value,
    [positions, initialAsset],
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

  const spendableBalance = Number.parseFloat(
    effectiveAvailableBalanceParam != null
      ? effectiveAvailableBalanceParam.toString()
      : (account?.spendableBalance?.toString() ?? '0'),
  );

  // When paying with a custom token, use selected token amount in USD (including 0); otherwise use Perps balance
  const balanceForMax = effectiveAvailableBalanceParam ?? spendableBalance;

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

  // Priority for amount: navigation param > pending config > calculated default
  // Use memoized calculation for initial amount to ensure it updates when dependencies change
  const initialAmountValue = useMemo(() => {
    // If we have a pending config with amount, use it (unless overridden by navigation param)
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

    const tempMaxAmount = getMaxAllowedAmount({
      spendableBalance: balanceForMax,
      assetPrice: Number.parseFloat(currentPrice.price),
      assetSzDecimals:
        marketData?.szDecimals ?? DECIMAL_PRECISION_CONFIG.FallbackSizeDecimals,
      leverage: defaultLeverage, // Use default leverage for initial calculation
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
    marketData?.szDecimals,
    defaultLeverage,
  ]);

  // Navigation param > persisted global type > pending draft.
  // Pending is per-market, so it must not override a type chosen on another market.
  const defaultOrderType =
    initialType || persistedOrderType || pendingConfig?.orderType || 'market';

  // Calculate initial balance percentage
  const parsedInitialAmount = Number.parseFloat(initialAmountValue);
  const initialMarginRequired = Number.isFinite(parsedInitialAmount)
    ? parsedInitialAmount / defaultLeverage
    : 0;
  const initialBalancePercent =
    spendableBalance > 0
      ? Math.min((initialMarginRequired / spendableBalance) * 100, 100)
      : TRADING_DEFAULTS.marginPercent;

  // Initialize form state with pending config if available
  const [orderForm, setOrderForm] = useState<OrderFormState>({
    asset: initialAsset,
    direction: initialDirection,
    amount: initialAmountValue, // Will be updated by useEffect when initialAmountValue is calculated
    leverage: defaultLeverage,
    balancePercent: Math.round(initialBalancePercent * 100) / 100,
    takeProfitPrice: pendingConfig?.takeProfitPrice,
    stopLossPrice: pendingConfig?.stopLossPrice,
    limitPrice: pendingConfig?.limitPrice,
    type: defaultOrderType,
  });

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
    const marketPrice = Number.parseFloat(currentPrice?.price) || 0;
    const sizeDecimals =
      marketData?.szDecimals ?? DECIMAL_PRECISION_CONFIG.FallbackSizeDecimals;
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
        spendableBalance: balanceForMax,
        sizePrice: effectiveAssetPrice,
        executionPrice: triggerMarketCapPrice,
        assetSzDecimals: sizeDecimals,
        leverage: orderForm.leverage,
      });
    }

    return getMaxAllowedAmount({
      spendableBalance: balanceForMax,
      assetPrice: effectiveAssetPrice,
      assetSzDecimals:
        marketData?.szDecimals ?? DECIMAL_PRECISION_CONFIG.FallbackSizeDecimals,
      leverage: orderForm.leverage,
    });
  }, [
    balanceForMax,
    currentPrice?.price,
    orderForm.type,
    orderForm.direction,
    orderForm.limitPrice,
    triggerPrice,
    marketData?.szDecimals,
    orderForm.leverage,
    effectiveMaxSlippageBps,
  ]);

  const maxPossibleAmount =
    maxPossibleAmountOverride !== null
      ? maxPossibleAmountOverride
      : marginBasedMaxPossibleAmount;

  // Update amount only once when the hook first calculates the initial value
  // We use a ref to track if we've already set the initial amount to avoid overwriting user input
  const hasSetInitialAmount = useRef(false);
  useEffect(() => {
    if (!hasSetInitialAmount.current && initialAmountValue !== '0') {
      setOrderForm((prev) => ({ ...prev, amount: initialAmountValue }));
      hasSetInitialAmount.current = true;
    }
  }, [initialAmountValue]);

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

  const setOrderType = useCallback((type: OrderType) => {
    setOrderForm((prev) => ({ ...prev, type }));
    Engine.context.PerpsController.setSelectedOrderType(type);
  }, []);

  // Handle percentage-based amount selection (respects custom token amount when set).
  // Clamp to maxPossibleAmount so near-100% values never exceed the buffered max.
  const handlePercentageAmount = useCallback(
    (percentage: number) => {
      if (balanceForMax === 0) return;
      const raw = balanceForMax * orderForm.leverage * percentage;
      const clamped = Math.min(raw, maxPossibleAmount);
      const newAmount = Math.floor(clamped).toString();
      setOrderForm((prev) => ({ ...prev, amount: newAmount }));
    },
    [balanceForMax, orderForm.leverage, maxPossibleAmount],
  );

  // Handle max amount selection (respects custom token amount when set).
  // Uses maxPossibleAmount (includes margin buffer) to avoid "Insufficient margin" rejections.
  const handleMaxAmount = useCallback(() => {
    if (balanceForMax === 0) return;
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
      setOrderType,
      pendingReduceOnly: pendingConfig?.reduceOnly,
      handlePercentageAmount,
      handleMaxAmount,
      handleMinAmount,
      maxPossibleAmount,
      setMaxPossibleAmountOverride,
      balanceForValidation: balanceForMax,
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
      setOrderType,
      pendingConfig?.reduceOnly,
      handlePercentageAmount,
      handleMaxAmount,
      handleMinAmount,
      maxPossibleAmount,
      setMaxPossibleAmountOverride,
      balanceForMax,
    ],
  );
}
