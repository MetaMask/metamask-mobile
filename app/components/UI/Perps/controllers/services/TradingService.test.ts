import { TradingService } from './TradingService';
import type { ServiceContext } from './ServiceContext';
import type {
  IPerpsProvider,
  OrderParams,
  OrderResult,
  EditOrderParams,
  CancelOrderParams,
  CancelOrdersParams,
  ClosePositionParams,
  ClosePositionsParams,
  Position,
  Order,
  UpdatePositionTPSLParams,
} from '../types';
import { RewardsIntegrationService } from './RewardsIntegrationService';
import Logger from '../../../../../util/Logger';
import { trace, endTrace } from '../../../../../util/trace';
import {
  createMockServiceContext,
  createMockPerpsControllerState,
} from '../../__mocks__/serviceMocks';
import { createMockHyperLiquidProvider } from '../../__mocks__/providerMocks';

jest.mock('../../../../../util/Logger');
jest.mock('../../../../../core/SDKConnect/utils/DevLogger');
jest.mock('../../../../../util/trace');
jest.mock('@sentry/react-native');
jest.mock('./RewardsIntegrationService');
jest.mock('uuid', () => ({ v4: () => 'mock-trace-id' }));
jest.mock('react-native-performance', () => ({
  now: jest.fn(() => 1000),
}));

describe('TradingService', () => {
  let mockProvider: jest.Mocked<IPerpsProvider>;
  let mockContext: ServiceContext;
  let mockReportOrderToDataLake: jest.Mock;
  let mockWithStreamPause: jest.Mock;
  let mockGetPositions: jest.Mock;
  let mockGetOpenOrders: jest.Mock;
  let mockSaveTradeConfiguration: jest.Mock;

  const createContextWithRewards = (): ServiceContext =>
    createMockServiceContext({
      errorContext: { controller: 'TradingService', method: 'test' },
      stateManager: {
        update: jest.fn(),
        getState: jest.fn(() => createMockPerpsControllerState()),
      },
      rewardsController: {} as never,
      networkController: {} as never,
      messenger: {} as never,
    });

  beforeEach(() => {
    mockProvider =
      createMockHyperLiquidProvider() as unknown as jest.Mocked<IPerpsProvider>;
    mockSaveTradeConfiguration = jest.fn();
    mockContext = createMockServiceContext({
      errorContext: { controller: 'TradingService', method: 'test' },
      stateManager: {
        update: jest.fn(),
        getState: jest.fn(() => createMockPerpsControllerState()),
      },
      saveTradeConfiguration: mockSaveTradeConfiguration,
    });
    mockReportOrderToDataLake = jest.fn().mockResolvedValue(undefined);
    mockWithStreamPause = jest.fn(async (callback) => await callback());
    mockGetPositions = jest.fn().mockResolvedValue([]);
    mockGetOpenOrders = jest.fn().mockResolvedValue([]);

    jest.clearAllMocks();
    (trace as jest.Mock).mockReturnValue(undefined);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('placeOrder', () => {
    it('places order successfully without fee discount', async () => {
      const orderParams: OrderParams = {
        coin: 'BTC',
        isBuy: true,
        size: '0.1',
        orderType: 'market',
      };
      const mockOrderResult: OrderResult = {
        success: true,
        orderId: 'order-123',
        filledSize: '0.1',
        averagePrice: '50000',
      };

      mockProvider.placeOrder.mockResolvedValue(mockOrderResult);
      (
        RewardsIntegrationService.calculateUserFeeDiscount as jest.Mock
      ).mockResolvedValue(undefined);

      const result = await TradingService.placeOrder({
        provider: mockProvider,
        params: orderParams,
        context: mockContext,
        reportOrderToDataLake: mockReportOrderToDataLake,
      });

      expect(result).toEqual(mockOrderResult);
      expect(mockProvider.placeOrder).toHaveBeenCalledWith(orderParams);
      expect(mockProvider.setUserFeeDiscount).toHaveBeenCalledWith(undefined);
    });

    it('places order successfully with fee discount applied and cleared', async () => {
      const orderParams: OrderParams = {
        coin: 'BTC',
        isBuy: true,
        size: '0.1',
        orderType: 'market',
        leverage: 10,
      };
      const mockOrderResult: OrderResult = {
        success: true,
        orderId: 'order-123',
        filledSize: '0.1',
        averagePrice: '50000',
      };
      const contextWithRewards = createContextWithRewards();

      mockProvider.placeOrder.mockResolvedValue(mockOrderResult);
      (
        RewardsIntegrationService.calculateUserFeeDiscount as jest.Mock
      ).mockResolvedValue(6500);

      const result = await TradingService.placeOrder({
        provider: mockProvider,
        params: orderParams,
        context: contextWithRewards,
        reportOrderToDataLake: mockReportOrderToDataLake,
      });

      expect(result).toEqual(mockOrderResult);
      expect(mockProvider.setUserFeeDiscount).toHaveBeenCalledWith(6500);
      expect(mockProvider.placeOrder).toHaveBeenCalledWith(orderParams);
      expect(mockProvider.setUserFeeDiscount).toHaveBeenLastCalledWith(
        undefined,
      );
    });

    it('clears fee discount when order placement fails', async () => {
      const orderParams: OrderParams = {
        coin: 'BTC',
        isBuy: true,
        size: '0.1',
        orderType: 'market',
      };
      const contextWithRewards = createContextWithRewards();

      mockProvider.placeOrder.mockRejectedValue(
        new Error('Order placement failed'),
      );
      (
        RewardsIntegrationService.calculateUserFeeDiscount as jest.Mock
      ).mockResolvedValue(6500);

      await expect(
        TradingService.placeOrder({
          provider: mockProvider,
          params: orderParams,
          context: contextWithRewards,
          reportOrderToDataLake: mockReportOrderToDataLake,
        }),
      ).rejects.toThrow('Order placement failed');

      expect(mockProvider.setUserFeeDiscount).toHaveBeenCalledWith(6500);
      expect(mockProvider.setUserFeeDiscount).toHaveBeenLastCalledWith(
        undefined,
      );
    });

    it('adds and removes order from pending state optimistically', async () => {
      const orderParams: OrderParams = {
        coin: 'BTC',
        isBuy: true,
        size: '0.1',
        orderType: 'market',
      };
      const mockOrderResult: OrderResult = {
        success: true,
        orderId: 'order-123',
      };

      mockProvider.placeOrder.mockResolvedValue(mockOrderResult);
      (
        RewardsIntegrationService.calculateUserFeeDiscount as jest.Mock
      ).mockResolvedValue(undefined);

      await TradingService.placeOrder({
        provider: mockProvider,
        params: orderParams,
        context: mockContext,
        reportOrderToDataLake: mockReportOrderToDataLake,
      });

      expect(mockContext.stateManager?.update).toHaveBeenCalled();
    });

    it('saves trade configuration when leverage is provided', async () => {
      const orderParams: OrderParams = {
        coin: 'BTC',
        isBuy: true,
        size: '0.1',
        orderType: 'market',
        leverage: 10,
      };
      const mockOrderResult: OrderResult = {
        success: true,
        orderId: 'order-123',
      };

      mockProvider.placeOrder.mockResolvedValue(mockOrderResult);
      (
        RewardsIntegrationService.calculateUserFeeDiscount as jest.Mock
      ).mockResolvedValue(undefined);

      await TradingService.placeOrder({
        provider: mockProvider,
        params: orderParams,
        context: mockContext,
        reportOrderToDataLake: mockReportOrderToDataLake,
      });

      expect(mockSaveTradeConfiguration).toHaveBeenCalledWith('BTC', 10);
    });

    it('tracks analytics event when order succeeds', async () => {
      const orderParams: OrderParams = {
        coin: 'BTC',
        isBuy: true,
        size: '0.1',
        orderType: 'market',
        leverage: 10,
        trackingData: {
          totalFee: 5,
          marketPrice: 50000,
          marginUsed: 5000,
          metamaskFee: 5,
          metamaskFeeRate: 0.001,
          feeDiscountPercentage: 0.65,
          estimatedPoints: 100,
        },
      };
      const mockOrderResult: OrderResult = {
        success: true,
        orderId: 'order-123',
        filledSize: '0.1',
        averagePrice: '50000',
      };

      mockProvider.placeOrder.mockResolvedValue(mockOrderResult);
      (
        RewardsIntegrationService.calculateUserFeeDiscount as jest.Mock
      ).mockResolvedValue(undefined);

      await TradingService.placeOrder({
        provider: mockProvider,
        params: orderParams,
        context: mockContext,
        reportOrderToDataLake: mockReportOrderToDataLake,
      });

      expect(mockContext.analytics.trackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: expect.any(String),
        }),
      );
    });

    it('tracks analytics event when order fails', async () => {
      const orderParams: OrderParams = {
        coin: 'BTC',
        isBuy: true,
        size: '0.1',
        orderType: 'market',
      };
      const mockOrderResult: OrderResult = {
        success: false,
        error: 'Insufficient margin',
      };

      mockProvider.placeOrder.mockResolvedValue(mockOrderResult);
      (
        RewardsIntegrationService.calculateUserFeeDiscount as jest.Mock
      ).mockResolvedValue(undefined);

      await TradingService.placeOrder({
        provider: mockProvider,
        params: orderParams,
        context: mockContext,
        reportOrderToDataLake: mockReportOrderToDataLake,
      });

      expect(mockContext.analytics.trackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: expect.any(String),
        }),
      );
    });

    it('reports order to data lake on success (fire-and-forget)', async () => {
      const orderParams: OrderParams = {
        coin: 'BTC',
        isBuy: true,
        size: '0.1',
        orderType: 'market',
        takeProfitPrice: '55000',
        stopLossPrice: '45000',
      };
      const mockOrderResult: OrderResult = {
        success: true,
        orderId: 'order-123',
      };

      mockProvider.placeOrder.mockResolvedValue(mockOrderResult);
      (
        RewardsIntegrationService.calculateUserFeeDiscount as jest.Mock
      ).mockResolvedValue(undefined);

      await TradingService.placeOrder({
        provider: mockProvider,
        params: orderParams,
        context: mockContext,
        reportOrderToDataLake: mockReportOrderToDataLake,
      });

      expect(mockReportOrderToDataLake).toHaveBeenCalledWith({
        action: 'open',
        coin: 'BTC',
        sl_price: 45000,
        tp_price: 55000,
      });
    });

    it('does not throw when data lake reporting fails', async () => {
      const orderParams: OrderParams = {
        coin: 'BTC',
        isBuy: true,
        size: '0.1',
        orderType: 'market',
      };
      const mockOrderResult: OrderResult = {
        success: true,
        orderId: 'order-123',
      };

      mockProvider.placeOrder.mockResolvedValue(mockOrderResult);
      (
        RewardsIntegrationService.calculateUserFeeDiscount as jest.Mock
      ).mockResolvedValue(undefined);
      mockReportOrderToDataLake.mockRejectedValue(new Error('Data lake error'));

      await expect(
        TradingService.placeOrder({
          provider: mockProvider,
          params: orderParams,
          context: mockContext,
          reportOrderToDataLake: mockReportOrderToDataLake,
        }),
      ).resolves.toBeDefined();
    });

    it('creates trace for order placement', async () => {
      const orderParams: OrderParams = {
        coin: 'BTC',
        isBuy: true,
        size: '0.1',
        orderType: 'market',
      };
      const mockOrderResult: OrderResult = {
        success: true,
        orderId: 'order-123',
      };

      mockProvider.placeOrder.mockResolvedValue(mockOrderResult);
      (
        RewardsIntegrationService.calculateUserFeeDiscount as jest.Mock
      ).mockResolvedValue(undefined);

      await TradingService.placeOrder({
        provider: mockProvider,
        params: orderParams,
        context: mockContext,
        reportOrderToDataLake: mockReportOrderToDataLake,
      });

      expect(trace).toHaveBeenCalledWith(
        expect.objectContaining({
          name: expect.any(String),
          id: 'mock-trace-id',
        }),
      );
      expect(endTrace).toHaveBeenCalled();
    });

    it('handles order placement failure', async () => {
      const orderParams: OrderParams = {
        coin: 'BTC',
        isBuy: true,
        size: '0.1',
        orderType: 'market',
      };
      mockProvider.placeOrder.mockResolvedValue({
        success: false,
        error: 'Insufficient margin',
      });
      (
        RewardsIntegrationService.calculateUserFeeDiscount as jest.Mock
      ).mockResolvedValue(undefined);

      const result = await TradingService.placeOrder({
        provider: mockProvider,
        params: orderParams,
        context: mockContext,
        reportOrderToDataLake: mockReportOrderToDataLake,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Insufficient margin');
      expect(mockContext.analytics.trackEvent).toHaveBeenCalled();
    });

    it('handles provider exception during order placement', async () => {
      const orderParams: OrderParams = {
        coin: 'BTC',
        isBuy: true,
        size: '0.1',
        orderType: 'market',
      };
      const error = new Error('Network timeout');
      mockProvider.placeOrder.mockRejectedValue(error);
      (
        RewardsIntegrationService.calculateUserFeeDiscount as jest.Mock
      ).mockResolvedValue(undefined);

      await expect(
        TradingService.placeOrder({
          provider: mockProvider,
          params: orderParams,
          context: mockContext,
          reportOrderToDataLake: mockReportOrderToDataLake,
        }),
      ).rejects.toThrow('Network timeout');

      expect(Logger.error).toHaveBeenCalledWith(error, expect.any(Object));
      expect(mockContext.analytics.trackEvent).toHaveBeenCalled();
    });

    it('handles data lake reporting failure', async () => {
      const orderParams: OrderParams = {
        coin: 'BTC',
        isBuy: true,
        size: '0.1',
        orderType: 'market',
      };
      const mockOrderResult: OrderResult = {
        success: true,
        orderId: 'order-123',
        filledSize: '0.1',
        averagePrice: '50000',
      };
      mockProvider.placeOrder.mockResolvedValue(mockOrderResult);
      mockReportOrderToDataLake.mockRejectedValue(
        new Error('Data lake unavailable'),
      );
      (
        RewardsIntegrationService.calculateUserFeeDiscount as jest.Mock
      ).mockResolvedValue(undefined);

      const result = await TradingService.placeOrder({
        provider: mockProvider,
        params: orderParams,
        context: mockContext,
        reportOrderToDataLake: mockReportOrderToDataLake,
      });

      expect(result.success).toBe(true);
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(Logger.error).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Data lake unavailable' }),
        expect.any(Object),
      );
    });
  });

  describe('editOrder', () => {
    it('edits order successfully without fee discount', async () => {
      const editParams: EditOrderParams = {
        orderId: 'order-123',
        newOrder: {
          coin: 'BTC',
          isBuy: true,
          size: '0.2',
          orderType: 'limit',
          price: '51000',
        },
      };
      const mockOrderResult: OrderResult = {
        success: true,
        orderId: 'order-123',
      };

      mockProvider.editOrder.mockResolvedValue(mockOrderResult);
      (
        RewardsIntegrationService.calculateUserFeeDiscount as jest.Mock
      ).mockResolvedValue(undefined);

      const result = await TradingService.editOrder({
        provider: mockProvider,
        params: editParams,
        context: mockContext,
      });

      expect(result).toEqual(mockOrderResult);
      expect(mockProvider.editOrder).toHaveBeenCalledWith(editParams);
      expect(mockProvider.setUserFeeDiscount).toHaveBeenCalledWith(undefined);
    });

    it('edits order successfully with fee discount applied and cleared', async () => {
      const editParams: EditOrderParams = {
        orderId: 'order-123',
        newOrder: {
          coin: 'BTC',
          isBuy: true,
          size: '0.2',
          orderType: 'limit',
          price: '51000',
        },
      };
      const mockOrderResult: OrderResult = {
        success: true,
        orderId: 'order-123',
      };

      mockProvider.editOrder.mockResolvedValue(mockOrderResult);
      const contextWithRewards = createContextWithRewards();
      (
        RewardsIntegrationService.calculateUserFeeDiscount as jest.Mock
      ).mockResolvedValue(6500);

      const result = await TradingService.editOrder({
        provider: mockProvider,
        params: editParams,
        context: contextWithRewards,
      });

      expect(result).toEqual(mockOrderResult);
      expect(mockProvider.setUserFeeDiscount).toHaveBeenCalledWith(6500);
      expect(mockProvider.editOrder).toHaveBeenCalledWith(editParams);
      expect(mockProvider.setUserFeeDiscount).toHaveBeenLastCalledWith(
        undefined,
      );
    });

    it('tracks analytics event when edit succeeds', async () => {
      const editParams: EditOrderParams = {
        orderId: 'order-123',
        newOrder: {
          coin: 'BTC',
          isBuy: true,
          size: '0.2',
          orderType: 'limit',
          price: '51000',
        },
      };
      const mockOrderResult: OrderResult = {
        success: true,
        orderId: 'order-123',
      };

      mockProvider.editOrder.mockResolvedValue(mockOrderResult);
      (
        RewardsIntegrationService.calculateUserFeeDiscount as jest.Mock
      ).mockResolvedValue(undefined);

      await TradingService.editOrder({
        provider: mockProvider,
        params: editParams,
        context: mockContext,
      });

      expect(mockContext.analytics.trackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: expect.any(String),
        }),
      );
    });

    it('tracks analytics event when edit fails', async () => {
      const editParams: EditOrderParams = {
        orderId: 'order-123',
        newOrder: {
          coin: 'BTC',
          isBuy: true,
          size: '0.2',
          orderType: 'limit',
          price: '51000',
        },
      };
      const mockOrderResult: OrderResult = {
        success: false,
        error: 'Order not found',
      };

      mockProvider.editOrder.mockResolvedValue(mockOrderResult);
      (
        RewardsIntegrationService.calculateUserFeeDiscount as jest.Mock
      ).mockResolvedValue(undefined);

      await TradingService.editOrder({
        provider: mockProvider,
        params: editParams,
        context: mockContext,
      });

      expect(mockContext.analytics.trackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: expect.any(String),
        }),
      );
    });

    it('clears fee discount when edit throws exception', async () => {
      const editParams: EditOrderParams = {
        orderId: 'order-123',
        newOrder: {
          coin: 'BTC',
          isBuy: true,
          size: '0.2',
          orderType: 'limit',
          price: '51000',
        },
      };

      mockProvider.editOrder.mockRejectedValue(new Error('Edit failed'));
      const contextWithRewards = createContextWithRewards();
      (
        RewardsIntegrationService.calculateUserFeeDiscount as jest.Mock
      ).mockResolvedValue(6500);

      await expect(
        TradingService.editOrder({
          provider: mockProvider,
          params: editParams,
          context: contextWithRewards,
        }),
      ).rejects.toThrow('Edit failed');

      expect(mockProvider.setUserFeeDiscount).toHaveBeenCalledWith(6500);
      expect(mockProvider.setUserFeeDiscount).toHaveBeenLastCalledWith(
        undefined,
      );
    });

    it('handles order edit failure', async () => {
      const editParams: EditOrderParams = {
        orderId: 'order-123',
        newOrder: {
          coin: 'BTC',
          isBuy: true,
          size: '0.2',
          orderType: 'market',
        },
      };
      mockProvider.editOrder.mockResolvedValue({
        success: false,
        error: 'Order not found',
      });

      const result = await TradingService.editOrder({
        provider: mockProvider,
        params: editParams,
        context: mockContext,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Order not found');
      expect(mockContext.analytics.trackEvent).toHaveBeenCalled();
    });

    it('handles provider exception during order edit', async () => {
      const editParams: EditOrderParams = {
        orderId: 'order-123',
        newOrder: {
          coin: 'BTC',
          isBuy: true,
          size: '0.2',
          orderType: 'market',
        },
      };
      const error = new Error('Network timeout');
      mockProvider.editOrder.mockRejectedValue(error);

      await expect(
        TradingService.editOrder({
          provider: mockProvider,
          params: editParams,
          context: mockContext,
        }),
      ).rejects.toThrow('Network timeout');

      expect(Logger.error).toHaveBeenCalledWith(error, expect.any(Object));
      expect(mockContext.analytics.trackEvent).toHaveBeenCalled();
    });
  });

  describe('cancelOrder', () => {
    it('cancels order successfully', async () => {
      const cancelParams: CancelOrderParams = {
        orderId: 'order-123',
        coin: 'BTC',
      };
      const mockResult = {
        success: true,
        orderId: 'order-123',
      };

      mockProvider.cancelOrder.mockResolvedValue(mockResult);

      const result = await TradingService.cancelOrder({
        provider: mockProvider,
        params: cancelParams,
        context: mockContext,
      });

      expect(result).toEqual(mockResult);
      expect(mockProvider.cancelOrder).toHaveBeenCalledWith(cancelParams);
    });

    it('tracks analytics event when cancellation succeeds', async () => {
      const cancelParams: CancelOrderParams = {
        orderId: 'order-123',
        coin: 'BTC',
      };
      const mockResult = {
        success: true,
        orderId: 'order-123',
      };

      mockProvider.cancelOrder.mockResolvedValue(mockResult);

      await TradingService.cancelOrder({
        provider: mockProvider,
        params: cancelParams,
        context: mockContext,
      });

      expect(mockContext.analytics.trackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: expect.any(String),
        }),
      );
    });

    it('tracks analytics event when cancellation fails', async () => {
      const cancelParams: CancelOrderParams = {
        orderId: 'order-123',
        coin: 'BTC',
      };
      const mockResult = {
        success: false,
        error: 'Order not found',
      };

      mockProvider.cancelOrder.mockResolvedValue(mockResult);

      await TradingService.cancelOrder({
        provider: mockProvider,
        params: cancelParams,
        context: mockContext,
      });

      expect(mockContext.analytics.trackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: expect.any(String),
        }),
      );
    });

    it('logs error when cancellation throws exception', async () => {
      const cancelParams: CancelOrderParams = {
        orderId: 'order-123',
        coin: 'BTC',
      };

      mockProvider.cancelOrder.mockRejectedValue(new Error('Cancel failed'));

      await expect(
        TradingService.cancelOrder({
          provider: mockProvider,
          params: cancelParams,
          context: mockContext,
        }),
      ).rejects.toThrow('Cancel failed');

      expect(Logger.error).toHaveBeenCalled();
    });

    it('handles order cancel failure', async () => {
      const cancelParams: CancelOrderParams = {
        orderId: 'order-123',
        coin: 'BTC',
      };
      mockProvider.cancelOrder.mockResolvedValue({
        success: false,
        error: 'Order already filled',
      });

      const result = await TradingService.cancelOrder({
        provider: mockProvider,
        params: cancelParams,
        context: mockContext,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Order already filled');
      expect(mockContext.analytics.trackEvent).toHaveBeenCalled();
    });

    it('handles provider exception during order cancel', async () => {
      const cancelParams: CancelOrderParams = {
        orderId: 'order-123',
        coin: 'BTC',
      };
      const error = new Error('Network error');
      mockProvider.cancelOrder.mockRejectedValue(error);

      await expect(
        TradingService.cancelOrder({
          provider: mockProvider,
          params: cancelParams,
          context: mockContext,
        }),
      ).rejects.toThrow('Network error');

      expect(Logger.error).toHaveBeenCalledWith(error, expect.any(Object));
      expect(mockContext.analytics.trackEvent).toHaveBeenCalled();
    });
  });

  describe('cancelOrders', () => {
    const mockOrders: Order[] = [
      {
        orderId: 'order-1',
        symbol: 'BTC',
        side: 'buy',
        orderType: 'limit',
        price: '50000',
        size: '0.1',
        originalSize: '0.1',
        filledSize: '0',
        remainingSize: '0.1',
        status: 'open',
        timestamp: 1234567890,
      },
      {
        orderId: 'order-2',
        symbol: 'ETH',
        side: 'sell',
        orderType: 'market',
        detailedOrderType: 'Stop Market',
        isTrigger: true,
        reduceOnly: true,
        price: '3000',
        size: '1.0',
        originalSize: '1.0',
        filledSize: '0',
        remainingSize: '1.0',
        status: 'open',
        timestamp: 1234567891,
      },
      {
        orderId: 'order-3',
        symbol: 'BTC',
        side: 'buy',
        orderType: 'limit',
        detailedOrderType: 'Take Profit Limit',
        isTrigger: true,
        reduceOnly: true,
        price: '55000',
        size: '0.1',
        originalSize: '0.1',
        filledSize: '0',
        remainingSize: '0.1',
        status: 'open',
        timestamp: 1234567892,
      },
    ];

    it('cancels all orders excluding TP/SL when cancelAll is true', async () => {
      const params: CancelOrdersParams = {
        cancelAll: true,
      };

      mockGetOpenOrders.mockResolvedValue(mockOrders);
      (mockProvider.cancelOrders as jest.Mock).mockResolvedValue({
        success: true,
        results: [{ success: true, orderId: 'order-1' }],
      });

      const result = await TradingService.cancelOrders({
        provider: mockProvider,
        params,
        context: { ...mockContext, getOpenOrders: mockGetOpenOrders },
        withStreamPause: mockWithStreamPause,
      });

      expect(result.success).toBe(true);
      expect(mockProvider.cancelOrders).toHaveBeenCalledWith([
        { coin: 'BTC', orderId: 'order-1' },
      ]);
    });

    it('allows canceling TP/SL orders when specified by orderId', async () => {
      const params: CancelOrdersParams = {
        orderIds: ['order-2', 'order-3'],
      };

      mockGetOpenOrders.mockResolvedValue(mockOrders);
      (mockProvider.cancelOrders as jest.Mock).mockResolvedValue({
        success: true,
        results: [
          { success: true, orderId: 'order-2' },
          { success: true, orderId: 'order-3' },
        ],
      });

      const result = await TradingService.cancelOrders({
        provider: mockProvider,
        params,
        context: { ...mockContext, getOpenOrders: mockGetOpenOrders },
        withStreamPause: mockWithStreamPause,
      });

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(2);
    });

    it('cancels orders for specific coins when provided', async () => {
      const params: CancelOrdersParams = {
        coins: ['BTC'],
      };

      mockGetOpenOrders.mockResolvedValue(mockOrders);
      (mockProvider.cancelOrders as jest.Mock).mockResolvedValue({
        success: true,
        results: [{ success: true, orderId: 'order-1' }],
      });

      const result = await TradingService.cancelOrders({
        provider: mockProvider,
        params,
        context: { ...mockContext, getOpenOrders: mockGetOpenOrders },
        withStreamPause: mockWithStreamPause,
      });

      expect(result.success).toBe(true);
      expect(mockProvider.cancelOrders).toHaveBeenCalledWith([
        { coin: 'BTC', orderId: 'order-1' },
        { coin: 'BTC', orderId: 'order-3' },
      ]);
    });

    it('returns empty results when no orders match filters', async () => {
      const params: CancelOrdersParams = {
        coins: ['SOL'],
      };

      mockGetOpenOrders.mockResolvedValue(mockOrders);

      const result = await TradingService.cancelOrders({
        provider: mockProvider,
        params,
        context: { ...mockContext, getOpenOrders: mockGetOpenOrders },
        withStreamPause: mockWithStreamPause,
      });

      expect(result.success).toBe(false);
      expect(result.results).toEqual([]);
      expect(mockProvider.cancelOrders).not.toHaveBeenCalled();
    });

    it('handles partial failures gracefully', async () => {
      const params: CancelOrdersParams = {
        cancelAll: true,
      };

      mockGetOpenOrders.mockResolvedValue(mockOrders);
      (mockProvider.cancelOrders as jest.Mock).mockResolvedValue({
        success: false,
        results: [
          { success: true, orderId: 'order-1' },
          { success: false, orderId: 'order-2', error: 'Order not found' },
        ],
      });

      const result = await TradingService.cancelOrders({
        provider: mockProvider,
        params,
        context: { ...mockContext, getOpenOrders: mockGetOpenOrders },
        withStreamPause: mockWithStreamPause,
      });

      expect(result.success).toBe(false);
      expect(result.results).toHaveLength(2);
    });

    it('pauses and resumes streams during batch cancellation', async () => {
      const params: CancelOrdersParams = {
        cancelAll: true,
      };

      mockGetOpenOrders.mockResolvedValue(mockOrders);
      (mockProvider.cancelOrders as jest.Mock).mockResolvedValue({
        success: true,
        results: [{ success: true, orderId: 'order-1' }],
      });

      await TradingService.cancelOrders({
        provider: mockProvider,
        params,
        context: { ...mockContext, getOpenOrders: mockGetOpenOrders },
        withStreamPause: mockWithStreamPause,
      });

      expect(mockWithStreamPause).toHaveBeenCalled();
    });

    it('resumes streams even when operation throws error', async () => {
      const params: CancelOrdersParams = {
        cancelAll: true,
      };

      mockGetOpenOrders.mockResolvedValue(mockOrders);
      mockWithStreamPause.mockImplementation(
        async (callback) => await callback(),
      );
      (mockProvider.cancelOrders as jest.Mock).mockRejectedValue(
        new Error('Cancel failed'),
      );

      await expect(
        TradingService.cancelOrders({
          provider: mockProvider,
          params,
          context: { ...mockContext, getOpenOrders: mockGetOpenOrders },
          withStreamPause: mockWithStreamPause,
        }),
      ).rejects.toThrow('Cancel failed');

      expect(mockWithStreamPause).toHaveBeenCalled();
    });

    it('uses fallback when provider does not support batch cancellation', async () => {
      const params: CancelOrdersParams = {
        orderIds: ['order-1', 'order-2'],
      };

      mockGetOpenOrders.mockResolvedValue(mockOrders);
      delete mockProvider.cancelOrders;
      mockProvider.cancelOrder.mockResolvedValue({ success: true });

      const result = await TradingService.cancelOrders({
        provider: mockProvider,
        params,
        context: { ...mockContext, getOpenOrders: mockGetOpenOrders },
        withStreamPause: mockWithStreamPause,
      });

      expect(result.results).toHaveLength(2);
      expect(mockProvider.cancelOrder).toHaveBeenCalledTimes(2);
    });
  });

  describe('closePosition', () => {
    const mockPosition: Position = {
      coin: 'BTC',
      size: '0.5',
      entryPrice: '50000',
      liquidationPrice: '45000',
      leverage: { type: 'cross', value: 10 },
      marginUsed: '2500',
      maxLeverage: 20,
      positionValue: '25000',
      returnOnEquity: '0.2',
      unrealizedPnl: '5000',
      cumulativeFunding: { allTime: '0', sinceOpen: '0', sinceChange: '0' },
      takeProfitCount: 0,
      stopLossCount: 0,
    };

    it('closes position successfully without fee discount', async () => {
      const params: ClosePositionParams = {
        coin: 'BTC',
      };
      const mockResult: OrderResult = {
        success: true,
        orderId: 'close-123',
        filledSize: '0.5',
        averagePrice: '55000',
      };

      mockGetPositions.mockResolvedValue([mockPosition]);
      mockProvider.closePosition.mockResolvedValue(mockResult);
      (
        RewardsIntegrationService.calculateUserFeeDiscount as jest.Mock
      ).mockResolvedValue(undefined);

      const result = await TradingService.closePosition({
        provider: mockProvider,
        params,
        context: { ...mockContext, getPositions: mockGetPositions },
        reportOrderToDataLake: mockReportOrderToDataLake,
      });

      expect(result).toEqual(mockResult);
      expect(mockProvider.closePosition).toHaveBeenCalledWith(params);
      expect(mockProvider.setUserFeeDiscount).toHaveBeenCalledWith(undefined);
    });

    it('closes position successfully with fee discount applied and cleared', async () => {
      const params: ClosePositionParams = {
        coin: 'BTC',
      };
      const mockResult: OrderResult = {
        success: true,
        orderId: 'close-123',
      };

      mockGetPositions.mockResolvedValue([mockPosition]);
      mockProvider.closePosition.mockResolvedValue(mockResult);
      const contextWithRewards = createContextWithRewards();
      (
        RewardsIntegrationService.calculateUserFeeDiscount as jest.Mock
      ).mockResolvedValue(6500);

      const result = await TradingService.closePosition({
        provider: mockProvider,
        params,
        context: { ...contextWithRewards, getPositions: mockGetPositions },
        reportOrderToDataLake: mockReportOrderToDataLake,
      });

      expect(result).toEqual(mockResult);
      expect(mockProvider.setUserFeeDiscount).toHaveBeenCalledWith(6500);
      expect(mockProvider.closePosition).toHaveBeenCalledWith(params);
      expect(mockProvider.setUserFeeDiscount).toHaveBeenLastCalledWith(
        undefined,
      );
    });

    it('tracks analytics with PNL calculation', async () => {
      const params: ClosePositionParams = {
        coin: 'BTC',
      };
      const mockResult: OrderResult = {
        success: true,
        orderId: 'close-123',
        filledSize: '0.5',
        averagePrice: '55000',
      };

      mockGetPositions.mockResolvedValue([mockPosition]);
      mockProvider.closePosition.mockResolvedValue(mockResult);
      (
        RewardsIntegrationService.calculateUserFeeDiscount as jest.Mock
      ).mockResolvedValue(undefined);

      await TradingService.closePosition({
        provider: mockProvider,
        params,
        context: { ...mockContext, getPositions: mockGetPositions },
        reportOrderToDataLake: mockReportOrderToDataLake,
      });

      expect(mockContext.analytics.trackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: expect.any(String),
        }),
      );
    });

    it('reports order to data lake on successful close', async () => {
      const params: ClosePositionParams = {
        coin: 'BTC',
      };
      const mockResult: OrderResult = {
        success: true,
        orderId: 'close-123',
      };

      mockGetPositions.mockResolvedValue([mockPosition]);
      mockProvider.closePosition.mockResolvedValue(mockResult);
      (
        RewardsIntegrationService.calculateUserFeeDiscount as jest.Mock
      ).mockResolvedValue(undefined);

      await TradingService.closePosition({
        provider: mockProvider,
        params,
        context: { ...mockContext, getPositions: mockGetPositions },
        reportOrderToDataLake: mockReportOrderToDataLake,
      });

      expect(mockReportOrderToDataLake).toHaveBeenCalledWith({
        action: 'close',
        coin: 'BTC',
        sl_price: undefined,
        tp_price: undefined,
      });
    });

    it('detects direction from position size', async () => {
      const shortPosition: Position = {
        ...mockPosition,
        size: '-0.5',
      };
      const params: ClosePositionParams = {
        coin: 'BTC',
      };
      const mockResult: OrderResult = {
        success: true,
        orderId: 'close-123',
      };

      mockGetPositions.mockResolvedValue([shortPosition]);
      mockProvider.closePosition.mockResolvedValue(mockResult);
      (
        RewardsIntegrationService.calculateUserFeeDiscount as jest.Mock
      ).mockResolvedValue(undefined);

      await TradingService.closePosition({
        provider: mockProvider,
        params,
        context: { ...mockContext, getPositions: mockGetPositions },
        reportOrderToDataLake: mockReportOrderToDataLake,
      });

      expect(mockContext.analytics.trackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          properties: expect.objectContaining({
            direction: expect.any(String),
          }),
        }),
      );
    });

    it('tracks analytics on position close failure', async () => {
      const params: ClosePositionParams = {
        coin: 'BTC',
      };
      const mockFailureResult: OrderResult = {
        success: false,
        error: 'Insufficient liquidity',
      };

      mockGetPositions.mockResolvedValue([mockPosition]);
      mockProvider.closePosition.mockResolvedValue(mockFailureResult);
      (
        RewardsIntegrationService.calculateUserFeeDiscount as jest.Mock
      ).mockResolvedValue(undefined);

      const result = await TradingService.closePosition({
        provider: mockProvider,
        params,
        context: { ...mockContext, getPositions: mockGetPositions },
        reportOrderToDataLake: mockReportOrderToDataLake,
      });

      expect(result).toEqual(mockFailureResult);
      expect(mockContext.analytics.trackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          properties: expect.objectContaining({
            status: 'failed',
            error_message: 'Insufficient liquidity',
          }),
        }),
      );
    });
  });

  describe('closePositions', () => {
    const mockPositions: Position[] = [
      {
        coin: 'BTC',
        size: '0.5',
        entryPrice: '50000',
        liquidationPrice: '45000',
        leverage: { type: 'cross', value: 10 },
        marginUsed: '2500',
        maxLeverage: 20,
        positionValue: '25000',
        returnOnEquity: '0.2',
        unrealizedPnl: '5000',
        cumulativeFunding: { allTime: '0', sinceOpen: '0', sinceChange: '0' },
        takeProfitCount: 0,
        stopLossCount: 0,
      },
      {
        coin: 'ETH',
        size: '5.0',
        entryPrice: '3000',
        liquidationPrice: '2700',
        leverage: { type: 'cross', value: 10 },
        marginUsed: '1500',
        maxLeverage: 20,
        positionValue: '15000',
        returnOnEquity: '0.1',
        unrealizedPnl: '1500',
        cumulativeFunding: { allTime: '0', sinceOpen: '0', sinceChange: '0' },
        takeProfitCount: 0,
        stopLossCount: 0,
      },
    ];

    it('closes all positions when closeAll is true', async () => {
      const params: ClosePositionsParams = {
        closeAll: true,
      };

      mockGetPositions.mockResolvedValue(mockPositions);
      (mockProvider.closePositions as jest.Mock).mockResolvedValue({
        success: true,
        results: [
          { success: true, orderId: 'close-1', coin: 'BTC' },
          { success: true, orderId: 'close-2', coin: 'ETH' },
        ],
      });
      (
        RewardsIntegrationService.calculateUserFeeDiscount as jest.Mock
      ).mockResolvedValue(undefined);

      const result = await TradingService.closePositions({
        provider: mockProvider,
        params,
        context: { ...mockContext, getPositions: mockGetPositions },
      });

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(2);
    });

    it('closes specific coins when provided', async () => {
      const params: ClosePositionsParams = {
        coins: ['BTC'],
      };

      mockGetPositions.mockResolvedValue(mockPositions);
      (mockProvider.closePositions as jest.Mock).mockResolvedValue({
        success: true,
        results: [{ success: true, orderId: 'close-1', coin: 'BTC' }],
      });
      (
        RewardsIntegrationService.calculateUserFeeDiscount as jest.Mock
      ).mockResolvedValue(undefined);

      const result = await TradingService.closePositions({
        provider: mockProvider,
        params,
        context: { ...mockContext, getPositions: mockGetPositions },
      });

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(1);
    });

    it('returns empty results when no positions match', async () => {
      const params: ClosePositionsParams = {
        coins: ['SOL'],
      };

      mockGetPositions.mockResolvedValue(mockPositions);
      (mockProvider.closePositions as jest.Mock).mockResolvedValue({
        success: false,
        successCount: 0,
        failureCount: 0,
        results: [],
      });

      const result = await TradingService.closePositions({
        provider: mockProvider,
        params,
        context: { ...mockContext, getPositions: mockGetPositions },
      });

      expect(result.success).toBe(false);
      expect(result.results).toEqual([]);
    });

    it('handles partial failures gracefully', async () => {
      const params: ClosePositionsParams = {
        closeAll: true,
      };

      mockGetPositions.mockResolvedValue(mockPositions);
      (mockProvider.closePositions as jest.Mock).mockResolvedValue({
        success: false,
        results: [
          { success: true, orderId: 'close-1', coin: 'BTC' },
          { success: false, coin: 'ETH', error: 'Insufficient liquidity' },
        ],
      });
      (
        RewardsIntegrationService.calculateUserFeeDiscount as jest.Mock
      ).mockResolvedValue(undefined);

      const result = await TradingService.closePositions({
        provider: mockProvider,
        params,
        context: { ...mockContext, getPositions: mockGetPositions },
      });

      expect(result.success).toBe(false);
      expect(result.results).toHaveLength(2);
    });

    it('uses fallback when provider does not support batch closing', async () => {
      const params: ClosePositionsParams = {
        coins: ['BTC'],
      };

      mockGetPositions.mockResolvedValue(mockPositions);
      delete mockProvider.closePositions;
      mockProvider.closePosition.mockResolvedValue({
        success: true,
        orderId: 'close-1',
      });
      (
        RewardsIntegrationService.calculateUserFeeDiscount as jest.Mock
      ).mockResolvedValue(undefined);

      const result = await TradingService.closePositions({
        provider: mockProvider,
        params,
        context: { ...mockContext, getPositions: mockGetPositions },
      });

      expect(result.results).toHaveLength(1);
      expect(mockProvider.closePosition).toHaveBeenCalledTimes(1);
    });
  });

  describe('updatePositionTPSL', () => {
    const mockPosition: Position = {
      coin: 'BTC',
      size: '0.5',
      entryPrice: '50000',
      liquidationPrice: '45000',
      leverage: { type: 'cross', value: 10 },
      marginUsed: '2500',
      maxLeverage: 20,
      positionValue: '25000',
      returnOnEquity: '0.2',
      unrealizedPnl: '5000',
      cumulativeFunding: { allTime: '0', sinceOpen: '0', sinceChange: '0' },
      takeProfitCount: 0,
      stopLossCount: 0,
    };

    it('updates TP/SL successfully without fee discount', async () => {
      const params: UpdatePositionTPSLParams = {
        coin: 'BTC',
        takeProfitPrice: '55000',
        stopLossPrice: '45000',
      };
      const mockResult: OrderResult = {
        success: true,
      };

      mockGetPositions.mockResolvedValue([mockPosition]);
      mockProvider.updatePositionTPSL.mockResolvedValue(mockResult);
      (
        RewardsIntegrationService.calculateUserFeeDiscount as jest.Mock
      ).mockResolvedValue(undefined);

      const result = await TradingService.updatePositionTPSL({
        provider: mockProvider,
        params,
        context: { ...mockContext, getPositions: mockGetPositions },
      });

      expect(result).toEqual(mockResult);
      expect(mockProvider.updatePositionTPSL).toHaveBeenCalledWith(params);
      expect(mockProvider.setUserFeeDiscount).toHaveBeenCalledWith(undefined);
    });

    it('updates TP/SL successfully with fee discount applied and cleared', async () => {
      const params: UpdatePositionTPSLParams = {
        coin: 'BTC',
        takeProfitPrice: '55000',
      };
      const mockResult: OrderResult = {
        success: true,
      };

      mockGetPositions.mockResolvedValue([mockPosition]);
      mockProvider.updatePositionTPSL.mockResolvedValue(mockResult);
      const contextWithRewards = createContextWithRewards();
      (
        RewardsIntegrationService.calculateUserFeeDiscount as jest.Mock
      ).mockResolvedValue(6500);

      const result = await TradingService.updatePositionTPSL({
        provider: mockProvider,
        params,
        context: { ...contextWithRewards, getPositions: mockGetPositions },
      });

      expect(result).toEqual(mockResult);
      expect(mockProvider.setUserFeeDiscount).toHaveBeenCalledWith(6500);
      expect(mockProvider.updatePositionTPSL).toHaveBeenCalledWith(params);
      expect(mockProvider.setUserFeeDiscount).toHaveBeenLastCalledWith(
        undefined,
      );
    });

    it('tracks analytics event when update succeeds', async () => {
      const params: UpdatePositionTPSLParams = {
        coin: 'BTC',
        takeProfitPrice: '55000',
        stopLossPrice: '45000',
      };
      const mockResult: OrderResult = {
        success: true,
      };

      mockGetPositions.mockResolvedValue([mockPosition]);
      mockProvider.updatePositionTPSL.mockResolvedValue(mockResult);
      (
        RewardsIntegrationService.calculateUserFeeDiscount as jest.Mock
      ).mockResolvedValue(undefined);

      await TradingService.updatePositionTPSL({
        provider: mockProvider,
        params,
        context: { ...mockContext, getPositions: mockGetPositions },
      });

      expect(mockContext.analytics.trackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: expect.any(String),
        }),
      );
    });

    it('tracks analytics event when update fails', async () => {
      const params: UpdatePositionTPSLParams = {
        coin: 'BTC',
        takeProfitPrice: '55000',
      };
      const mockResult: OrderResult = {
        success: false,
        error: 'Invalid price',
      };

      mockGetPositions.mockResolvedValue([mockPosition]);
      mockProvider.updatePositionTPSL.mockResolvedValue(mockResult);
      (
        RewardsIntegrationService.calculateUserFeeDiscount as jest.Mock
      ).mockResolvedValue(undefined);

      await TradingService.updatePositionTPSL({
        provider: mockProvider,
        params,
        context: { ...mockContext, getPositions: mockGetPositions },
      });

      expect(mockContext.analytics.trackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: expect.any(String),
        }),
      );
    });

    it('includes direction and size in analytics', async () => {
      const params: UpdatePositionTPSLParams = {
        coin: 'BTC',
        stopLossPrice: '45000',
        trackingData: {
          direction: 'long',
          positionSize: 0.5,
          source: 'tp_sl_view',
        },
      };
      const mockResult: OrderResult = {
        success: true,
      };

      mockGetPositions.mockResolvedValue([mockPosition]);
      mockProvider.updatePositionTPSL.mockResolvedValue(mockResult);
      (
        RewardsIntegrationService.calculateUserFeeDiscount as jest.Mock
      ).mockResolvedValue(undefined);

      await TradingService.updatePositionTPSL({
        provider: mockProvider,
        params,
        context: { ...mockContext, getPositions: mockGetPositions },
      });

      expect(mockContext.analytics.trackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          properties: expect.objectContaining({
            direction: expect.any(String),
            position_size: expect.any(Number),
          }),
        }),
      );
    });

    it('clears fee discount when update throws exception', async () => {
      const params: UpdatePositionTPSLParams = {
        coin: 'BTC',
        takeProfitPrice: '55000',
      };

      mockGetPositions.mockResolvedValue([mockPosition]);
      mockProvider.updatePositionTPSL.mockRejectedValue(
        new Error('Update failed'),
      );
      const contextWithRewards = createContextWithRewards();
      (
        RewardsIntegrationService.calculateUserFeeDiscount as jest.Mock
      ).mockResolvedValue(6500);

      await expect(
        TradingService.updatePositionTPSL({
          provider: mockProvider,
          params,
          context: { ...contextWithRewards, getPositions: mockGetPositions },
        }),
      ).rejects.toThrow('Update failed');

      expect(mockProvider.setUserFeeDiscount).toHaveBeenCalledWith(6500);
      expect(mockProvider.setUserFeeDiscount).toHaveBeenLastCalledWith(
        undefined,
      );
    });
  });

  describe('updateMargin', () => {
    it('updates margin successfully when adding margin', async () => {
      const mockResult = { success: true };
      mockProvider.updateMargin = jest.fn().mockResolvedValue(mockResult);

      const result = await TradingService.updateMargin({
        provider: mockProvider,
        coin: 'BTC',
        amount: '100',
        context: mockContext,
      });

      expect(result).toEqual(mockResult);
      expect(mockProvider.updateMargin).toHaveBeenCalledWith({
        coin: 'BTC',
        amount: '100',
      });
    });

    it('updates margin successfully when removing margin', async () => {
      const mockResult = { success: true };
      mockProvider.updateMargin = jest.fn().mockResolvedValue(mockResult);

      const result = await TradingService.updateMargin({
        provider: mockProvider,
        coin: 'BTC',
        amount: '-50',
        context: mockContext,
      });

      expect(result).toEqual(mockResult);
      expect(mockProvider.updateMargin).toHaveBeenCalledWith({
        coin: 'BTC',
        amount: '-50',
      });
    });

    it('throws error when provider does not support margin adjustment', async () => {
      mockProvider.updateMargin = undefined as never;

      await expect(
        TradingService.updateMargin({
          provider: mockProvider,
          coin: 'BTC',
          amount: '100',
          context: mockContext,
        }),
      ).rejects.toThrow('Provider does not support margin adjustment');
    });

    it('returns error when margin update fails', async () => {
      const mockResult = { success: false, error: 'Insufficient balance' };
      mockProvider.updateMargin = jest.fn().mockResolvedValue(mockResult);

      const result = await TradingService.updateMargin({
        provider: mockProvider,
        coin: 'BTC',
        amount: '100',
        context: mockContext,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Insufficient balance');
    });

    it('tracks analytics on success', async () => {
      const mockResult = { success: true };
      mockProvider.updateMargin = jest.fn().mockResolvedValue(mockResult);

      await TradingService.updateMargin({
        provider: mockProvider,
        coin: 'BTC',
        amount: '100',
        context: mockContext,
      });

      expect(mockContext.analytics.trackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: expect.any(String),
        }),
      );
    });

    it('tracks analytics on failure with error message', async () => {
      mockProvider.updateMargin = jest
        .fn()
        .mockRejectedValue(new Error('Network error'));

      await expect(
        TradingService.updateMargin({
          provider: mockProvider,
          coin: 'BTC',
          amount: '100',
          context: mockContext,
        }),
      ).rejects.toThrow('Network error');

      expect(mockContext.analytics.trackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: expect.any(String),
        }),
      );
    });

    it('updates state on success', async () => {
      const mockResult = { success: true };
      mockProvider.updateMargin = jest.fn().mockResolvedValue(mockResult);

      await TradingService.updateMargin({
        provider: mockProvider,
        coin: 'BTC',
        amount: '100',
        context: mockContext,
      });

      expect(mockContext.stateManager?.update).toHaveBeenCalled();
    });

    it('creates trace for margin update', async () => {
      const mockResult = { success: true };
      mockProvider.updateMargin = jest.fn().mockResolvedValue(mockResult);

      await TradingService.updateMargin({
        provider: mockProvider,
        coin: 'BTC',
        amount: '100',
        context: mockContext,
      });

      expect(trace).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'PerpsUpdateMargin',
          id: 'mock-trace-id',
        }),
      );
      expect(endTrace).toHaveBeenCalled();
    });
  });

  describe('flipPosition', () => {
    const mockPosition: Position = {
      coin: 'BTC',
      size: '0.5',
      entryPrice: '50000',
      liquidationPrice: '45000',
      leverage: { type: 'cross', value: 10 },
      marginUsed: '2500',
      maxLeverage: 20,
      positionValue: '25000',
      returnOnEquity: '0.2',
      unrealizedPnl: '5000',
      cumulativeFunding: { allTime: '0', sinceOpen: '0', sinceChange: '0' },
      takeProfitCount: 0,
      stopLossCount: 0,
    };

    const mockAccountState = {
      availableBalance: '10000',
      equity: '15000',
      marginUsed: '5000',
    };

    beforeEach(() => {
      mockProvider.getAccountState = jest
        .fn()
        .mockResolvedValue(mockAccountState);
    });

    it('places order with 2x position size to flip position', async () => {
      const mockResult: OrderResult = {
        success: true,
        orderId: 'flip-123',
        filledSize: '1.0',
        averagePrice: '50000',
      };
      mockProvider.placeOrder.mockResolvedValue(mockResult);

      await TradingService.flipPosition({
        provider: mockProvider,
        position: mockPosition,
        context: mockContext,
      });

      // Verify order placed with 2x position size (0.5 * 2 = 1.0)
      expect(mockProvider.placeOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          coin: 'BTC',
          size: '1',
        }),
      );
    });

    it('flips long position to short (isBuy=false)', async () => {
      const mockResult: OrderResult = { success: true, orderId: 'flip-123' };
      mockProvider.placeOrder.mockResolvedValue(mockResult);

      // Long position (positive size)
      await TradingService.flipPosition({
        provider: mockProvider,
        position: { ...mockPosition, size: '0.5' },
        context: mockContext,
      });

      expect(mockProvider.placeOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          isBuy: false,
        }),
      );
    });

    it('flips short position to long (isBuy=true)', async () => {
      const mockResult: OrderResult = { success: true, orderId: 'flip-123' };
      mockProvider.placeOrder.mockResolvedValue(mockResult);

      // Short position (negative size)
      await TradingService.flipPosition({
        provider: mockProvider,
        position: { ...mockPosition, size: '-0.5' },
        context: mockContext,
      });

      expect(mockProvider.placeOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          isBuy: true,
        }),
      );
    });

    it('returns error when insufficient balance for fees', async () => {
      // Set very low available balance
      mockProvider.getAccountState = jest.fn().mockResolvedValue({
        ...mockAccountState,
        availableBalance: '1', // $1 balance, insufficient for fees
      });

      await expect(
        TradingService.flipPosition({
          provider: mockProvider,
          position: mockPosition,
          context: mockContext,
        }),
      ).rejects.toThrow(/Insufficient balance for flip fees/);
    });

    it('throws error when account state cannot be retrieved', async () => {
      mockProvider.getAccountState = jest.fn().mockResolvedValue(null);

      await expect(
        TradingService.flipPosition({
          provider: mockProvider,
          position: mockPosition,
          context: mockContext,
        }),
      ).rejects.toThrow('Failed to get account state');
    });

    it('returns error when order placement fails', async () => {
      const mockResult: OrderResult = {
        success: false,
        error: 'Order rejected',
      };
      mockProvider.placeOrder.mockResolvedValue(mockResult);

      const result = await TradingService.flipPosition({
        provider: mockProvider,
        position: mockPosition,
        context: mockContext,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Order rejected');
    });

    it('tracks analytics on success', async () => {
      const mockResult: OrderResult = { success: true, orderId: 'flip-123' };
      mockProvider.placeOrder.mockResolvedValue(mockResult);

      await TradingService.flipPosition({
        provider: mockProvider,
        position: mockPosition,
        context: mockContext,
      });

      expect(mockContext.analytics.trackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: expect.any(String),
        }),
      );
    });

    it('tracks analytics on failure', async () => {
      mockProvider.placeOrder.mockRejectedValue(new Error('Network error'));

      await expect(
        TradingService.flipPosition({
          provider: mockProvider,
          position: mockPosition,
          context: mockContext,
        }),
      ).rejects.toThrow('Network error');

      expect(mockContext.analytics.trackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: expect.any(String),
        }),
      );
    });

    it('updates state on success', async () => {
      const mockResult: OrderResult = { success: true, orderId: 'flip-123' };
      mockProvider.placeOrder.mockResolvedValue(mockResult);

      await TradingService.flipPosition({
        provider: mockProvider,
        position: mockPosition,
        context: mockContext,
      });

      expect(mockContext.stateManager?.update).toHaveBeenCalled();
    });

    it('creates trace for flip position', async () => {
      const mockResult: OrderResult = { success: true, orderId: 'flip-123' };
      mockProvider.placeOrder.mockResolvedValue(mockResult);

      await TradingService.flipPosition({
        provider: mockProvider,
        position: mockPosition,
        context: mockContext,
      });

      expect(trace).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'PerpsFlipPosition',
          id: 'mock-trace-id',
        }),
      );
      expect(endTrace).toHaveBeenCalled();
    });

    it('uses correct order params including leverage', async () => {
      const mockResult: OrderResult = { success: true, orderId: 'flip-123' };
      mockProvider.placeOrder.mockResolvedValue(mockResult);

      await TradingService.flipPosition({
        provider: mockProvider,
        position: mockPosition,
        context: mockContext,
      });

      expect(mockProvider.placeOrder).toHaveBeenCalledWith({
        coin: 'BTC',
        isBuy: false,
        size: '1',
        orderType: 'market',
        leverage: 10,
        currentPrice: 50000,
      });
    });
  });
});
