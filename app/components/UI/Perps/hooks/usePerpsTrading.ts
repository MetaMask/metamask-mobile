import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { selectPerpsTerminalBackendEnabledFlag } from '../selectors/featureFlags';
import { usePerpsNetworkManagement } from './usePerpsNetworkManagement';
import {
  type AccountState,
  type CancelOrderParams,
  type CancelOrderResult,
  type ClosePositionParams,
  type FeeCalculationParams,
  type FeeCalculationResult,
  type FlipPositionParams,
  type GetAccountStateParams,
  type GetMarketsParams,
  type GetOrderFillsParams,
  type GetOrdersParams,
  type GetFundingParams,
  type GetPositionsParams,
  type OrderFill,
  type Order,
  type Funding,
  type LiquidationPriceParams,
  type MaintenanceMarginParams,
  type MarginResult,
  type MarketInfo,
  type OrderParams,
  type OrderResult,
  type Position,
  type SubscribeOrderFillsParams,
  type SubscribePricesParams,
  type SubscribePositionsParams,
  type UpdateMarginParams,
  type UpdatePositionTPSLParams,
  type WithdrawParams,
  type WithdrawResult,
} from '@metamask/perps-controller';
import { TraceName } from '../../../../util/trace';
import {
  startPerpsCufTrace,
  endPerpsCufTrace,
  endPerpsCufTraceAfter,
  watchPerpsCufOrderAbsent,
} from '../utils/perpsCufTrace';
import {
  PERPS_CUF_TAG,
  PERPS_CUF_END_REASON,
  PERPS_CUF_STREAM_TIMEOUT_MS,
} from '../constants/perpsCufTags';

/**
 * UI-facing params for fetching markets.
 *
 * `useTerminalApi` is source-selection policy, not market-query intent, so it is
 * intentionally hidden from callers. The hook injects the source flag, and the
 * controller owns Terminal-first fetching with HyperLiquid fallback. Callers
 * should only describe query intent (symbols, dex, standalone, filters, etc.).
 */
export type MobileGetMarketsParams = Omit<GetMarketsParams, 'useTerminalApi'>;

/**
 * Hook for trading operations
 * Provides methods for placing, canceling, and closing trading positions
 */
export function usePerpsTrading() {
  const { ensureArbitrumNetworkExists } = usePerpsNetworkManagement();
  const useTerminalApi = useSelector(selectPerpsTerminalBackendEnabledFlag);

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
      // Confirmation CUF: every cancel UI path funnels through here; the span
      // ends when the stream no longer lists the order.
      const cancelCufOpId = startPerpsCufTrace({
        name: TraceName.PerpsCancelOrderToConfirmation,
      });
      watchPerpsCufOrderAbsent(cancelCufOpId, params.orderId);
      endPerpsCufTraceAfter(
        {
          id: cancelCufOpId,
          data: {
            [PERPS_CUF_TAG.SUCCESS]: false,
            [PERPS_CUF_TAG.REASON]: PERPS_CUF_END_REASON.STREAM_TIMEOUT,
          },
        },
        PERPS_CUF_STREAM_TIMEOUT_MS,
      );
      try {
        const result = await controller.cancelOrder(params);
        if (!result?.success) {
          endPerpsCufTrace({
            id: cancelCufOpId,
            data: {
              [PERPS_CUF_TAG.SUCCESS]: false,
              [PERPS_CUF_TAG.REASON]: PERPS_CUF_END_REASON.REQUEST_FAILED,
            },
          });
        }
        return result;
      } catch (error) {
        endPerpsCufTrace({
          id: cancelCufOpId,
          data: {
            [PERPS_CUF_TAG.SUCCESS]: false,
            [PERPS_CUF_TAG.REASON]: PERPS_CUF_END_REASON.EXCEPTION,
          },
        });
        throw error;
      }
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
    async (params?: MobileGetMarketsParams): Promise<MarketInfo[]> => {
      const controller = Engine.context.PerpsController;
      return controller.getMarkets({
        ...params,
        useTerminalApi,
      });
    },
    [useTerminalApi],
  );

  const getPositions = useCallback(
    async (params?: GetPositionsParams): Promise<Position[]> => {
      const controller = Engine.context.PerpsController;
      return controller.getPositions(params);
    },
    [],
  );

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

  const depositWithConfirmation = useCallback(
    async (
      amount?: string,
    ): Promise<{
      result: Promise<string>;
    }> => {
      await ensureArbitrumNetworkExists();
      const controller = Engine.context.PerpsController;
      return controller.depositWithConfirmation({ amount, placeOrder: false });
    },
    [ensureArbitrumNetworkExists],
  );

  const depositWithOrder = useCallback(async (): Promise<{
    result: Promise<string>;
  }> => {
    await ensureArbitrumNetworkExists();
    const controller = Engine.context.PerpsController;
    return controller.depositWithOrder();
  }, [ensureArbitrumNetworkExists]);

  const clearDepositResult = useCallback((): void => {
    const controller = Engine.context.PerpsController;
    controller.clearDepositResult();
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

  const updateMargin = useCallback(
    async (params: UpdateMarginParams): Promise<MarginResult> => {
      const controller = Engine.context.PerpsController;
      return controller.updateMargin(params);
    },
    [],
  );

  const flipPosition = useCallback(
    async (params: FlipPositionParams): Promise<OrderResult> => {
      const controller = Engine.context.PerpsController;
      return controller.flipPosition(params);
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

  const getOrderFills = useCallback(
    async (params?: GetOrderFillsParams): Promise<OrderFill[]> => {
      const controller = Engine.context.PerpsController;
      return controller.getOrderFills(params);
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

  const getOrders = useCallback(
    async (params?: GetOrdersParams): Promise<Order[]> => {
      const controller = Engine.context.PerpsController;
      return controller.getOrders(params);
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

  const getFunding = useCallback(
    async (params?: GetFundingParams): Promise<Funding[]> => {
      const controller = Engine.context.PerpsController;
      return controller.getFunding(params);
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
    depositWithConfirmation,
    depositWithOrder,
    clearDepositResult,
    withdraw,
    calculateLiquidationPrice,
    calculateMaintenanceMargin,
    getMaxLeverage,
    updatePositionTPSL,
    updateMargin,
    flipPosition,
    calculateFees,
    validateOrder,
    validateClosePosition,
    validateWithdrawal,
    getOrderFills,
    getOrders,
    getFunding,
  };
}
