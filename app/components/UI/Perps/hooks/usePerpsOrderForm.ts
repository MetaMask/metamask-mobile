import { debounce } from 'lodash';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import { TRADING_DEFAULTS } from '../constants/hyperLiquidConfig';
import { OrderType } from '../controllers/types';
import type { OrderFormState } from '../types/perps-types';
import {
  findOptimalAmount,
  getMaxAllowedAmount as getMaxAllowedAmountUtils,
} from '../utils/orderCalculations';
import { usePerpsLiveAccount, usePerpsLivePrices } from './stream';
import { usePerpsMarketData } from './usePerpsMarketData';
import { usePerpsNetwork } from './usePerpsNetwork';

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
  optimizeOrderAmount: (price: number, szDecimals?: number) => void;
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
  const prices = usePerpsLivePrices({
    symbols: [initialAsset],
    throttleMs: 1000,
  });
  const currentPrice = prices[initialAsset];
  const { marketData } = usePerpsMarketData(initialAsset);

  // Get available balance from live account data
  const availableBalance = parseFloat(
    account?.availableBalance?.toString() || '0',
  );

  // Determine default amount based on network
  const defaultAmount =
    currentNetwork === 'mainnet'
      ? TRADING_DEFAULTS.amount.mainnet
      : TRADING_DEFAULTS.amount.testnet;

  // Calculate the maximum possible amount based on available balance and leverage
  const defaultLeverage = initialLeverage || TRADING_DEFAULTS.leverage;

  // Use memoized calculation for initial amount to ensure it updates when dependencies change
  const initialAmountValue = useMemo(() => {
    // Don't calculate if price is not available yet to avoid temporary 0 values
    if (!currentPrice?.price) {
      return defaultAmount.toString();
    }

    const tempMaxAmount = getMaxAllowedAmountUtils({
      availableBalance,
      assetPrice: parseFloat(currentPrice.price),
      assetSzDecimals:
        marketData?.szDecimals !== undefined ? marketData?.szDecimals : 6,
      leverage: defaultLeverage, // Use default leverage for initial calculation
    });

    return findOptimalAmount({
      targetAmount:
        initialAmount ||
        (tempMaxAmount < defaultAmount
          ? tempMaxAmount.toString()
          : defaultAmount.toString()),
      price: parseFloat(currentPrice.price),
      szDecimals:
        marketData?.szDecimals !== undefined ? marketData?.szDecimals : 6,
      maxAllowedAmount: tempMaxAmount,
      minAllowedAmount: defaultAmount,
    });
  }, [
    initialAmount,
    availableBalance,
    defaultAmount,
    currentPrice?.price,
    marketData?.szDecimals,
    defaultLeverage,
  ]);

  // Calculate initial balance percentage
  const initialMarginRequired =
    parseFloat(initialAmountValue) / defaultLeverage;
  const initialBalancePercent =
    availableBalance > 0
      ? Math.min((initialMarginRequired / availableBalance) * 100, 100)
      : TRADING_DEFAULTS.marginPercent;

  // Initialize form state
  const [orderForm, setOrderForm] = useState<OrderFormState>({
    asset: initialAsset,
    direction: initialDirection,
    amount: initialAmountValue, // Will be updated by useEffect when initialAmountValue is calculated
    leverage: defaultLeverage,
    balancePercent: Math.round(initialBalancePercent * 100) / 100,
    takeProfitPrice: undefined,
    stopLossPrice: undefined,
    limitPrice: undefined,
    type: initialType,
  });

  // Calculate the maximum possible amount based on available balance and current leverage
  const maxPossibleAmount = useMemo(
    () =>
      getMaxAllowedAmountUtils({
        availableBalance,
        assetPrice: parseFloat(currentPrice?.price) || 0,
        assetSzDecimals:
          marketData?.szDecimals !== undefined ? marketData?.szDecimals : 6,
        leverage: orderForm.leverage, // Use current leverage instead of default
      }),
    [
      availableBalance,
      currentPrice?.price,
      marketData?.szDecimals,
      orderForm.leverage, // Include current leverage in dependencies
    ],
  );

  // Optimize order amount to get the optimal USD value for the position size
  const optimizeOrderAmount = useMemo(() => {
    const optimizeFunction = (price: number, szDecimals?: number) => {
      setOrderForm((prev) => {
        if (!prev.amount || parseFloat(prev.amount) === 0) {
          return prev;
        }

        const optimizedAmount = findOptimalAmount({
          targetAmount: prev.amount,
          price,
          szDecimals,
          maxAllowedAmount: maxPossibleAmount,
          minAllowedAmount: defaultAmount,
        });

        const optimizedAmountNum = parseFloat(optimizedAmount);

        // Only update if the optimized amount is different
        if (
          optimizedAmount !== prev.amount &&
          optimizedAmountNum <= maxPossibleAmount
        ) {
          return {
            ...prev,
            amount: optimizedAmount,
          };
        }

        return prev;
      });
    };

    return debounce(optimizeFunction, 100);
  }, [maxPossibleAmount, defaultAmount]);

  // Cleanup debounced function on unmount
  useEffect(
    () => () => {
      optimizeOrderAmount.cancel();
    },
    [optimizeOrderAmount],
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
    optimizeOrderAmount,
    maxPossibleAmount,
  };
}
