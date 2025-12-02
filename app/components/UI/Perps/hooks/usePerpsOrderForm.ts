import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import { TRADING_DEFAULTS } from '../constants/hyperLiquidConfig';
import { OrderType } from '../controllers/types';
import type { OrderFormState } from '../types/perps-types';
import { getMaxAllowedAmount } from '../utils/orderCalculations';
import {
  usePerpsLiveAccount,
  usePerpsLivePositions,
  usePerpsLivePrices,
} from './stream';
import { usePerpsMarketData } from './usePerpsMarketData';
import { usePerpsNetwork } from './usePerpsNetwork';
import {
  selectTradeConfiguration,
  selectPendingTradeConfiguration,
} from '../controllers/selectors';
import { usePerpsSelector } from './usePerpsSelector';

interface UsePerpsOrderFormParams {
  initialAsset?: string;
  initialDirection?: 'long' | 'short';
  initialAmount?: string;
  initialLeverage?: number;
  initialType?: OrderType;
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
  setOrderType: (type: OrderType) => void;
  handlePercentageAmount: (percentage: number) => void;
  handleMaxAmount: () => void;
  handleMinAmount: () => void;
  maxPossibleAmount: number;
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
    initialLeverage,
    initialType = 'market',
  } = params;

  const currentNetwork = usePerpsNetwork();
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
    () => positions.find((p) => p.coin === initialAsset)?.leverage?.value,
    [positions, initialAsset],
  );

  // Get saved trade configuration for this asset (user preference for new positions)
  const savedConfig = usePerpsSelector((state) =>
    selectTradeConfiguration(state, initialAsset),
  );

  // Get pending trade configuration for this asset (temporary, expires after 5 minutes)
  const pendingConfig = usePerpsSelector((state) =>
    selectPendingTradeConfiguration(state, initialAsset),
  );

  // Get available balance from live account data
  const availableBalance = Number.parseFloat(
    account?.availableBalance?.toString() || '0',
  );

  // Determine default amount based on network
  const defaultAmount =
    currentNetwork === 'mainnet'
      ? TRADING_DEFAULTS.amount.mainnet
      : TRADING_DEFAULTS.amount.testnet;

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
      return defaultAmount.toString();
    }

    const tempMaxAmount = getMaxAllowedAmount({
      availableBalance,
      assetPrice: Number.parseFloat(currentPrice.price),
      assetSzDecimals: marketData?.szDecimals ?? 6,
      leverage: defaultLeverage, // Use default leverage for initial calculation
    });

    // Return the target amount directly (USD as source of truth, no optimization)
    const targetAmount =
      tempMaxAmount < defaultAmount
        ? tempMaxAmount.toString()
        : defaultAmount.toString();

    return targetAmount;
  }, [
    initialAmount,
    pendingConfig?.amount,
    availableBalance,
    defaultAmount,
    currentPrice?.price,
    marketData?.szDecimals,
    defaultLeverage,
  ]);

  // Priority for order type: pending config > navigation param > default (market)
  const defaultOrderType = pendingConfig?.orderType || initialType || 'market';

  // Calculate initial balance percentage
  const initialMarginRequired =
    Number.parseFloat(initialAmountValue) / defaultLeverage;
  const initialBalancePercent =
    availableBalance > 0
      ? Math.min((initialMarginRequired / availableBalance) * 100, 100)
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

  // Calculate the maximum possible amount based on available balance and current leverage
  const maxPossibleAmount = useMemo(
    () =>
      getMaxAllowedAmount({
        availableBalance,
        assetPrice: Number.parseFloat(currentPrice?.price) || 0,
        assetSzDecimals: marketData?.szDecimals ?? 6,
        leverage: orderForm.leverage, // Use current leverage instead of default
      }),
    [
      availableBalance,
      currentPrice?.price,
      marketData?.szDecimals,
      orderForm.leverage, // Include current leverage in dependencies
    ],
  );

  // Update amount only once when the hook first calculates the initial value
  // We use a ref to track if we've already set the initial amount to avoid overwriting user input
  const hasSetInitialAmount = useRef(false);
  useEffect(() => {
    if (!hasSetInitialAmount.current && initialAmountValue !== '0') {
      setOrderForm((prev) => ({ ...prev, amount: initialAmountValue }));
      hasSetInitialAmount.current = true;
    }
  }, [initialAmountValue]);

  // Restore pending config values on mount (only once)
  const hasRestoredPendingConfig = useRef(false);
  useEffect(() => {
    if (!hasRestoredPendingConfig.current && pendingConfig) {
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
        ...(pendingConfig.orderType && { type: pendingConfig.orderType }),
      }));
      hasRestoredPendingConfig.current = true;
    }
  }, [pendingConfig]);

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

  // Update entire form
  const updateOrderForm = (updates: Partial<OrderFormState>) => {
    setOrderForm((prev) => ({ ...prev, ...updates }));
  };

  // Individual setters for common operations
  const setAmount = (amount: string) => {
    setOrderForm((prev) => ({ ...prev, amount: amount || '0' }));
  };

  const setLeverage = (leverage: number) => {
    setOrderForm((prev) => ({ ...prev, leverage }));
  };

  const setDirection = (direction: 'long' | 'short') => {
    setOrderForm((prev) => ({ ...prev, direction }));
  };

  const setAsset = (asset: string) => {
    setOrderForm((prev) => ({ ...prev, asset }));
  };

  const setTakeProfitPrice = (price?: string) => {
    // Convert empty string to undefined for proper clearing
    const cleanedPrice = price === '' || price === null ? undefined : price;
    setOrderForm((prev) => ({ ...prev, takeProfitPrice: cleanedPrice }));
  };

  const setStopLossPrice = (price?: string) => {
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
  };

  const setLimitPrice = (price?: string) => {
    setOrderForm((prev) => {
      const newState = { ...prev, limitPrice: price };
      return newState;
    });
  };

  const setOrderType = (type: OrderType) => {
    setOrderForm((prev) => ({ ...prev, type }));
  };

  // Handle percentage-based amount selection
  const handlePercentageAmount = useCallback(
    (percentage: number) => {
      if (availableBalance === 0) return;
      const newAmount = Math.floor(
        availableBalance * orderForm.leverage * percentage,
      ).toString();
      setOrderForm((prev) => ({ ...prev, amount: newAmount }));
    },
    [availableBalance, orderForm.leverage],
  );

  // Handle max amount selection
  const handleMaxAmount = useCallback(() => {
    if (availableBalance === 0) return;
    setOrderForm((prev) => ({
      ...prev,
      amount: Math.floor(availableBalance * prev.leverage).toString(),
    }));
  }, [availableBalance]);

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

  return {
    orderForm,
    updateOrderForm,
    setAmount,
    setLeverage,
    setDirection,
    setAsset,
    setTakeProfitPrice,
    setStopLossPrice,
    setLimitPrice,
    setOrderType,
    handlePercentageAmount,
    handleMaxAmount,
    handleMinAmount,
    maxPossibleAmount,
  };
}
