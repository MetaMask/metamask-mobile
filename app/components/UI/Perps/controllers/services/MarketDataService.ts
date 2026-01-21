import { ensureError } from '../../../../../util/errorUtils';
import { v4 as uuidv4 } from 'uuid';
import { PerpsMeasurementName } from '../../constants/performanceMetrics';
import { PERPS_ERROR_CODES } from '../perpsErrorCodes';
import type { ServiceContext } from './ServiceContext';
import {
  PerpsTraceNames,
  PerpsTraceOperations,
  type IPerpsProvider,
  type Position,
  type GetPositionsParams,
  type AccountState,
  type GetAccountStateParams,
  type HistoricalPortfolioResult,
  type GetHistoricalPortfolioParams,
  type OrderFill,
  type GetOrderFillsParams,
  type Funding,
  type GetFundingParams,
  type Order,
  type GetOrdersParams,
  type MarketInfo,
  type GetMarketsParams,
  type GetAvailableDexsParams,
  type LiquidationPriceParams,
  type MaintenanceMarginParams,
  type FeeCalculationParams,
  type FeeCalculationResult,
  type OrderParams,
  type ClosePositionParams,
  type AssetRoute,
  type IPerpsPlatformDependencies,
} from '../types';
import type { CandleData } from '../../types/perps-types';
import type { CandlePeriod } from '../../constants/chartConfig';

/**
 * MarketDataService
 *
 * Handles all read-only data-fetching operations for the Perps controller.
 * This service is stateless and delegates to the provider.
 * The controller is responsible for tracing and state management.
 *
 * Instance-based service with constructor injection of platform dependencies.
 */
export class MarketDataService {
  private readonly deps: IPerpsPlatformDependencies;

  /**
   * Create a new MarketDataService instance
   * @param deps - Platform dependencies for logging, metrics, etc.
   */
  constructor(deps: IPerpsPlatformDependencies) {
    this.deps = deps;
  }

  /**
   * Get current positions
   * Handles full orchestration: tracing, error logging, state management, and provider delegation
   */
  async getPositions(options: {
    provider: IPerpsProvider;
    params?: GetPositionsParams;
    context: ServiceContext;
  }): Promise<Position[]> {
    const { provider, params, context } = options;
    const traceId = uuidv4();
    let traceData: { success: boolean; error?: string } | undefined;

    try {
      this.deps.tracer.trace({
        name: PerpsTraceNames.GET_POSITIONS,
        id: traceId,
        op: PerpsTraceOperations.OPERATION,
        tags: {
          provider: context.tracingContext.provider,
          isTestnet: String(context.tracingContext.isTestnet),
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
      this.deps.tracer.endTrace({
        name: PerpsTraceNames.GET_POSITIONS,
        id: traceId,
        data: traceData,
      });
    }
  }

  /**
   * Get order fills for a specific user or order
   * Handles full orchestration: tracing, error logging, and provider delegation
   */
  async getOrderFills(options: {
    provider: IPerpsProvider;
    params?: GetOrderFillsParams;
    context: ServiceContext;
  }): Promise<OrderFill[]> {
    const { provider, params, context } = options;
    const traceId = uuidv4();
    let traceData: { success: boolean; error?: string } | undefined;

    try {
      this.deps.tracer.trace({
        name: PerpsTraceNames.ORDER_FILLS_FETCH,
        id: traceId,
        op: PerpsTraceOperations.OPERATION,
        tags: {
          provider: context.tracingContext.provider,
          isTestnet: String(context.tracingContext.isTestnet),
        },
      });

      const result = await provider.getOrderFills(params);

      traceData = { success: true };
      return result;
    } catch (error) {
      this.deps.logger.error(ensureError(error), {
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
      this.deps.tracer.endTrace({
        name: PerpsTraceNames.ORDER_FILLS_FETCH,
        id: traceId,
        data: traceData,
      });
    }
  }

  /**
   * Get historical user orders (order lifecycle)
   * Handles full orchestration: tracing, error logging, and provider delegation
   */
  async getOrders(options: {
    provider: IPerpsProvider;
    params?: GetOrdersParams;
    context: ServiceContext;
  }): Promise<Order[]> {
    const { provider, params, context } = options;
    const traceId = uuidv4();
    let traceData: { success: boolean; error?: string } | undefined;

    try {
      this.deps.tracer.trace({
        name: PerpsTraceNames.ORDERS_FETCH,
        id: traceId,
        op: PerpsTraceOperations.OPERATION,
        tags: {
          provider: context.tracingContext.provider,
          isTestnet: String(context.tracingContext.isTestnet),
        },
      });

      const result = await provider.getOrders(params);

      traceData = { success: true };
      return result;
    } catch (error) {
      this.deps.logger.error(ensureError(error), {
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
      this.deps.tracer.endTrace({
        name: PerpsTraceNames.ORDERS_FETCH,
        id: traceId,
        data: traceData,
      });
    }
  }

  /**
   * Get current open orders
   * Handles full orchestration: tracing, error logging, performance measurement, and provider delegation
   */
  async getOpenOrders(options: {
    provider: IPerpsProvider;
    params?: GetOrdersParams;
    context: ServiceContext;
  }): Promise<Order[]> {
    const { provider, params, context } = options;
    const traceId = uuidv4();
    const startTime = this.deps.performance.now();
    let traceData: { success: boolean; error?: string } | undefined;

    try {
      this.deps.tracer.trace({
        name: PerpsTraceNames.ORDERS_FETCH,
        id: traceId,
        op: PerpsTraceOperations.OPERATION,
        tags: {
          provider: context.tracingContext.provider,
          isTestnet: String(context.tracingContext.isTestnet),
        },
      });

      const result = await provider.getOpenOrders(params);

      const completionDuration = this.deps.performance.now() - startTime;
      this.deps.tracer.setMeasurement(
        PerpsMeasurementName.PERPS_GET_OPEN_ORDERS_OPERATION,
        completionDuration,
        'millisecond',
      );

      traceData = { success: true };
      return result;
    } catch (error) {
      this.deps.logger.error(ensureError(error), {
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
      this.deps.tracer.endTrace({
        name: PerpsTraceNames.ORDERS_FETCH,
        id: traceId,
        data: traceData,
      });
    }
  }

  /**
   * Get funding rates
   * Handles full orchestration: tracing, error logging, and provider delegation
   */
  async getFunding(options: {
    provider: IPerpsProvider;
    params?: GetFundingParams;
    context: ServiceContext;
  }): Promise<Funding[]> {
    const { provider, params, context } = options;
    const traceId = uuidv4();
    let traceData: { success: boolean; error?: string } | undefined;

    try {
      this.deps.tracer.trace({
        name: PerpsTraceNames.FUNDING_FETCH,
        id: traceId,
        op: PerpsTraceOperations.OPERATION,
        tags: {
          provider: context.tracingContext.provider,
          isTestnet: String(context.tracingContext.isTestnet),
        },
      });

      const result = await provider.getFunding(params);

      traceData = { success: true };
      return result;
    } catch (error) {
      this.deps.logger.error(ensureError(error), {
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
      this.deps.tracer.endTrace({
        name: PerpsTraceNames.FUNDING_FETCH,
        id: traceId,
        data: traceData,
      });
    }
  }

  /**
   * Get account state
   * Handles full orchestration: tracing, error logging, state management, and provider delegation
   */
  async getAccountState(options: {
    provider: IPerpsProvider;
    params?: GetAccountStateParams;
    context: ServiceContext;
  }): Promise<AccountState> {
    const { provider, params, context } = options;
    const traceId = uuidv4();
    let traceData: { success: boolean; error?: string } | undefined;

    try {
      this.deps.tracer.trace({
        name: PerpsTraceNames.GET_ACCOUNT_STATE,
        id: traceId,
        op: PerpsTraceOperations.OPERATION,
        tags: {
          provider: context.tracingContext.provider,
          isTestnet: String(context.tracingContext.isTestnet),
          source: params?.source || 'unknown',
        },
      });

      const accountState = await provider.getAccountState(params);

      // Safety check for accountState
      if (!accountState) {
        const error = new Error(
          'Failed to get account state: received null/undefined response',
        );

        this.deps.logger.error(ensureError(error), {
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
      this.deps.tracer.endTrace({
        name: PerpsTraceNames.GET_ACCOUNT_STATE,
        id: traceId,
        data: traceData,
      });
    }
  }

  /**
   * Get historical portfolio data
   * Handles full orchestration: tracing, error logging, state management, and provider delegation
   */
  async getHistoricalPortfolio(options: {
    provider: IPerpsProvider;
    params?: GetHistoricalPortfolioParams;
    context: ServiceContext;
  }): Promise<HistoricalPortfolioResult> {
    const { provider, params, context } = options;
    const traceId = uuidv4();
    let traceData: { success: boolean; error?: string } | undefined;

    try {
      this.deps.tracer.trace({
        name: PerpsTraceNames.GET_HISTORICAL_PORTFOLIO,
        id: traceId,
        op: PerpsTraceOperations.OPERATION,
        tags: {
          provider: context.tracingContext.provider,
          isTestnet: String(context.tracingContext.isTestnet),
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

      this.deps.logger.error(ensureError(error), {
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
      this.deps.tracer.endTrace({
        name: PerpsTraceNames.GET_HISTORICAL_PORTFOLIO,
        id: traceId,
        data: traceData,
      });
    }
  }

  /**
   * Get available markets
   * Handles full orchestration: tracing, error logging, state management, and provider delegation
   */
  async getMarkets(options: {
    provider: IPerpsProvider;
    params?: GetMarketsParams;
    context: ServiceContext;
  }): Promise<MarketInfo[]> {
    const { provider, params, context } = options;
    const traceId = uuidv4();
    let traceData: { success: boolean; error?: string } | undefined;

    try {
      this.deps.tracer.trace({
        name: PerpsTraceNames.GET_MARKETS,
        id: traceId,
        op: PerpsTraceOperations.OPERATION,
        tags: {
          provider: context.tracingContext.provider,
          isTestnet: String(context.tracingContext.isTestnet),
          ...(params?.symbols && {
            symbolCount: String(params.symbols.length),
          }),
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

      this.deps.logger.error(ensureError(error), {
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
      this.deps.tracer.endTrace({
        name: PerpsTraceNames.GET_MARKETS,
        id: traceId,
        data: traceData,
      });
    }
  }

  /**
   * Get available DEXs (HIP-3 support required)
   */
  async getAvailableDexs(options: {
    provider: IPerpsProvider;
    params?: GetAvailableDexsParams;
    context: ServiceContext;
  }): Promise<string[]> {
    const { provider, params } = options;

    try {
      if (!provider.getAvailableDexs) {
        throw new Error('Provider does not support HIP-3 DEXs');
      }

      return await provider.getAvailableDexs(params);
    } catch (error) {
      this.deps.logger.error(ensureError(error), {
        context: {
          name: 'MarketDataService.getAvailableDexs',
          data: { params },
        },
      });
      throw error;
    }
  }

  /**
   * Fetch historical candle data for charting
   * Handles full orchestration: tracing, error logging, state management, and provider delegation
   */
  async fetchHistoricalCandles(options: {
    provider: IPerpsProvider;
    symbol: string;
    interval: CandlePeriod;
    limit?: number;
    endTime?: number;
    context: ServiceContext;
  }): Promise<CandleData> {
    const {
      provider,
      symbol,
      interval,
      limit = 100,
      endTime,
      context,
    } = options;
    const traceId = uuidv4();
    let traceData: { success: boolean; error?: string } | undefined;

    try {
      this.deps.tracer.trace({
        name: PerpsTraceNames.FETCH_HISTORICAL_CANDLES,
        id: traceId,
        op: PerpsTraceOperations.OPERATION,
        tags: {
          provider: context.tracingContext.provider,
          isTestnet: String(context.tracingContext.isTestnet),
          symbol,
          interval,
        },
      });

      // Check if provider supports historical candles via clientService
      const hyperLiquidProvider = provider as {
        clientService?: {
          fetchHistoricalCandles?: (
            symbol: string,
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
          symbol,
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

      this.deps.logger.error(ensureError(error), {
        tags: {
          feature: 'perps',
          provider: context.tracingContext.provider,
          network: context.tracingContext.isTestnet ? 'testnet' : 'mainnet',
        },
        context: {
          name: context.errorContext.controller,
          data: {
            method: context.errorContext.method,
            symbol,
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
      this.deps.tracer.endTrace({
        name: PerpsTraceNames.FETCH_HISTORICAL_CANDLES,
        id: traceId,
        data: traceData,
      });
    }
  }

  /**
   * Calculate liquidation price for a position
   */
  async calculateLiquidationPrice(options: {
    provider: IPerpsProvider;
    params: LiquidationPriceParams;
    context: ServiceContext;
  }): Promise<string> {
    const { provider, params } = options;

    try {
      return await provider.calculateLiquidationPrice(params);
    } catch (error) {
      this.deps.logger.error(ensureError(error), {
        context: {
          name: 'MarketDataService.calculateLiquidationPrice',
          data: { params },
        },
      });
      throw error;
    }
  }

  /**
   * Calculate maintenance margin for a position
   */
  async calculateMaintenanceMargin(options: {
    provider: IPerpsProvider;
    params: MaintenanceMarginParams;
    context: ServiceContext;
  }): Promise<number> {
    const { provider, params } = options;

    try {
      return await provider.calculateMaintenanceMargin(params);
    } catch (error) {
      this.deps.logger.error(ensureError(error), {
        context: {
          name: 'MarketDataService.calculateMaintenanceMargin',
          data: { params },
        },
      });
      throw error;
    }
  }

  /**
   * Get maximum leverage for an asset
   */
  async getMaxLeverage(options: {
    provider: IPerpsProvider;
    asset: string;
    context: ServiceContext;
  }): Promise<number> {
    const { provider, asset } = options;

    try {
      return await provider.getMaxLeverage(asset);
    } catch (error) {
      this.deps.logger.error(ensureError(error), {
        context: {
          name: 'MarketDataService.getMaxLeverage',
          data: { asset },
        },
      });
      throw error;
    }
  }

  /**
   * Calculate fees for an order
   */
  async calculateFees(options: {
    provider: IPerpsProvider;
    params: FeeCalculationParams;
    context: ServiceContext;
  }): Promise<FeeCalculationResult> {
    const { provider, params } = options;

    try {
      return await provider.calculateFees(params);
    } catch (error) {
      this.deps.logger.error(ensureError(error), {
        context: {
          name: 'MarketDataService.calculateFees',
          data: { params },
        },
      });
      throw error;
    }
  }

  /**
   * Validate an order before placement
   */
  async validateOrder(options: {
    provider: IPerpsProvider;
    params: OrderParams;
    context: ServiceContext;
  }): Promise<{ isValid: boolean; error?: string }> {
    const { provider, params } = options;

    try {
      return await provider.validateOrder(params);
    } catch (error) {
      this.deps.logger.error(ensureError(error), {
        context: {
          name: 'MarketDataService.validateOrder',
          data: { params },
        },
      });
      throw error;
    }
  }

  /**
   * Validate a position close request
   */
  async validateClosePosition(options: {
    provider: IPerpsProvider;
    params: ClosePositionParams;
    context: ServiceContext;
  }): Promise<{ isValid: boolean; error?: string }> {
    const { provider, params } = options;

    try {
      return await provider.validateClosePosition(params);
    } catch (error) {
      this.deps.logger.error(ensureError(error), {
        context: {
          name: 'MarketDataService.validateClosePosition',
          data: { params },
        },
      });
      throw error;
    }
  }

  /**
   * Get supported withdrawal routes (synchronous)
   * Note: This method doesn't log errors to avoid needing context for a synchronous getter
   */
  getWithdrawalRoutes(options: { provider: IPerpsProvider }): AssetRoute[] {
    const { provider } = options;

    try {
      return provider.getWithdrawalRoutes();
    } catch {
      // Silent fail - withdrawal routes are not critical
      return [];
    }
  }

  /**
   * Get block explorer URL (synchronous)
   */
  getBlockExplorerUrl(options: {
    provider: IPerpsProvider;
    address?: string;
  }): string {
    const { provider, address } = options;
    return provider.getBlockExplorerUrl(address);
  }
}
