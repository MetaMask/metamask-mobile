import { MarketDataService } from './MarketDataService';
import {
  createMockServiceContext,
  createMockInfrastructure,
} from '../../__mocks__/serviceMocks';
import {
  createMockHyperLiquidProvider,
  createMockPosition,
  createMockOrder,
} from '../../__mocks__/providerMocks';
import type { ServiceContext } from './ServiceContext';
import type {
  PerpsProvider,
  Position,
  AccountState,
  Order,
  OrderFill,
  Funding,
  MarketInfo,
  FeeCalculationResult,
  FeeCalculationParams,
  AssetRoute,
  PerpsPlatformDependencies,
} from '../types';
import type { CandleData } from '../../types/perps-types';
import type { CandlePeriod } from '../../constants/chartConfig';

jest.mock('uuid', () => ({ v4: () => 'mock-trace-id' }));

describe('MarketDataService', () => {
  let mockProvider: jest.Mocked<PerpsProvider>;
  let mockContext: ServiceContext;
  let mockDeps: jest.Mocked<PerpsPlatformDependencies>;
  let marketDataService: MarketDataService;

  beforeEach(() => {
    mockProvider =
      createMockHyperLiquidProvider() as unknown as jest.Mocked<PerpsProvider>;
    mockDeps = createMockInfrastructure();
    marketDataService = new MarketDataService(mockDeps);
    mockContext = createMockServiceContext({
      errorContext: { controller: 'MarketDataService', method: 'test' },
    });
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('getPositions', () => {
    it('fetches and returns positions successfully', async () => {
      const mockPositions: Position[] = [createMockPosition()];
      mockProvider.getPositions.mockResolvedValue(mockPositions);

      const result = await marketDataService.getPositions({
        provider: mockProvider,
        context: mockContext,
      });

      expect(result).toEqual(mockPositions);
      expect(mockDeps.tracer.trace).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Perps Get Positions' }),
      );
      expect(mockDeps.tracer.endTrace).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Perps Get Positions',
          data: { success: true },
        }),
      );
      expect(mockContext.stateManager?.update).toHaveBeenCalled();
    });

    it('updates state with lastUpdateTimestamp on success', async () => {
      const mockPositions: Position[] = [createMockPosition()];
      mockProvider.getPositions.mockResolvedValue(mockPositions);

      await marketDataService.getPositions({
        provider: mockProvider,
        context: mockContext,
      });

      expect(mockContext.stateManager?.update).toHaveBeenCalledWith(
        expect.any(Function),
      );
    });

    it('handles errors and updates state', async () => {
      const mockError = new Error('Network error');
      mockProvider.getPositions.mockRejectedValue(mockError);

      await expect(
        marketDataService.getPositions({
          provider: mockProvider,
          context: mockContext,
        }),
      ).rejects.toThrow('Network error');

      expect(mockDeps.tracer.endTrace).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ success: false }),
        }),
      );
      expect(mockContext.stateManager?.update).toHaveBeenCalled();
    });

    it('works without stateManager', async () => {
      const mockPositions: Position[] = [createMockPosition()];
      mockProvider.getPositions.mockResolvedValue(mockPositions);
      const contextWithoutState = createMockServiceContext({
        errorContext: { controller: 'MarketDataService', method: 'test' },
        stateManager: undefined,
      });

      const result = await marketDataService.getPositions({
        provider: mockProvider,
        context: contextWithoutState,
      });

      expect(result).toEqual(mockPositions);
    });

    it('passes params to provider', async () => {
      const mockPositions: Position[] = [];
      mockProvider.getPositions.mockResolvedValue(mockPositions);
      const params = { skipCache: true };

      await marketDataService.getPositions({
        provider: mockProvider,
        params,
        context: mockContext,
      });

      expect(mockProvider.getPositions).toHaveBeenCalledWith(params);
    });

    it('handles provider exception during getPositions', async () => {
      const error = new Error('Network timeout');
      mockProvider.getPositions.mockRejectedValue(error);

      await expect(
        marketDataService.getPositions({
          provider: mockProvider,
          context: mockContext,
        }),
      ).rejects.toThrow('Network timeout');

      expect(mockContext.stateManager?.update).toHaveBeenCalled();
    });
  });

  describe('getOrderFills', () => {
    it('fetches and returns order fills successfully', async () => {
      const mockOrderFills: OrderFill[] = [
        {
          orderId: 'fill-1',
          symbol: 'BTC',
          side: 'buy',
          price: '50000',
          size: '0.1',
          pnl: '100',
          direction: 'long',
          fee: '5',
          feeToken: 'USDC',
          timestamp: Date.now(),
        },
      ];
      mockProvider.getOrderFills.mockResolvedValue(mockOrderFills);

      const result = await marketDataService.getOrderFills({
        provider: mockProvider,
        context: mockContext,
      });

      expect(result).toEqual(mockOrderFills);
      expect(mockDeps.tracer.trace).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Perps Order Fills Fetch' }),
      );
      expect(mockDeps.tracer.endTrace).toHaveBeenCalledWith(
        expect.objectContaining({ data: { success: true } }),
      );
    });

    it('handles errors and logs them', async () => {
      const mockError = new Error('API error');
      mockProvider.getOrderFills.mockRejectedValue(mockError);

      await expect(
        marketDataService.getOrderFills({
          provider: mockProvider,
          context: mockContext,
        }),
      ).rejects.toThrow('API error');

      expect(mockDeps.logger.error).toHaveBeenCalledWith(
        mockError,
        expect.objectContaining({
          tags: expect.objectContaining({ feature: 'perps' }),
        }),
      );
    });

    it('passes params to provider', async () => {
      mockProvider.getOrderFills.mockResolvedValue([]);
      const params = { startTime: Date.now() - 86400000, limit: 50 };

      await marketDataService.getOrderFills({
        provider: mockProvider,
        params,
        context: mockContext,
      });

      expect(mockProvider.getOrderFills).toHaveBeenCalledWith(params);
    });
  });

  describe('getOrders', () => {
    it('fetches and returns orders successfully', async () => {
      const mockOrders: Order[] = [createMockOrder()];
      mockProvider.getOrders.mockResolvedValue(mockOrders);

      const result = await marketDataService.getOrders({
        provider: mockProvider,
        context: mockContext,
      });

      expect(result).toEqual(mockOrders);
      expect(mockDeps.tracer.trace).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Perps Orders Fetch' }),
      );
      expect(mockDeps.tracer.endTrace).toHaveBeenCalledWith(
        expect.objectContaining({ data: { success: true } }),
      );
    });

    it('handles errors and logs them', async () => {
      const mockError = new Error('Failed to fetch orders');
      mockProvider.getOrders.mockRejectedValue(mockError);

      await expect(
        marketDataService.getOrders({
          provider: mockProvider,
          context: mockContext,
        }),
      ).rejects.toThrow('Failed to fetch orders');

      expect(mockDeps.logger.error).toHaveBeenCalled();
      expect(mockDeps.tracer.endTrace).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ success: false }),
        }),
      );
    });
  });

  describe('getOpenOrders', () => {
    it('fetches open orders successfully', async () => {
      const mockOrders: Order[] = [createMockOrder({ status: 'open' })];
      mockProvider.getOpenOrders.mockResolvedValue(mockOrders);

      const result = await marketDataService.getOpenOrders({
        provider: mockProvider,
        context: mockContext,
      });

      expect(result).toEqual(mockOrders);
      expect(mockDeps.tracer.trace).toHaveBeenCalled();
      expect(mockDeps.tracer.setMeasurement).toHaveBeenCalled();
    });

    it('handles errors in open orders fetch', async () => {
      const mockError = new Error('Connection timeout');
      mockProvider.getOpenOrders.mockRejectedValue(mockError);

      await expect(
        marketDataService.getOpenOrders({
          provider: mockProvider,
          context: mockContext,
        }),
      ).rejects.toThrow('Connection timeout');

      expect(mockDeps.logger.error).toHaveBeenCalled();
    });
  });

  describe('getFunding', () => {
    it('fetches funding rates successfully', async () => {
      const mockFunding: Funding[] = [
        {
          symbol: 'BTC',
          amountUsd: '10',
          rate: '0.0001',
          timestamp: Date.now(),
        },
      ];
      mockProvider.getFunding.mockResolvedValue(mockFunding);

      const result = await marketDataService.getFunding({
        provider: mockProvider,
        context: mockContext,
      });

      expect(result).toEqual(mockFunding);
      expect(mockDeps.tracer.trace).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Perps Funding Fetch' }),
      );
    });

    it('handles funding fetch errors', async () => {
      const mockError = new Error('Funding data unavailable');
      mockProvider.getFunding.mockRejectedValue(mockError);

      await expect(
        marketDataService.getFunding({
          provider: mockProvider,
          context: mockContext,
        }),
      ).rejects.toThrow('Funding data unavailable');

      expect(mockDeps.logger.error).toHaveBeenCalled();
    });
  });

  describe('getAccountState', () => {
    it('fetches account state and updates state', async () => {
      const mockAccountState: AccountState = {
        availableBalance: '10000',
        totalBalance: '15000',
        marginUsed: '5000',
        unrealizedPnl: '1000',
        returnOnEquity: '0.2',
      };
      mockProvider.getAccountState.mockResolvedValue(mockAccountState);

      const result = await marketDataService.getAccountState({
        provider: mockProvider,
        context: mockContext,
      });

      expect(result).toEqual(mockAccountState);
      expect(mockContext.stateManager?.update).toHaveBeenCalled();
      expect(mockDeps.tracer.trace).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Perps Get Account State' }),
      );
    });

    it('throws error when account state is null', async () => {
      mockProvider.getAccountState.mockResolvedValue(null as never);

      await expect(
        marketDataService.getAccountState({
          provider: mockProvider,
          context: mockContext,
        }),
      ).rejects.toThrow(
        'Failed to get account state: received null/undefined response',
      );

      expect(mockDeps.logger.error).toHaveBeenCalled();
    });

    it('handles errors and updates error state', async () => {
      const mockError = new Error('Account fetch failed');
      mockProvider.getAccountState.mockRejectedValue(mockError);

      await expect(
        marketDataService.getAccountState({
          provider: mockProvider,
          context: mockContext,
        }),
      ).rejects.toThrow('Account fetch failed');

      expect(mockContext.stateManager?.update).toHaveBeenCalled();
      expect(mockDeps.tracer.endTrace).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            success: false,
            error: 'Account fetch failed',
          }),
        }),
      );
    });

    it('passes source param in trace tags', async () => {
      const mockAccountState: AccountState = {
        availableBalance: '10000',
        totalBalance: '15000',
        marginUsed: '5000',
        unrealizedPnl: '1000',
        returnOnEquity: '0.2',
      };
      mockProvider.getAccountState.mockResolvedValue(mockAccountState);

      await marketDataService.getAccountState({
        provider: mockProvider,
        params: { source: 'user-action' },
        context: mockContext,
      });

      expect(mockDeps.tracer.trace).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: expect.objectContaining({ source: 'user-action' }),
        }),
      );
    });
  });

  describe('getHistoricalPortfolio', () => {
    it('fetches historical portfolio data successfully', async () => {
      const mockResult = {
        accountValue1dAgo: '9500',
        timestamp: Date.now(),
      };
      mockProvider.getHistoricalPortfolio.mockResolvedValue(mockResult);

      const result = await marketDataService.getHistoricalPortfolio({
        provider: mockProvider,
        context: mockContext,
      });

      expect(result).toEqual(mockResult);
      expect(mockDeps.tracer.trace).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Perps Get Historical Portfolio' }),
      );
    });

    it('throws error when provider does not support historical portfolio', async () => {
      const providerWithoutMethod = {
        ...mockProvider,
        getHistoricalPortfolio: undefined,
      };

      await expect(
        marketDataService.getHistoricalPortfolio({
          provider: providerWithoutMethod as never,
          context: mockContext,
        }),
      ).rejects.toThrow('Historical portfolio not supported by provider');
    });

    it('handles errors and updates error state', async () => {
      const mockError = new Error('Portfolio data error');
      mockProvider.getHistoricalPortfolio.mockRejectedValue(mockError);

      await expect(
        marketDataService.getHistoricalPortfolio({
          provider: mockProvider,
          context: mockContext,
        }),
      ).rejects.toThrow('Portfolio data error');

      expect(mockContext.stateManager?.update).toHaveBeenCalled();
      expect(mockDeps.logger.error).toHaveBeenCalled();
    });
  });

  describe('getMarkets', () => {
    it('fetches markets successfully', async () => {
      const mockMarkets: MarketInfo[] = [
        { name: 'BTC', szDecimals: 5, maxLeverage: 20, marginTableId: 1 },
        { name: 'ETH', szDecimals: 4, maxLeverage: 15, marginTableId: 2 },
      ];
      mockProvider.getMarkets.mockResolvedValue(mockMarkets);

      const result = await marketDataService.getMarkets({
        provider: mockProvider,
        context: mockContext,
      });

      expect(result).toEqual(mockMarkets);
      expect(mockContext.stateManager?.update).toHaveBeenCalled();
      expect(mockDeps.tracer.trace).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Perps Get Markets' }),
      );
    });

    it('includes symbol count in trace tags when symbols provided', async () => {
      mockProvider.getMarkets.mockResolvedValue([]);

      await marketDataService.getMarkets({
        provider: mockProvider,
        params: { symbols: ['BTC', 'ETH', 'SOL'] },
        context: mockContext,
      });

      expect(mockDeps.tracer.trace).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: expect.objectContaining({ symbolCount: '3' }),
        }),
      );
    });

    it('handles market fetch errors and updates state', async () => {
      const mockError = new Error('Markets unavailable');
      mockProvider.getMarkets.mockRejectedValue(mockError);

      await expect(
        marketDataService.getMarkets({
          provider: mockProvider,
          context: mockContext,
        }),
      ).rejects.toThrow('Markets unavailable');

      expect(mockContext.stateManager?.update).toHaveBeenCalled();
      expect(mockDeps.logger.error).toHaveBeenCalled();
    });
  });

  describe('getAvailableDexs', () => {
    it('fetches available DEXs when supported', async () => {
      const mockDexs = ['hyperliquid', 'vertex'];
      const providerWithDexs = {
        ...mockProvider,
        getAvailableDexs: jest.fn().mockResolvedValue(mockDexs),
      };

      const result = await marketDataService.getAvailableDexs({
        provider: providerWithDexs as never,
        context: mockContext,
      });

      expect(result).toEqual(mockDexs);
    });

    it('throws error when provider does not support HIP-3 DEXs', async () => {
      const providerWithoutDexs = {
        ...mockProvider,
        getAvailableDexs: undefined,
      };

      await expect(
        marketDataService.getAvailableDexs({
          provider: providerWithoutDexs as never,
          context: mockContext,
        }),
      ).rejects.toThrow('Provider does not support HIP-3 DEXs');

      expect(mockDeps.logger.error).toHaveBeenCalled();
    });
  });

  describe('calculateLiquidationPrice', () => {
    it('calculates liquidation price successfully', async () => {
      const params = {
        entryPrice: 50000,
        leverage: 10,
        direction: 'long' as const,
        positionSize: 0.5,
      };
      mockProvider.calculateLiquidationPrice.mockResolvedValue('45000');

      const result = await marketDataService.calculateLiquidationPrice({
        provider: mockProvider,
        params,
        context: mockContext,
      });

      expect(result).toBe('45000');
      expect(mockProvider.calculateLiquidationPrice).toHaveBeenCalledWith(
        params,
      );
    });

    it('handles calculation errors', async () => {
      const params = {
        entryPrice: 50000,
        leverage: 10,
        direction: 'long' as const,
        positionSize: 0.5,
      };
      const mockError = new Error('Calculation failed');
      mockProvider.calculateLiquidationPrice.mockRejectedValue(mockError);

      await expect(
        marketDataService.calculateLiquidationPrice({
          provider: mockProvider,
          params,
          context: mockContext,
        }),
      ).rejects.toThrow('Calculation failed');

      expect(mockDeps.logger.error).toHaveBeenCalled();
    });
  });

  describe('calculateMaintenanceMargin', () => {
    it('calculates maintenance margin successfully', async () => {
      const params = {
        asset: 'BTC',
        positionSize: 0.5,
      };
      mockProvider.calculateMaintenanceMargin.mockResolvedValue(500);

      const result = await marketDataService.calculateMaintenanceMargin({
        provider: mockProvider,
        params,
        context: mockContext,
      });

      expect(result).toBe(500);
    });

    it('handles maintenance margin errors', async () => {
      const params = {
        asset: 'BTC',
        positionSize: 0.5,
      };
      const mockError = new Error('Margin calculation error');
      mockProvider.calculateMaintenanceMargin.mockRejectedValue(mockError);

      await expect(
        marketDataService.calculateMaintenanceMargin({
          provider: mockProvider,
          params,
          context: mockContext,
        }),
      ).rejects.toThrow('Margin calculation error');

      expect(mockDeps.logger.error).toHaveBeenCalled();
    });
  });

  describe('getMaxLeverage', () => {
    it('fetches max leverage for asset', async () => {
      mockProvider.getMaxLeverage.mockResolvedValue(20);

      const result = await marketDataService.getMaxLeverage({
        provider: mockProvider,
        asset: 'BTC',
        context: mockContext,
      });

      expect(result).toBe(20);
      expect(mockProvider.getMaxLeverage).toHaveBeenCalledWith('BTC');
    });

    it('handles max leverage errors', async () => {
      const mockError = new Error('Asset not found');
      mockProvider.getMaxLeverage.mockRejectedValue(mockError);

      await expect(
        marketDataService.getMaxLeverage({
          provider: mockProvider,
          asset: 'INVALID',
          context: mockContext,
        }),
      ).rejects.toThrow('Asset not found');

      expect(mockDeps.logger.error).toHaveBeenCalled();
    });
  });

  describe('calculateFees', () => {
    it('calculates fees successfully', async () => {
      const params: FeeCalculationParams = {
        orderType: 'market',
        symbol: 'BTC',
        amount: '0.1',
        isMaker: false,
      };
      const mockFees: FeeCalculationResult = {
        feeRate: 0.0005,
        feeAmount: 2.5,
        protocolFeeRate: 0.0003,
        protocolFeeAmount: 1.5,
        metamaskFeeRate: 0.0002,
      };
      mockProvider.calculateFees.mockResolvedValue(mockFees);

      const result = await marketDataService.calculateFees({
        provider: mockProvider,
        params,
        context: mockContext,
      });

      expect(result).toEqual(mockFees);
    });

    it('handles fee calculation errors', async () => {
      const params: FeeCalculationParams = {
        orderType: 'limit',
        symbol: 'BTC',
        amount: '0.1',
        isMaker: true,
      };
      const mockError = new Error('Fee calculation failed');
      mockProvider.calculateFees.mockRejectedValue(mockError);

      await expect(
        marketDataService.calculateFees({
          provider: mockProvider,
          params,
          context: mockContext,
        }),
      ).rejects.toThrow('Fee calculation failed');

      expect(mockDeps.logger.error).toHaveBeenCalled();
    });
  });

  describe('validateOrder', () => {
    it('validates order successfully', async () => {
      const params = {
        symbol: 'BTC',
        isBuy: true,
        size: '0.1',
        orderType: 'market' as const,
      };
      const mockResult = { isValid: true };
      mockProvider.validateOrder.mockResolvedValue(mockResult);

      const result = await marketDataService.validateOrder({
        provider: mockProvider,
        params,
        context: mockContext,
      });

      expect(result).toEqual(mockResult);
    });

    it('returns validation error when order invalid', async () => {
      const params = {
        symbol: 'BTC',
        isBuy: true,
        size: '0.001',
        orderType: 'market' as const,
      };
      const mockResult = { isValid: false, error: 'Size too small' };
      mockProvider.validateOrder.mockResolvedValue(mockResult);

      const result = await marketDataService.validateOrder({
        provider: mockProvider,
        params,
        context: mockContext,
      });

      expect(result).toEqual(mockResult);
    });

    it('handles validation errors', async () => {
      const params = {
        symbol: 'BTC',
        isBuy: true,
        size: '0.1',
        orderType: 'market' as const,
      };
      const mockError = new Error('Validation service unavailable');
      mockProvider.validateOrder.mockRejectedValue(mockError);

      await expect(
        marketDataService.validateOrder({
          provider: mockProvider,
          params,
          context: mockContext,
        }),
      ).rejects.toThrow('Validation service unavailable');

      expect(mockDeps.logger.error).toHaveBeenCalled();
    });
  });

  describe('validateClosePosition', () => {
    it('validates close position request', async () => {
      const params = {
        symbol: 'BTC',
        size: '0.5',
      };
      const mockResult = { isValid: true };
      mockProvider.validateClosePosition.mockResolvedValue(mockResult);

      const result = await marketDataService.validateClosePosition({
        provider: mockProvider,
        params,
        context: mockContext,
      });

      expect(result).toEqual(mockResult);
    });

    it('returns error when close position invalid', async () => {
      const params = {
        symbol: 'BTC',
        size: '10',
      };
      const mockResult = { isValid: false, error: 'Position size mismatch' };
      mockProvider.validateClosePosition.mockResolvedValue(mockResult);

      const result = await marketDataService.validateClosePosition({
        provider: mockProvider,
        params,
        context: mockContext,
      });

      expect(result).toEqual(mockResult);
    });
  });

  describe('getWithdrawalRoutes', () => {
    it('fetches withdrawal routes successfully', () => {
      const mockRoutes: AssetRoute[] = [
        {
          assetId:
            'eip155:42161/erc20:0xaf88d065e77c8cC2239327C5EDb3A432268e5831/default',
          chainId: 'eip155:42161',
          contractAddress: '0xBridgeAddress',
          constraints: { minAmount: '10' },
        },
      ];
      mockProvider.getWithdrawalRoutes.mockReturnValue(mockRoutes);

      const result = marketDataService.getWithdrawalRoutes({
        provider: mockProvider,
      });

      expect(result).toEqual(mockRoutes);
    });

    it('returns empty array on error', () => {
      mockProvider.getWithdrawalRoutes.mockImplementation(() => {
        throw new Error('Routes unavailable');
      });

      const result = marketDataService.getWithdrawalRoutes({
        provider: mockProvider,
      });

      // Silent fail - withdrawal routes are not critical
      expect(result).toEqual([]);
    });
  });

  describe('getBlockExplorerUrl', () => {
    it('returns block explorer URL without address', () => {
      mockProvider.getBlockExplorerUrl.mockReturnValue(
        'https://explorer.example.com',
      );

      const result = marketDataService.getBlockExplorerUrl({
        provider: mockProvider,
      });

      expect(result).toBe('https://explorer.example.com');
    });

    it('returns block explorer URL with address', () => {
      const address = '0x1234';
      mockProvider.getBlockExplorerUrl.mockReturnValue(
        `https://explorer.example.com/address/${address}`,
      );

      const result = marketDataService.getBlockExplorerUrl({
        provider: mockProvider,
        address,
      });

      expect(result).toBe(`https://explorer.example.com/address/${address}`);
      expect(mockProvider.getBlockExplorerUrl).toHaveBeenCalledWith(address);
    });
  });

  describe('fetchHistoricalCandles', () => {
    const mockCandleData: CandleData = {
      symbol: 'BTC',
      interval: '1h' as CandlePeriod,
      candles: [
        {
          time: 1700000000,
          open: '50000',
          high: '51000',
          low: '49500',
          close: '50500',
          volume: '1000',
        },
      ],
    };

    it('fetches historical candles successfully', async () => {
      const hyperLiquidProvider = mockProvider as unknown as {
        clientService: {
          fetchHistoricalCandles: jest.Mock;
        };
      };
      hyperLiquidProvider.clientService = {
        fetchHistoricalCandles: jest.fn().mockResolvedValue(mockCandleData),
      };

      const result = await marketDataService.fetchHistoricalCandles({
        provider: mockProvider,
        symbol: 'BTC',
        interval: '1h' as CandlePeriod,
        limit: 100,
        context: mockContext,
      });

      expect(result).toEqual(mockCandleData);
      expect(
        hyperLiquidProvider.clientService.fetchHistoricalCandles,
      ).toHaveBeenCalledWith('BTC', '1h', 100, undefined);
      expect(mockDeps.tracer.trace).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Perps Fetch Historical Candles' }),
      );
      expect(mockDeps.tracer.endTrace).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Perps Fetch Historical Candles',
          data: { success: true },
        }),
      );
    });

    it('throws error when provider lacks clientService support', async () => {
      const providerWithoutClient = { ...mockProvider };

      await expect(
        marketDataService.fetchHistoricalCandles({
          provider: providerWithoutClient,
          symbol: 'BTC',
          interval: '1h' as CandlePeriod,
          context: mockContext,
        }),
      ).rejects.toThrow('Historical candles not supported by provider');

      expect(mockDeps.logger.error).toHaveBeenCalled();
      expect(mockDeps.tracer.endTrace).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ success: false }),
        }),
      );
    });

    it('updates error state on failure', async () => {
      const hyperLiquidProvider = mockProvider as unknown as {
        clientService: {
          fetchHistoricalCandles: jest.Mock;
        };
      };
      const mockError = new Error('Network timeout');
      hyperLiquidProvider.clientService = {
        fetchHistoricalCandles: jest.fn().mockRejectedValue(mockError),
      };

      await expect(
        marketDataService.fetchHistoricalCandles({
          provider: mockProvider,
          symbol: 'BTC',
          interval: '1h' as CandlePeriod,
          context: mockContext,
        }),
      ).rejects.toThrow('Network timeout');

      expect(mockContext.stateManager?.update).toHaveBeenCalled();
    });
  });
});
