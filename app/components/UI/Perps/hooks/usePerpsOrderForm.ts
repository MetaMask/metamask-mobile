import { useCallback, useMemo, useState } from 'react';
import { TRADING_DEFAULTS } from '../constants/hyperLiquidConfig';
import type { OrderFormState } from '../types';
import { calculateMarginRequired } from '../utils/orderCalculations';
import { usePerpsNetwork } from './usePerpsNetwork';
import { OrderType } from '../controllers/types';
import { usePerpsLiveAccount } from './stream';

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
  calculations: {
    positionSize: string;
    marginRequired: string;
  };
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

  // Get available balance from live account data
  const availableBalance = parseFloat(
    account?.availableBalance?.toString() || '0',
  );

  // Determine default amount based on network
  const defaultAmount =
    currentNetwork === 'mainnet'
      ? TRADING_DEFAULTS.amount.mainnet
      : TRADING_DEFAULTS.amount.testnet;

  // Calculate initial balance percentage
  const initialMarginRequired = defaultAmount / TRADING_DEFAULTS.leverage;
  const initialBalancePercent =
    availableBalance > 0
      ? Math.min((initialMarginRequired / availableBalance) * 100, 100)
      : TRADING_DEFAULTS.marginPercent;

  // Initialize form state
  const [orderForm, setOrderForm] = useState<OrderFormState>({
    asset: initialAsset,
    direction: initialDirection,
    amount: initialAmount || defaultAmount.toString(),
    leverage: initialLeverage || TRADING_DEFAULTS.leverage,
    balancePercent: Math.round(initialBalancePercent * 100) / 100,
    takeProfitPrice: undefined,
    stopLossPrice: undefined,
    limitPrice: undefined,
    type: initialType,
  });

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
    setOrderForm((prev) => ({ ...prev, takeProfitPrice: price }));
  };

  const setStopLossPrice = (price?: string) => {
    setOrderForm((prev) => ({ ...prev, stopLossPrice: price }));
  };

  const setLimitPrice = (price?: string) => {
    setOrderForm((prev) => ({ ...prev, limitPrice: price }));
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

  // Calculations that will be needed by the order view
  // Note: These require additional data (price, szDecimals) that should be passed
  // from the component that has access to market data
  const calculations = useMemo(
    () => ({
      positionSize: '0', // This will be calculated in the component with price data
      marginRequired: calculateMarginRequired({
        amount: orderForm.amount,
        leverage: orderForm.leverage,
      }),
    }),
    [orderForm.amount, orderForm.leverage],
  );

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
    calculations,
  };
}
