import { useCallback } from 'react';
import Engine from '../../../../core/Engine';
import type {
  AssetRoute,
  CancelOrderParams,
  CancelOrderResult,
  ClosePositionParams,
  DepositParams,
  DepositResult,
  GetAccountStateParams,
  GetPositionsParams,
  LiveDataConfig,
  MarketInfo,
  OrderParams,
  OrderResult,
  Position,
  AccountState,
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

  const getDepositRoutes = useCallback(
    (): AssetRoute[] => controller.getDepositRoutes(),
    [controller]
  );

  const getWithdrawalRoutes = useCallback(
    (): AssetRoute[] => controller.getWithdrawalRoutes(),
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
    getDepositRoutes,
    getWithdrawalRoutes,
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
