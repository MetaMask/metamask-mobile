import Logger from '../../../../../util/Logger';
import { ensureError } from '../../utils/perpsErrorHandler';
import {
  trace,
  endTrace,
  TraceName,
  TraceOperation,
} from '../../../../../util/trace';
import { v4 as uuidv4 } from 'uuid';
import performance from 'react-native-performance';
import { setMeasurement } from '@sentry/react-native';
import { PerpsMeasurementName } from '../../constants/performanceMetrics';
import { PERPS_ERROR_CODES } from '../perpsErrorCodes';
import type { ServiceContext } from './ServiceContext';
import type {
  IPerpsProvider,
  Position,
  GetPositionsParams,
  AccountState,
  GetAccountStateParams,
  HistoricalPortfolioResult,
  GetHistoricalPortfolioParams,
  OrderFill,
  GetOrderFillsParams,
  Funding,
  GetFundingParams,
  Order,
  GetOrdersParams,
  MarketInfo,
  GetMarketsParams,
  GetAvailableDexsParams,
  LiquidationPriceParams,
  MaintenanceMarginParams,
  FeeCalculationParams,
  FeeCalculationResult,
  OrderParams,
  ClosePositionParams,
  AssetRoute,
} from '../types';
import type { CandleData } from '../../types/perps-types';
import type { CandlePeriod } from '../../constants/chartConfig';

/**
 * MarketDataService
 *
 * Handles all read-only data-fetching operations for the Perps controller.
 * This service is stateless and delegates to the provider.
 * The controller is responsible for tracing and state management.
 */
export class MarketDataService {
  /**
   * Error context helper for consistent logging
   */
  private static getErrorContext(
    method: string,
    additionalContext?: Record<string, unknown>,
  ): Record<string, unknown> {
    return {
      controller: 'MarketDataService',
      method,
      ...additionalContext,
    };
  }

  /**
   * Get current positions
   * Handles full orchestration: tracing, error logging, state management, and provider delegation
   */
  static async getPositions(options: {
    provider: IPerpsProvider;
    params?: GetPositionsParams;
    context: ServiceContext;
  }): Promise<Position[]> {
    const { provider, params, context } = options;
    const traceId = uuidv4();
    let traceData: { success: boolean; error?: string } | undefined;

    try {
      trace({
        name: TraceName.PerpsGetPositions,
        id: traceId,
        op: TraceOperation.PerpsOperation,
        tags: {
          provider: context.tracingContext.provider,
          isTestnet: context.tracingContext.isTestnet,
        },
      });

      const positions = await provider.getPositions(params);

      // Update state on success (if stateManager is provided)
      if (context.stateManager) {
        context.stateManager.update((state) => {
          state.lastUpdateTimestamp = Date.now();
          state.lastError = null;
        });
      }

      traceData = { success: true };
      return positions;
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : PERPS_ERROR_CODES.POSITIONS_FAILED;

      // Update error state (if stateManager is provided)
      if (context.stateManager) {
        context.stateManager.update((state) => {
          state.lastError = errorMessage;
          state.lastUpdateTimestamp = Date.now();
        });
      }

      traceData = {
        success: false,
        error: errorMessage,
      };

      throw error;
    } finally {
      endTrace({
        name: TraceName.PerpsGetPositions,
        id: traceId,
        data: traceData,
      });
    }
  }

  /**
   * Get order fills for a specific user or order
   * Handles full orchestration: tracing, error logging, and provider delegation
   */
  static async getOrderFills(options: {
    provider: IPerpsProvider;
    params?: GetOrderFillsParams;
    context: ServiceContext;
  }): Promise<OrderFill[]> {
    const { provider, params, context } = options;
    const traceId = uuidv4();
    let traceData: { success: boolean; error?: string } | undefined;

    try {
      trace({
        name: TraceName.PerpsOrderFillsFetch,
        id: traceId,
        op: TraceOperation.PerpsOperation,
        tags: {
          provider: context.tracingContext.provider,
          isTestnet: context.tracingContext.isTestnet,
        },
      });

      const result = await provider.getOrderFills(params);

      traceData = { success: true };
      return result;
    } catch (error) {
      Logger.error(ensureError(error), {
        tags: {
          feature: 'perps',
          provider: context.tracingContext.provider,
          network: context.tracingContext.isTestnet ? 'testnet' : 'mainnet',
        },
        context: {
          name: context.errorContext.controller,
          data: {
            method: context.errorContext.method,
            params,
          },
        },
      });

      traceData = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      throw error;
    } finally {
      endTrace({
        name: TraceName.PerpsOrderFillsFetch,
        id: traceId,
        data: traceData,
      });
    }
  }

  /**
   * Get historical user orders (order lifecycle)
   * Handles full orchestration: tracing, error logging, and provider delegation
   */
  static async getOrders(options: {
    provider: IPerpsProvider;
    params?: GetOrdersParams;
    context: ServiceContext;
  }): Promise<Order[]> {
    const { provider, params, context } = options;
    const traceId = uuidv4();
    let traceData: { success: boolean; error?: string } | undefined;

    try {
      trace({
        name: TraceName.PerpsOrdersFetch,
        id: traceId,
        op: TraceOperation.PerpsOperation,
        tags: {
          provider: context.tracingContext.provider,
          isTestnet: context.tracingContext.isTestnet,
        },
      });

      const result = await provider.getOrders(params);

      traceData = { success: true };
      return result;
    } catch (error) {
      Logger.error(ensureError(error), {
        tags: {
          feature: 'perps',
          provider: context.tracingContext.provider,
          network: context.tracingContext.isTestnet ? 'testnet' : 'mainnet',
        },
        context: {
          name: context.errorContext.controller,
          data: {
            method: context.errorContext.method,
            params,
          },
        },
      });

      traceData = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      throw error;
    } finally {
      endTrace({
        name: TraceName.PerpsOrdersFetch,
        id: traceId,
        data: traceData,
      });
    }
  }

  /**
   * Get current open orders
   * Handles full orchestration: tracing, error logging, performance measurement, and provider delegation
   */
  static async getOpenOrders(options: {
    provider: IPerpsProvider;
    params?: GetOrdersParams;
    context: ServiceContext;
  }): Promise<Order[]> {
    const { provider, params, context } = options;
    const traceId = uuidv4();
    const startTime = performance.now();
    let traceData: { success: boolean; error?: string } | undefined;

    try {
      const traceSpan = trace({
        name: TraceName.PerpsOrdersFetch,
        id: traceId,
        op: TraceOperation.PerpsOperation,
        tags: {
          provider: context.tracingContext.provider,
          isTestnet: context.tracingContext.isTestnet,
        },
      });

      const result = await provider.getOpenOrders(params);

      const completionDuration = performance.now() - startTime;
      setMeasurement(
        PerpsMeasurementName.PERPS_GET_OPEN_ORDERS_OPERATION,
        completionDuration,
        'millisecond',
        traceSpan,
      );

      traceData = { success: true };
      return result;
    } catch (error) {
      Logger.error(ensureError(error), {
        tags: {
          feature: 'perps',
          provider: context.tracingContext.provider,
          network: context.tracingContext.isTestnet ? 'testnet' : 'mainnet',
        },
        context: {
          name: context.errorContext.controller,
          data: {
            method: context.errorContext.method,
            params,
          },
        },
      });

      traceData = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      throw error;
    } finally {
      endTrace({
        name: TraceName.PerpsOrdersFetch,
        id: traceId,
        data: traceData,
      });
    }
  }

  /**
   * Get funding rates
   * Handles full orchestration: tracing, error logging, and provider delegation
   */
  static async getFunding(options: {
    provider: IPerpsProvider;
    params?: GetFundingParams;
    context: ServiceContext;
  }): Promise<Funding[]> {
    const { provider, params, context } = options;
    const traceId = uuidv4();
    let traceData: { success: boolean; error?: string } | undefined;

    try {
      trace({
        name: TraceName.PerpsFundingFetch,
        id: traceId,
        op: TraceOperation.PerpsOperation,
        tags: {
          provider: context.tracingContext.provider,
          isTestnet: context.tracingContext.isTestnet,
        },
      });

      const result = await provider.getFunding(params);

      traceData = { success: true };
      return result;
    } catch (error) {
      Logger.error(ensureError(error), {
        tags: {
          feature: 'perps',
          provider: context.tracingContext.provider,
          network: context.tracingContext.isTestnet ? 'testnet' : 'mainnet',
        },
        context: {
          name: context.errorContext.controller,
          data: {
            method: context.errorContext.method,
            params,
          },
        },
      });

      traceData = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      throw error;
    } finally {
      endTrace({
        name: TraceName.PerpsFundingFetch,
        id: traceId,
        data: traceData,
      });
    }
  }

  /**
   * Get account state
   * Handles full orchestration: tracing, error logging, state management, and provider delegation
   */
  static async getAccountState(options: {
    provider: IPerpsProvider;
    params?: GetAccountStateParams;
    context: ServiceContext;
  }): Promise<AccountState> {
    const { provider, params, context } = options;
    const traceId = uuidv4();
    let traceData: { success: boolean; error?: string } | undefined;

    try {
      trace({
        name: TraceName.PerpsGetAccountState,
        id: traceId,
        op: TraceOperation.PerpsOperation,
        tags: {
          provider: context.tracingContext.provider,
          isTestnet: context.tracingContext.isTestnet,
          source: params?.source || 'unknown',
        },
      });

      const accountState = await provider.getAccountState(params);

      // Safety check for accountState
      if (!accountState) {
        const error = new Error(
          'Failed to get account state: received null/undefined response',
        );

        Logger.error(ensureError(error), {
          tags: {
            feature: 'perps',
            provider: context.tracingContext.provider,
            network: context.tracingContext.isTestnet ? 'testnet' : 'mainnet',
          },
          context: {
            name: context.errorContext.controller,
            data: {
              method: context.errorContext.method,
              operation: 'nullAccountStateCheck',
            },
          },
        });

        throw error;
      }

      // Update state on success (if stateManager is provided)
      if (context.stateManager) {
        context.stateManager.update((state) => {
          state.accountState = accountState;
          state.lastUpdateTimestamp = Date.now();
          state.lastError = null;
        });
      }

      traceData = { success: true };
      return accountState;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Account state fetch failed';

      // Update error state (if stateManager is provided)
      if (context.stateManager) {
        context.stateManager.update((state) => {
          state.lastError = errorMessage;
          state.lastUpdateTimestamp = Date.now();
        });
      }

      traceData = {
        success: false,
        error: errorMessage,
      };

      throw error;
    } finally {
      endTrace({
        name: TraceName.PerpsGetAccountState,
        id: traceId,
        data: traceData,
      });
    }
  }

  /**
   * Get historical portfolio data
   * Handles full orchestration: tracing, error logging, state management, and provider delegation
   */
  static async getHistoricalPortfolio(options: {
    provider: IPerpsProvider;
    params?: GetHistoricalPortfolioParams;
    context: ServiceContext;
  }): Promise<HistoricalPortfolioResult> {
    const { provider, params, context } = options;
    const traceId = uuidv4();
    let traceData: { success: boolean; error?: string } | undefined;

    try {
      trace({
        name: TraceName.PerpsGetHistoricalPortfolio,
        id: traceId,
        op: TraceOperation.PerpsOperation,
        tags: {
          provider: context.tracingContext.provider,
          isTestnet: context.tracingContext.isTestnet,
        },
      });

      if (!provider.getHistoricalPortfolio) {
        throw new Error('Historical portfolio not supported by provider');
      }

      const result = await provider.getHistoricalPortfolio(params);

      traceData = { success: true };
      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Failed to get historical portfolio';

      Logger.error(ensureError(error), {
        tags: {
          feature: 'perps',
          provider: context.tracingContext.provider,
          network: context.tracingContext.isTestnet ? 'testnet' : 'mainnet',
        },
        context: {
          name: context.errorContext.controller,
          data: {
            method: context.errorContext.method,
            params,
          },
        },
      });

      // Update error state (if stateManager is provided)
      if (context.stateManager) {
        context.stateManager.update((state) => {
          state.lastError = errorMessage;
          state.lastUpdateTimestamp = Date.now();
        });
      }

      traceData = {
        success: false,
        error: errorMessage,
      };

      throw error;
    } finally {
      endTrace({
        name: TraceName.PerpsGetHistoricalPortfolio,
        id: traceId,
        data: traceData,
      });
    }
  }

  /**
   * Get available markets
   * Handles full orchestration: tracing, error logging, state management, and provider delegation
   */
  static async getMarkets(options: {
    provider: IPerpsProvider;
    params?: GetMarketsParams;
    context: ServiceContext;
  }): Promise<MarketInfo[]> {
    const { provider, params, context } = options;
    const traceId = uuidv4();
    let traceData: { success: boolean; error?: string } | undefined;

    try {
      trace({
        name: TraceName.PerpsGetMarkets,
        id: traceId,
        op: TraceOperation.PerpsOperation,
        tags: {
          provider: context.tracingContext.provider,
          isTestnet: context.tracingContext.isTestnet,
          ...(params?.symbols && { symbolCount: params.symbols.length }),
          ...(params?.dex !== undefined && { dex: params.dex }),
        },
      });

      const markets = await provider.getMarkets(params);

      // Clear any previous errors on successful call (if stateManager is provided)
      if (context.stateManager) {
        context.stateManager.update((state) => {
          state.lastError = null;
          state.lastUpdateTimestamp = Date.now();
        });
      }

      traceData = { success: true };
      return markets;
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : PERPS_ERROR_CODES.MARKETS_FAILED;

      Logger.error(ensureError(error), {
        tags: {
          feature: 'perps',
          provider: context.tracingContext.provider,
          network: context.tracingContext.isTestnet ? 'testnet' : 'mainnet',
        },
        context: {
          name: context.errorContext.controller,
          data: {
            method: context.errorContext.method,
            params,
          },
        },
      });

      // Update error state (if stateManager is provided)
      if (context.stateManager) {
        context.stateManager.update((state) => {
          state.lastError = errorMessage;
          state.lastUpdateTimestamp = Date.now();
        });
      }

      traceData = {
        success: false,
        error: errorMessage,
      };

      throw error;
    } finally {
      endTrace({
        name: TraceName.PerpsGetMarkets,
        id: traceId,
        data: traceData,
      });
    }
  }

  /**
   * Get available DEXs (HIP-3 support required)
   */
  static async getAvailableDexs(options: {
    provider: IPerpsProvider;
    params?: GetAvailableDexsParams;
  }): Promise<string[]> {
    const { provider, params } = options;

    try {
      if (!provider.getAvailableDexs) {
        throw new Error('Provider does not support HIP-3 DEXs');
      }

      return await provider.getAvailableDexs(params);
    } catch (error) {
      Logger.error(
        ensureError(error),
        this.getErrorContext('getAvailableDexs', { params }),
      );
      throw error;
    }
  }

  /**
   * Fetch historical candle data for charting
   * Handles full orchestration: tracing, error logging, state management, and provider delegation
   */
  static async fetchHistoricalCandles(options: {
    provider: IPerpsProvider;
    coin: string;
    interval: CandlePeriod;
    limit?: number;
    endTime?: number;
    context: ServiceContext;
  }): Promise<CandleData> {
    const { provider, coin, interval, limit = 100, endTime, context } = options;
    const traceId = uuidv4();
    let traceData: { success: boolean; error?: string } | undefined;

    try {
      trace({
        name: TraceName.PerpsFetchHistoricalCandles,
        id: traceId,
        op: TraceOperation.PerpsOperation,
        tags: {
          provider: context.tracingContext.provider,
          isTestnet: context.tracingContext.isTestnet,
          coin,
          interval,
        },
      });

      // Check if provider supports historical candles via clientService
      const hyperLiquidProvider = provider as {
        clientService?: {
          fetchHistoricalCandles?: (
            coin: string,
            interval: CandlePeriod,
            limit: number,
            endTime?: number,
          ) => Promise<CandleData>;
        };
      };
      if (!hyperLiquidProvider.clientService?.fetchHistoricalCandles) {
        throw new Error('Historical candles not supported by provider');
      }

      const result =
        await hyperLiquidProvider.clientService.fetchHistoricalCandles(
          coin,
          interval,
          limit,
          endTime,
        );

      traceData = { success: true };
      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Failed to fetch historical candles';

      Logger.error(ensureError(error), {
        tags: {
          feature: 'perps',
          provider: context.tracingContext.provider,
          network: context.tracingContext.isTestnet ? 'testnet' : 'mainnet',
        },
        context: {
          name: context.errorContext.controller,
          data: {
            method: context.errorContext.method,
            coin,
            interval,
            limit,
            endTime,
          },
        },
      });

      // Update error state (if stateManager is provided)
      if (context.stateManager) {
        context.stateManager.update((state) => {
          state.lastError = errorMessage;
          state.lastUpdateTimestamp = Date.now();
        });
      }

      traceData = {
        success: false,
        error: errorMessage,
      };

      throw error;
    } finally {
      endTrace({
        name: TraceName.PerpsFetchHistoricalCandles,
        id: traceId,
        data: traceData,
      });
    }
  }

  /**
   * Calculate liquidation price for a position
   */
  static async calculateLiquidationPrice(options: {
    provider: IPerpsProvider;
    params: LiquidationPriceParams;
  }): Promise<string> {
    const { provider, params } = options;

    try {
      return await provider.calculateLiquidationPrice(params);
    } catch (error) {
      Logger.error(
        ensureError(error),
        this.getErrorContext('calculateLiquidationPrice', { params }),
      );
      throw error;
    }
  }

  /**
   * Calculate maintenance margin for a position
   */
  static async calculateMaintenanceMargin(options: {
    provider: IPerpsProvider;
    params: MaintenanceMarginParams;
  }): Promise<number> {
    const { provider, params } = options;

    try {
      return await provider.calculateMaintenanceMargin(params);
    } catch (error) {
      Logger.error(
        ensureError(error),
        this.getErrorContext('calculateMaintenanceMargin', { params }),
      );
      throw error;
    }
  }

  /**
   * Get maximum leverage for an asset
   */
  static async getMaxLeverage(options: {
    provider: IPerpsProvider;
    asset: string;
  }): Promise<number> {
    const { provider, asset } = options;

    try {
      return await provider.getMaxLeverage(asset);
    } catch (error) {
      Logger.error(
        ensureError(error),
        this.getErrorContext('getMaxLeverage', { asset }),
      );
      throw error;
    }
  }

  /**
   * Calculate fees for an order
   */
  static async calculateFees(options: {
    provider: IPerpsProvider;
    params: FeeCalculationParams;
  }): Promise<FeeCalculationResult> {
    const { provider, params } = options;

    try {
      return await provider.calculateFees(params);
    } catch (error) {
      Logger.error(
        ensureError(error),
        this.getErrorContext('calculateFees', { params }),
      );
      throw error;
    }
  }

  /**
   * Validate an order before placement
   */
  static async validateOrder(options: {
    provider: IPerpsProvider;
    params: OrderParams;
  }): Promise<{ isValid: boolean; error?: string }> {
    const { provider, params } = options;

    try {
      return await provider.validateOrder(params);
    } catch (error) {
      Logger.error(
        ensureError(error),
        this.getErrorContext('validateOrder', { params }),
      );
      throw error;
    }
  }

  /**
   * Validate a position close request
   */
  static async validateClosePosition(options: {
    provider: IPerpsProvider;
    params: ClosePositionParams;
  }): Promise<{ isValid: boolean; error?: string }> {
    const { provider, params } = options;

    try {
      return await provider.validateClosePosition(params);
    } catch (error) {
      Logger.error(
        ensureError(error),
        this.getErrorContext('validateClosePosition', { params }),
      );
      throw error;
    }
  }

  /**
   * Get supported withdrawal routes (synchronous)
   */
  static getWithdrawalRoutes(options: {
    provider: IPerpsProvider;
  }): AssetRoute[] {
    const { provider } = options;

    try {
      return provider.getWithdrawalRoutes();
    } catch (error) {
      Logger.error(
        ensureError(error),
        this.getErrorContext('getWithdrawalRoutes'),
      );
      return [];
    }
  }

  /**
   * Get block explorer URL (synchronous)
   */
  static getBlockExplorerUrl(options: {
    provider: IPerpsProvider;
    address?: string;
  }): string {
    const { provider, address } = options;
    return provider.getBlockExplorerUrl(address);
  }
}
