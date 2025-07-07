import { CaipAssetId } from '@metamask/utils';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import type { RootState } from '../../../../reducers';
import type {
  AccountState,
  CancelOrderParams,
  CancelOrderResult,
  ClosePositionParams,
  DepositFlowType,
  DepositParams,
  DepositResult,
  DepositStatus,
  DepositStepInfo,
  GetAccountStateParams,
  GetPositionsParams,
  LiveDataConfig,
  MarketInfo,
  OrderFill,
  OrderParams,
  OrderResult,
  Position,
  PriceUpdate,
  SubscribeOrderFillsParams,
  SubscribePositionsParams,
  SubscribePricesParams,
  WithdrawParams,
  WithdrawResult,
} from '../controllers/types';

/**
 * Main hook for PerpsController access
 * Provides all trading actions and configuration methods
 */
export function usePerpsController() {
  const controller = Engine.context.PerpsController;

  const placeOrder = useCallback(
    (params: OrderParams): Promise<OrderResult> =>
      controller.placeOrder(params),
    [controller]
  );

  const cancelOrder = useCallback(
    (params: CancelOrderParams): Promise<CancelOrderResult> =>
      controller.cancelOrder(params),
    [controller]
  );

  const closePosition = useCallback(
    (params: ClosePositionParams): Promise<OrderResult> =>
      controller.closePosition(params),
    [controller]
  );

  const deposit = useCallback(
    (params: DepositParams): Promise<DepositResult> =>
      controller.deposit(params),
    [controller]
  );


  const withdraw = useCallback(
    (params: WithdrawParams): Promise<WithdrawResult> =>
      controller.withdraw(params),
    [controller]
  );

  const getPositions = useCallback(
    (params?: GetPositionsParams): Promise<Position[]> =>
      controller.getPositions(params),
    [controller]
  );

  const getAccountState = useCallback(
    (params?: GetAccountStateParams): Promise<AccountState> =>
      controller.getAccountState(params),
    [controller]
  );

  const getMarkets = useCallback(
    (params?: { symbols?: string[] }): Promise<MarketInfo[]> =>
      controller.getMarkets(params),
    [controller]
  );

  const getSupportedDepositPaths = useCallback(
    (): CaipAssetId[] => controller.getSupportedDepositPaths(),
    [controller]
  );

  const resetDepositState = useCallback(
    () => controller.resetDepositState(),
    [controller]
  );

  const toggleTestnet = useCallback(
    () => controller.toggleTestnet(),
    [controller]
  );

  const getCurrentNetwork = useCallback(
    () => controller.getCurrentNetwork(),
    [controller]
  );

  const disconnect = useCallback(
    () => controller.disconnect(),
    [controller]
  );

  const setLiveDataConfig = useCallback(
    (config: Partial<LiveDataConfig>) =>
      controller.setLiveDataConfig(config),
    [controller]
  );

  const subscribeToPrices = useCallback(
    (params: SubscribePricesParams): () => void =>
      controller.subscribeToPrices(params),
    [controller]
  );

  const subscribeToPositions = useCallback(
    (params: SubscribePositionsParams): () => void =>
      controller.subscribeToPositions(params),
    [controller]
  );

  const subscribeToOrderFills = useCallback(
    (params: SubscribeOrderFillsParams): () => void =>
      controller.subscribeToOrderFills(params),
    [controller]
  );

  return {
    controller,
    // Trading actions
    placeOrder,
    cancelOrder,
    closePosition,
    deposit,
    withdraw,
    getPositions,
    getAccountState,
    getMarkets,
    getSupportedDepositPaths,
    resetDepositState,
    toggleTestnet,
    getCurrentNetwork,
    disconnect,
    // Live data configuration
    setLiveDataConfig,
    // Live data subscriptions (Direct UI, NO Redux) - Now properly memoized
    subscribeToPrices,
    subscribeToPositions,
    subscribeToOrderFills,
  };
}

/**
 * Hook to get persisted positions from Redux
 * These are bootstrap/cached positions, not live updates
 */
export function usePerpsPositions(): Position[] {
  return useSelector((state: RootState) =>
    state.engine.backgroundState.PerpsController?.positions || []
  );
}

/**
 * Hook to get persisted account state from Redux
 * This is bootstrap/cached data, not live updates
 */
export function usePerpsAccountState(): AccountState | null {
  return useSelector((state: RootState) =>
    state.engine.backgroundState.PerpsController?.accountState || null
  );
}

/**
 * Hook to get current network (testnet/mainnet)
 */
export function usePerpsNetwork(): 'mainnet' | 'testnet' {
  return useSelector((state: RootState) =>
    state.engine.backgroundState.PerpsController?.isTestnet ? 'testnet' : 'mainnet'
  );
}

/**
 * Hook for live price updates (bypasses Redux for performance)
 * Updates directly from WebSocket without going through Redux
 */
export function usePerpsPrices(symbols: string[]): Record<string, PriceUpdate> {
  const { subscribeToPrices } = usePerpsController();
  const [prices, setPrices] = useState<Record<string, PriceUpdate>>({});

  useEffect(() => {
    if (symbols.length === 0) return;

    DevLogger.log('usePerpsPrices: Subscribing to prices', {
      symbols,
      timestamp: new Date().toISOString()
    });

    const unsubscribe = subscribeToPrices({
      symbols,
      callback: (newPrices: PriceUpdate[]) => {
        // Direct UI update, bypasses Redux for maximum performance
        setPrices(prev => {
          const updated = { ...prev };
          newPrices.forEach(price => {
            updated[price.coin] = price;
          });
          return updated;
        });
      },
    });

    return () => {
      DevLogger.log('usePerpsPrices: Unsubscribing from prices', {
        symbols,
        timestamp: new Date().toISOString()
      });
      unsubscribe();
    };
  }, [symbols, subscribeToPrices]);

  return prices;
}

/**
 * Hook for live position updates (bypasses Redux for performance)
 * Use this for real-time P&L calculations
 */
export function usePerpsLivePositions(): Position[] {
  const { subscribeToPositions } = usePerpsController();
  const [livePositions, setLivePositions] = useState<Position[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeToPositions({
      callback: (positions: Position[]) => {
        // Direct UI update, bypasses Redux for maximum performance
        setLivePositions(positions);
      },
    });

    return unsubscribe;
  }, [subscribeToPositions]);

  return livePositions;
}

/**
 * Hook for live order fill notifications
 * Provides immediate feedback when orders are executed
 */
export function usePerpsOrderFills(): OrderFill[] {
  const { subscribeToOrderFills } = usePerpsController();
  const [orderFills, setOrderFills] = useState<OrderFill[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeToOrderFills({
      callback: (fills: OrderFill[]) => {
        // Append new fills to existing list
        setOrderFills(prev => [...prev, ...fills]);
      },
    });

    return unsubscribe;
  }, [subscribeToOrderFills]);

  return orderFills;
}

/**
 * Hook for real-time P&L calculation for a specific position
 * Combines position data with live price updates
 */
export function usePositionPnL(position: Position): {
  currentPnL: number;
  currentPrice: number | null;
  pnlPercentage: number;
} {
  const prices = usePerpsPrices([position.coin]);
  const currentPrice = prices[position.coin]?.price ? parseFloat(prices[position.coin].price) : null;

  const currentPnL = currentPrice ?
    (currentPrice - parseFloat(position.entryPrice)) * parseFloat(position.size) :
    parseFloat(position.unrealizedPnl);

  const pnlPercentage = currentPrice ?
    ((currentPrice - parseFloat(position.entryPrice)) / parseFloat(position.entryPrice)) * 100 * Math.sign(parseFloat(position.size)) :
    0;

  return {
    currentPnL,
    currentPrice,
    pnlPercentage,
  };
}

/**
 * Hook for checking if ready to trade
 */
export function usePerpsReadiness() {
  const { controller } = usePerpsController();
  const [readiness, setReadiness] = useState({
    ready: false,
    loading: true,
    error: null as string | null,
  });

  useEffect(() => {
    const checkReadiness = async () => {
      try {
        const result = await controller.getActiveProvider().isReadyToTrade();
        setReadiness({
          ready: result.ready,
          loading: false,
          error: result.error || null,
        });
      } catch (error) {
        setReadiness({
          ready: false,
          loading: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    };

    checkReadiness();
  }, [controller]);

  return readiness;
}

/**
 * Hook for managing multiple orders with loading states
 */
export function useOrderManagement() {
  const { placeOrder, cancelOrder } = usePerpsController();
  const [pendingOrders, setPendingOrders] = useState<Set<string>>(new Set());
  const [orderErrors, setOrderErrors] = useState<Record<string, string>>({});

  const placeOrderWithState = useCallback(async (params: OrderParams, orderId?: string) => {
    const id = orderId || `${params.coin}_${Date.now()}`;

    setPendingOrders(prev => new Set(prev).add(id));
    setOrderErrors(prev => ({ ...prev, [id]: '' }));

    try {
      const result = await placeOrder(params);
      setPendingOrders(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });

      if (!result.success) {
        setOrderErrors(prev => ({ ...prev, [id]: result.error || 'Order failed' }));
      }

      return result;
    } catch (error) {
      setPendingOrders(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setOrderErrors(prev => ({
        ...prev,
        [id]: error instanceof Error ? error.message : 'Unknown error'
      }));
      throw error;
    }
  }, [placeOrder]);

  const cancelOrderWithState = useCallback(async (params: CancelOrderParams) => {
    const id = `cancel_${params.orderId}`;

    setPendingOrders(prev => new Set(prev).add(id));

    try {
      const result = await cancelOrder(params);
      setPendingOrders(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });

      return result;
    } catch (error) {
      setPendingOrders(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      throw error;
    }
  }, [cancelOrder]);

  const clearOrderError = useCallback((orderId: string) => {
    setOrderErrors(prev => ({ ...prev, [orderId]: '' }));
  }, []);

  return {
    placeOrder: placeOrderWithState,
    cancelOrder: cancelOrderWithState,
    pendingOrders,
    orderErrors,
    clearOrderError,
  };
}

/**
 * Consolidated hook for deposit state
 * Returns all deposit-related state in a single object to minimize re-renders
 * Reusable pattern for withdrawal and other operation flows
 */
export function usePerpsDepositState() {
  const perpsState = useSelector((state: RootState) =>
    state.engine.backgroundState.PerpsController
  );

  return useMemo(() => {
    if (!perpsState) {
      return {
        status: 'idle' as DepositStatus,
        flowType: null as DepositFlowType | null,
        currentTxHash: null as string | null,
        error: null as string | null,
        requiresModalDismissal: false,
        steps: {
          totalSteps: 0,
          currentStep: 0,
          stepNames: [],
          stepTxHashes: [],
        } as DepositStepInfo,
      };
    }

    return {
      status: perpsState.depositStatus || 'idle',
      flowType: perpsState.depositFlowType || null,
      currentTxHash: perpsState.currentDepositTxHash || null,
      error: perpsState.depositError || null,
      requiresModalDismissal: perpsState.requiresModalDismissal || false,
      steps: perpsState.depositSteps || {
        totalSteps: 0,
        currentStep: 0,
        stepNames: [],
        stepTxHashes: [],
      },
    };
  }, [perpsState]);
}
