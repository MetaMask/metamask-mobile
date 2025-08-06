import { useCallback } from 'react';
import Engine from '../../../../core/Engine';
import type {
  AccountState,
  AssetRoute,
  CancelOrderParams,
  CancelOrderResult,
  ClosePositionParams,
  DepositParams,
  DepositResult,
  FeeCalculationParams,
  FeeCalculationResult,
  GetAccountStateParams,
  LiquidationPriceParams,
  MaintenanceMarginParams,
  MarketInfo,
  OrderParams,
  OrderResult,
  Position,
  SubscribeOrderFillsParams,
  SubscribePositionsParams,
  SubscribePricesParams,
  UpdatePositionTPSLParams,
  WithdrawParams,
  WithdrawResult,
} from '../controllers/types';

/**
 * Hook for trading operations
 * Provides methods for placing, canceling, and closing trading positions
 */
export function usePerpsTrading() {
  const placeOrder = useCallback(
    async (params: OrderParams): Promise<OrderResult> => {
      const controller = Engine.context.PerpsController;
      return controller.placeOrder(params);
    },
    [],
  );

  const cancelOrder = useCallback(
    async (params: CancelOrderParams): Promise<CancelOrderResult> => {
      const controller = Engine.context.PerpsController;
      return controller.cancelOrder(params);
    },
    [],
  );

  const closePosition = useCallback(
    async (params: ClosePositionParams): Promise<OrderResult> => {
      const controller = Engine.context.PerpsController;
      return controller.closePosition(params);
    },
    [],
  );

  const getMarkets = useCallback(
    async (params?: { symbols?: string[] }): Promise<MarketInfo[]> => {
      const controller = Engine.context.PerpsController;
      return controller.getMarkets(params);
    },
    [],
  );

  const getPositions = useCallback(async (): Promise<Position[]> => {
    const controller = Engine.context.PerpsController;
    return controller.getPositions();
  }, []);

  const getAccountState = useCallback(
    async (params?: GetAccountStateParams): Promise<AccountState> => {
      const controller = Engine.context.PerpsController;
      return controller.getAccountState(params);
    },
    [],
  );

  const subscribeToPrices = useCallback(
    (subscription: SubscribePricesParams): (() => void) => {
      const controller = Engine.context.PerpsController;
      return controller.subscribeToPrices(subscription);
    },
    [],
  );

  const subscribeToPositions = useCallback(
    (subscription: SubscribePositionsParams): (() => void) => {
      const controller = Engine.context.PerpsController;
      return controller.subscribeToPositions(subscription);
    },
    [],
  );

  const subscribeToOrderFills = useCallback(
    (subscription: SubscribeOrderFillsParams): (() => void) => {
      const controller = Engine.context.PerpsController;
      return controller.subscribeToOrderFills(subscription);
    },
    [],
  );

  const deposit = useCallback(
    async (params: DepositParams): Promise<DepositResult> => {
      const controller = Engine.context.PerpsController;
      return controller.deposit(params);
    },
    [],
  );

  const getDepositRoutes = useCallback((): AssetRoute[] => {
    const controller = Engine.context.PerpsController;
    return controller.getDepositRoutes();
  }, []);

  const resetDepositState = useCallback((): void => {
    const controller = Engine.context.PerpsController;
    controller.resetDepositState();
  }, []);

  const withdraw = useCallback(
    async (params: WithdrawParams): Promise<WithdrawResult> => {
      const controller = Engine.context.PerpsController;
      return controller.withdraw(params);
    },
    [],
  );

  const calculateLiquidationPrice = useCallback(
    async (params: LiquidationPriceParams): Promise<string> => {
      const controller = Engine.context.PerpsController;
      return controller.calculateLiquidationPrice(params);
    },
    [],
  );

  const calculateMaintenanceMargin = useCallback(
    async (params: MaintenanceMarginParams): Promise<number> => {
      const controller = Engine.context.PerpsController;
      return controller.calculateMaintenanceMargin(params);
    },
    [],
  );

  const getMaxLeverage = useCallback(async (asset: string): Promise<number> => {
    const controller = Engine.context.PerpsController;
    return controller.getMaxLeverage(asset);
  }, []);

  const updatePositionTPSL = useCallback(
    async (params: UpdatePositionTPSLParams): Promise<OrderResult> => {
      const controller = Engine.context.PerpsController;
      return controller.updatePositionTPSL(params);
    },
    [],
  );

  const calculateFees = useCallback(
    async (params: FeeCalculationParams): Promise<FeeCalculationResult> => {
      const controller = Engine.context.PerpsController;
      return controller.calculateFees(params);
    },
    [],
  );

  const validateOrder = useCallback(
    async (
      params: OrderParams,
    ): Promise<{ isValid: boolean; error?: string }> => {
      const controller = Engine.context.PerpsController;
      return controller.validateOrder(params);
    },
    [],
  );

  const validateClosePosition = useCallback(
    async (
      params: ClosePositionParams,
    ): Promise<{ isValid: boolean; error?: string }> => {
      const controller = Engine.context.PerpsController;
      return controller.validateClosePosition(params);
    },
    [],
  );

  const validateWithdrawal = useCallback(
    async (
      params: WithdrawParams,
    ): Promise<{ isValid: boolean; error?: string }> => {
      const controller = Engine.context.PerpsController;
      return controller.validateWithdrawal(params);
    },
    [],
  );

  return {
    placeOrder,
    cancelOrder,
    closePosition,
    getMarkets,
    getPositions,
    getAccountState,
    subscribeToPrices,
    subscribeToPositions,
    subscribeToOrderFills,
    deposit,
    getDepositRoutes,
    resetDepositState,
    withdraw,
    calculateLiquidationPrice,
    calculateMaintenanceMargin,
    getMaxLeverage,
    updatePositionTPSL,
    calculateFees,
    validateOrder,
    validateClosePosition,
    validateWithdrawal,
  };
}
