import { MarketDataService } from './MarketDataService';
import { createMockServiceContext } from '../../__mocks__/serviceMocks';
import {
  createMockHyperLiquidProvider,
  createMockPosition,
  createMockOrder,
} from '../../__mocks__/providerMocks';
import { trace, endTrace } from '../../../../../util/trace';
import Logger from '../../../../../util/Logger';
import { setMeasurement } from '@sentry/react-native';
import type { ServiceContext } from './ServiceContext';
import type {
  IPerpsProvider,
  Position,
  AccountState,
  Order,
  OrderFill,
  Funding,
  MarketInfo,
  FeeCalculationResult,
  FeeCalculationParams,
  AssetRoute,
} from '../types';
import type { CandleData } from '../../types/perps-types';
import type { CandlePeriod } from '../../constants/chartConfig';

jest.mock('../../../../../util/trace');
jest.mock('../../../../../util/Logger');
jest.mock('@sentry/react-native');
jest.mock('uuid', () => ({ v4: () => 'mock-trace-id' }));
jest.mock('react-native-performance', () => ({
  now: jest.fn(() => 1000),
}));

describe('MarketDataService', () => {
  let mockProvider: jest.Mocked<IPerpsProvider>;
  let mockContext: ServiceContext;

  beforeEach(() => {
    mockProvider =
      createMockHyperLiquidProvider() as unknown as jest.Mocked<IPerpsProvider>;
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

      const result = await MarketDataService.getPositions({
        provider: mockProvider,
        context: mockContext,
      });

      expect(result).toEqual(mockPositions);
      expect(trace).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Perps Get Positions' }),
      );
      expect(endTrace).toHaveBeenCalledWith(
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

      await MarketDataService.getPositions({
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
        MarketDataService.getPositions({
          provider: mockProvider,
          context: mockContext,
        }),
      ).rejects.toThrow('Network error');

      expect(endTrace).toHaveBeenCalledWith(
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

      const result = await MarketDataService.getPositions({
        provider: mockProvider,
        context: contextWithoutState,
      });

      expect(result).toEqual(mockPositions);
    });

    it('passes params to provider', async () => {
      const mockPositions: Position[] = [];
      mockProvider.getPositions.mockResolvedValue(mockPositions);
      const params = { skipCache: true };

      await MarketDataService.getPositions({
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
        MarketDataService.getPositions({
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

      const result = await MarketDataService.getOrderFills({
        provider: mockProvider,
        context: mockContext,
      });

      expect(result).toEqual(mockOrderFills);
      expect(trace).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Perps Order Fills Fetch' }),
      );
      expect(endTrace).toHaveBeenCalledWith(
        expect.objectContaining({ data: { success: true } }),
      );
    });

    it('handles errors and logs them', async () => {
      const mockError = new Error('API error');
      mockProvider.getOrderFills.mockRejectedValue(mockError);

      await expect(
        MarketDataService.getOrderFills({
          provider: mockProvider,
          context: mockContext,
        }),
      ).rejects.toThrow('API error');

      expect(Logger.error).toHaveBeenCalledWith(
        mockError,
        expect.objectContaining({
          tags: expect.objectContaining({ feature: 'perps' }),
        }),
      );
    });

    it('passes params to provider', async () => {
      mockProvider.getOrderFills.mockResolvedValue([]);
      const params = { startTime: Date.now() - 86400000, limit: 50 };

      await MarketDataService.getOrderFills({
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

      const result = await MarketDataService.getOrders({
        provider: mockProvider,
        context: mockContext,
      });

      expect(result).toEqual(mockOrders);
      expect(trace).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Perps Orders Fetch' }),
      );
      expect(endTrace).toHaveBeenCalledWith(
        expect.objectContaining({ data: { success: true } }),
      );
    });

    it('handles errors and logs them', async () => {
      const mockError = new Error('Failed to fetch orders');
      mockProvider.getOrders.mockRejectedValue(mockError);

      await expect(
        MarketDataService.getOrders({
          provider: mockProvider,
          context: mockContext,
        }),
      ).rejects.toThrow('Failed to fetch orders');

      expect(Logger.error).toHaveBeenCalled();
      expect(endTrace).toHaveBeenCalledWith(
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

      const result = await MarketDataService.getOpenOrders({
        provider: mockProvider,
        context: mockContext,
      });

      expect(result).toEqual(mockOrders);
      expect(trace).toHaveBeenCalled();
      expect(setMeasurement).toHaveBeenCalled();
    });

    it('handles errors in open orders fetch', async () => {
      const mockError = new Error('Connection timeout');
      mockProvider.getOpenOrders.mockRejectedValue(mockError);

      await expect(
        MarketDataService.getOpenOrders({
          provider: mockProvider,
          context: mockContext,
        }),
      ).rejects.toThrow('Connection timeout');

      expect(Logger.error).toHaveBeenCalled();
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

      const result = await MarketDataService.getFunding({
        provider: mockProvider,
        context: mockContext,
      });

      expect(result).toEqual(mockFunding);
      expect(trace).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Perps Funding Fetch' }),
      );
    });

    it('handles funding fetch errors', async () => {
      const mockError = new Error('Funding data unavailable');
      mockProvider.getFunding.mockRejectedValue(mockError);

      await expect(
        MarketDataService.getFunding({
          provider: mockProvider,
          context: mockContext,
        }),
      ).rejects.toThrow('Funding data unavailable');

      expect(Logger.error).toHaveBeenCalled();
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

      const result = await MarketDataService.getAccountState({
        provider: mockProvider,
        context: mockContext,
      });

      expect(result).toEqual(mockAccountState);
      expect(mockContext.stateManager?.update).toHaveBeenCalled();
      expect(trace).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Perps Get Account State' }),
      );
    });

    it('throws error when account state is null', async () => {
      mockProvider.getAccountState.mockResolvedValue(null as never);

      await expect(
        MarketDataService.getAccountState({
          provider: mockProvider,
          context: mockContext,
        }),
      ).rejects.toThrow(
        'Failed to get account state: received null/undefined response',
      );

      expect(Logger.error).toHaveBeenCalled();
    });

    it('handles errors and updates error state', async () => {
      const mockError = new Error('Account fetch failed');
      mockProvider.getAccountState.mockRejectedValue(mockError);

      await expect(
        MarketDataService.getAccountState({
          provider: mockProvider,
          context: mockContext,
        }),
      ).rejects.toThrow('Account fetch failed');

      expect(mockContext.stateManager?.update).toHaveBeenCalled();
      expect(endTrace).toHaveBeenCalledWith(
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

      await MarketDataService.getAccountState({
        provider: mockProvider,
        params: { source: 'user-action' },
        context: mockContext,
      });

      expect(trace).toHaveBeenCalledWith(
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

      const result = await MarketDataService.getHistoricalPortfolio({
        provider: mockProvider,
        context: mockContext,
      });

      expect(result).toEqual(mockResult);
      expect(trace).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Perps Get Historical Portfolio' }),
      );
    });

    it('throws error when provider does not support historical portfolio', async () => {
      const providerWithoutMethod = {
        ...mockProvider,
        getHistoricalPortfolio: undefined,
      };

      await expect(
        MarketDataService.getHistoricalPortfolio({
          provider: providerWithoutMethod as never,
          context: mockContext,
        }),
      ).rejects.toThrow('Historical portfolio not supported by provider');
    });

    it('handles errors and updates error state', async () => {
      const mockError = new Error('Portfolio data error');
      mockProvider.getHistoricalPortfolio.mockRejectedValue(mockError);

      await expect(
        MarketDataService.getHistoricalPortfolio({
          provider: mockProvider,
          context: mockContext,
        }),
      ).rejects.toThrow('Portfolio data error');

      expect(mockContext.stateManager?.update).toHaveBeenCalled();
      expect(Logger.error).toHaveBeenCalled();
    });
  });

  describe('getMarkets', () => {
    it('fetches markets successfully', async () => {
      const mockMarkets: MarketInfo[] = [
        { name: 'BTC', szDecimals: 5, maxLeverage: 20, marginTableId: 1 },
        { name: 'ETH', szDecimals: 4, maxLeverage: 15, marginTableId: 2 },
      ];
      mockProvider.getMarkets.mockResolvedValue(mockMarkets);

      const result = await MarketDataService.getMarkets({
        provider: mockProvider,
        context: mockContext,
      });

      expect(result).toEqual(mockMarkets);
      expect(mockContext.stateManager?.update).toHaveBeenCalled();
      expect(trace).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Perps Get Markets' }),
      );
    });

    it('includes symbol count in trace tags when symbols provided', async () => {
      mockProvider.getMarkets.mockResolvedValue([]);

      await MarketDataService.getMarkets({
        provider: mockProvider,
        params: { symbols: ['BTC', 'ETH', 'SOL'] },
        context: mockContext,
      });

      expect(trace).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: expect.objectContaining({ symbolCount: 3 }),
        }),
      );
    });

    it('handles market fetch errors and updates state', async () => {
      const mockError = new Error('Markets unavailable');
      mockProvider.getMarkets.mockRejectedValue(mockError);

      await expect(
        MarketDataService.getMarkets({
          provider: mockProvider,
          context: mockContext,
        }),
      ).rejects.toThrow('Markets unavailable');

      expect(mockContext.stateManager?.update).toHaveBeenCalled();
      expect(Logger.error).toHaveBeenCalled();
    });
  });

  describe('getAvailableDexs', () => {
    it('fetches available DEXs when supported', async () => {
      const mockDexs = ['hyperliquid', 'vertex'];
      const providerWithDexs = {
        ...mockProvider,
        getAvailableDexs: jest.fn().mockResolvedValue(mockDexs),
      };

      const result = await MarketDataService.getAvailableDexs({
        provider: providerWithDexs as never,
      });

      expect(result).toEqual(mockDexs);
    });

    it('throws error when provider does not support HIP-3 DEXs', async () => {
      const providerWithoutDexs = {
        ...mockProvider,
        getAvailableDexs: undefined,
      };

      await expect(
        MarketDataService.getAvailableDexs({
          provider: providerWithoutDexs as never,
        }),
      ).rejects.toThrow('Provider does not support HIP-3 DEXs');

      expect(Logger.error).toHaveBeenCalled();
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

      const result = await MarketDataService.calculateLiquidationPrice({
        provider: mockProvider,
        params,
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
        MarketDataService.calculateLiquidationPrice({
          provider: mockProvider,
          params,
        }),
      ).rejects.toThrow('Calculation failed');

      expect(Logger.error).toHaveBeenCalled();
    });
  });

  describe('calculateMaintenanceMargin', () => {
    it('calculates maintenance margin successfully', async () => {
      const params = {
        asset: 'BTC',
        positionSize: 0.5,
      };
      mockProvider.calculateMaintenanceMargin.mockResolvedValue(500);

      const result = await MarketDataService.calculateMaintenanceMargin({
        provider: mockProvider,
        params,
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
        MarketDataService.calculateMaintenanceMargin({
          provider: mockProvider,
          params,
        }),
      ).rejects.toThrow('Margin calculation error');

      expect(Logger.error).toHaveBeenCalled();
    });
  });

  describe('getMaxLeverage', () => {
    it('fetches max leverage for asset', async () => {
      mockProvider.getMaxLeverage.mockResolvedValue(20);

      const result = await MarketDataService.getMaxLeverage({
        provider: mockProvider,
        asset: 'BTC',
      });

      expect(result).toBe(20);
      expect(mockProvider.getMaxLeverage).toHaveBeenCalledWith('BTC');
    });

    it('handles max leverage errors', async () => {
      const mockError = new Error('Asset not found');
      mockProvider.getMaxLeverage.mockRejectedValue(mockError);

      await expect(
        MarketDataService.getMaxLeverage({
          provider: mockProvider,
          asset: 'INVALID',
        }),
      ).rejects.toThrow('Asset not found');

      expect(Logger.error).toHaveBeenCalled();
    });
  });

  describe('calculateFees', () => {
    it('calculates fees successfully', async () => {
      const params: FeeCalculationParams = {
        orderType: 'market',
        coin: 'BTC',
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

      const result = await MarketDataService.calculateFees({
        provider: mockProvider,
        params,
      });

      expect(result).toEqual(mockFees);
    });

    it('handles fee calculation errors', async () => {
      const params: FeeCalculationParams = {
        orderType: 'limit',
        coin: 'BTC',
        amount: '0.1',
        isMaker: true,
      };
      const mockError = new Error('Fee calculation failed');
      mockProvider.calculateFees.mockRejectedValue(mockError);

      await expect(
        MarketDataService.calculateFees({
          provider: mockProvider,
          params,
        }),
      ).rejects.toThrow('Fee calculation failed');

      expect(Logger.error).toHaveBeenCalled();
    });
  });

  describe('validateOrder', () => {
    it('validates order successfully', async () => {
      const params = {
        coin: 'BTC',
        isBuy: true,
        size: '0.1',
        orderType: 'market' as const,
      };
      const mockResult = { isValid: true };
      mockProvider.validateOrder.mockResolvedValue(mockResult);

      const result = await MarketDataService.validateOrder({
        provider: mockProvider,
        params,
      });

      expect(result).toEqual(mockResult);
    });

    it('returns validation error when order invalid', async () => {
      const params = {
        coin: 'BTC',
        isBuy: true,
        size: '0.001',
        orderType: 'market' as const,
      };
      const mockResult = { isValid: false, error: 'Size too small' };
      mockProvider.validateOrder.mockResolvedValue(mockResult);

      const result = await MarketDataService.validateOrder({
        provider: mockProvider,
        params,
      });

      expect(result).toEqual(mockResult);
    });

    it('handles validation errors', async () => {
      const params = {
        coin: 'BTC',
        isBuy: true,
        size: '0.1',
        orderType: 'market' as const,
      };
      const mockError = new Error('Validation service unavailable');
      mockProvider.validateOrder.mockRejectedValue(mockError);

      await expect(
        MarketDataService.validateOrder({
          provider: mockProvider,
          params,
        }),
      ).rejects.toThrow('Validation service unavailable');

      expect(Logger.error).toHaveBeenCalled();
    });
  });

  describe('validateClosePosition', () => {
    it('validates close position request', async () => {
      const params = {
        coin: 'BTC',
        size: '0.5',
      };
      const mockResult = { isValid: true };
      mockProvider.validateClosePosition.mockResolvedValue(mockResult);

      const result = await MarketDataService.validateClosePosition({
        provider: mockProvider,
        params,
      });

      expect(result).toEqual(mockResult);
    });

    it('returns error when close position invalid', async () => {
      const params = {
        coin: 'BTC',
        size: '10',
      };
      const mockResult = { isValid: false, error: 'Position size mismatch' };
      mockProvider.validateClosePosition.mockResolvedValue(mockResult);

      const result = await MarketDataService.validateClosePosition({
        provider: mockProvider,
        params,
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

      const result = MarketDataService.getWithdrawalRoutes({
        provider: mockProvider,
      });

      expect(result).toEqual(mockRoutes);
    });

    it('returns empty array on error', () => {
      mockProvider.getWithdrawalRoutes.mockImplementation(() => {
        throw new Error('Routes unavailable');
      });

      const result = MarketDataService.getWithdrawalRoutes({
        provider: mockProvider,
      });

      expect(result).toEqual([]);
      expect(Logger.error).toHaveBeenCalled();
    });
  });

  describe('getBlockExplorerUrl', () => {
    it('returns block explorer URL without address', () => {
      mockProvider.getBlockExplorerUrl.mockReturnValue(
        'https://explorer.example.com',
      );

      const result = MarketDataService.getBlockExplorerUrl({
        provider: mockProvider,
      });

      expect(result).toBe('https://explorer.example.com');
    });

    it('returns block explorer URL with address', () => {
      const address = '0x1234';
      mockProvider.getBlockExplorerUrl.mockReturnValue(
        `https://explorer.example.com/address/${address}`,
      );

      const result = MarketDataService.getBlockExplorerUrl({
        provider: mockProvider,
        address,
      });

      expect(result).toBe(`https://explorer.example.com/address/${address}`);
      expect(mockProvider.getBlockExplorerUrl).toHaveBeenCalledWith(address);
    });
  });

  describe('fetchHistoricalCandles', () => {
    const mockCandleData: CandleData = {
      coin: 'BTC',
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

      const result = await MarketDataService.fetchHistoricalCandles({
        provider: mockProvider,
        coin: 'BTC',
        interval: '1h' as CandlePeriod,
        limit: 100,
        context: mockContext,
      });

      expect(result).toEqual(mockCandleData);
      expect(
        hyperLiquidProvider.clientService.fetchHistoricalCandles,
      ).toHaveBeenCalledWith('BTC', '1h', 100, undefined);
      expect(trace).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Perps Fetch Historical Candles' }),
      );
      expect(endTrace).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Perps Fetch Historical Candles',
          data: { success: true },
        }),
      );
    });

    it('throws error when provider lacks clientService support', async () => {
      const providerWithoutClient = { ...mockProvider };

      await expect(
        MarketDataService.fetchHistoricalCandles({
          provider: providerWithoutClient,
          coin: 'BTC',
          interval: '1h' as CandlePeriod,
          context: mockContext,
        }),
      ).rejects.toThrow('Historical candles not supported by provider');

      expect(Logger.error).toHaveBeenCalled();
      expect(endTrace).toHaveBeenCalledWith(
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
        MarketDataService.fetchHistoricalCandles({
          provider: mockProvider,
          coin: 'BTC',
          interval: '1h' as CandlePeriod,
          context: mockContext,
        }),
      ).rejects.toThrow('Network timeout');

      expect(mockContext.stateManager?.update).toHaveBeenCalled();
    });
  });
});
