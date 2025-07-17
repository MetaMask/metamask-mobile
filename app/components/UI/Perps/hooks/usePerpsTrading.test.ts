import { renderHook } from '@testing-library/react-native';
import Engine from '../../../../core/Engine';
import { usePerpsTrading } from './usePerpsTrading';
import type {
  AccountState,
  AssetRoute,
  CancelOrderParams,
  CancelOrderResult,
  ClosePositionParams,
  DepositParams,
  DepositResult,
  GetAccountStateParams,
  MarketInfo,
  OrderParams,
  OrderResult,
  Position,
  SubscribeOrderFillsParams,
  SubscribePositionsParams,
  SubscribePricesParams,
} from '../controllers/types';

// Mock Engine
jest.mock('../../../../core/Engine', () => ({
  context: {
    PerpsController: {
      placeOrder: jest.fn(),
      cancelOrder: jest.fn(),
      closePosition: jest.fn(),
      getMarkets: jest.fn(),
      getPositions: jest.fn(),
      getAccountState: jest.fn(),
      subscribeToPrices: jest.fn(),
      subscribeToPositions: jest.fn(),
      subscribeToOrderFills: jest.fn(),
      deposit: jest.fn(),
      getDepositRoutes: jest.fn(),
      resetDepositState: jest.fn(),
    },
  },
}));

// Mock i18n
jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => key),
}));

describe('usePerpsTrading', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('placeOrder', () => {
    it('should call PerpsController.placeOrder with correct parameters', async () => {
      const mockOrderResult: OrderResult = {
        success: true,
        orderId: 'order123',
        filledSize: '0.5',
        averagePrice: '45000',
      };
      (
        Engine.context.PerpsController.placeOrder as jest.Mock
      ).mockResolvedValue(mockOrderResult);

      const { result } = renderHook(() => usePerpsTrading());

      const orderParams: OrderParams = {
        coin: 'BTC',
        isBuy: true,
        size: '0.5',
        price: '45000',
        orderType: 'limit',
        reduceOnly: false,
        clientOrderId: 'client123',
      };

      const response = await result.current.placeOrder(orderParams);

      expect(Engine.context.PerpsController.placeOrder).toHaveBeenCalledWith(
        orderParams,
      );
      expect(response).toEqual(mockOrderResult);
    });

    it('should handle placeOrder errors', async () => {
      const mockError = new Error('Order placement failed');
      (
        Engine.context.PerpsController.placeOrder as jest.Mock
      ).mockRejectedValue(mockError);

      const { result } = renderHook(() => usePerpsTrading());

      const orderParams: OrderParams = {
        coin: 'ETH',
        isBuy: false,
        size: '1',
        orderType: 'market',
      };

      await expect(result.current.placeOrder(orderParams)).rejects.toThrow(
        'Order placement failed',
      );
    });
  });

  describe('cancelOrder', () => {
    it('should call PerpsController.cancelOrder with correct parameters', async () => {
      const mockCancelResult: CancelOrderResult = {
        success: true,
        orderId: 'order123',
      };

      (
        Engine.context.PerpsController.cancelOrder as jest.Mock
      ).mockResolvedValue(mockCancelResult);

      const { result } = renderHook(() => usePerpsTrading());

      const cancelParams: CancelOrderParams = {
        orderId: 'order123',
        coin: 'BTC',
      };

      const response = await result.current.cancelOrder(cancelParams);

      expect(Engine.context.PerpsController.cancelOrder).toHaveBeenCalledWith(
        cancelParams,
      );
      expect(response).toEqual(mockCancelResult);
    });
  });

  describe('closePosition', () => {
    it('should call PerpsController.closePosition with correct parameters', async () => {
      const mockCloseResult: OrderResult = {
        success: true,
        orderId: 'close123',
        averagePrice: '45000',
        filledSize: '0.5',
      };

      (
        Engine.context.PerpsController.closePosition as jest.Mock
      ).mockResolvedValue(mockCloseResult);

      const { result } = renderHook(() => usePerpsTrading());

      const closeParams: ClosePositionParams = {
        coin: 'BTC',
        size: '0.5',
      };

      const response = await result.current.closePosition(closeParams);

      expect(Engine.context.PerpsController.closePosition).toHaveBeenCalledWith(
        closeParams,
      );
      expect(response).toEqual(mockCloseResult);
    });
  });

  describe('getMarkets', () => {
    it('should call PerpsController.getMarkets and return market info', async () => {
      const mockMarkets: MarketInfo[] = [
        {
          name: 'Bitcoin Perpetual',
          szDecimals: 4,
          maxLeverage: 100,
          marginTableId: 1,
        },
        {
          name: 'Ethereum Perpetual',
          szDecimals: 3,
          maxLeverage: 50,
          marginTableId: 2,
        },
      ];

      (
        Engine.context.PerpsController.getMarkets as jest.Mock
      ).mockResolvedValue(mockMarkets);

      const { result } = renderHook(() => usePerpsTrading());

      const response = await result.current.getMarkets();

      expect(Engine.context.PerpsController.getMarkets).toHaveBeenCalledWith(
        undefined,
      );
      expect(response).toEqual(mockMarkets);
    });

    it('should call getMarkets with specific symbols', async () => {
      const mockMarkets: MarketInfo[] = [
        {
          name: 'Bitcoin Perpetual',
          szDecimals: 4,
          maxLeverage: 100,
          marginTableId: 1,
        },
      ];

      (
        Engine.context.PerpsController.getMarkets as jest.Mock
      ).mockResolvedValue(mockMarkets);

      const { result } = renderHook(() => usePerpsTrading());

      const params = { symbols: ['BTC'] };
      const response = await result.current.getMarkets(params);

      expect(Engine.context.PerpsController.getMarkets).toHaveBeenCalledWith(
        params,
      );
      expect(response).toEqual(mockMarkets);
    });
  });

  describe('getPositions', () => {
    it('should call PerpsController.getPositions and return positions', async () => {
      const mockPositions: Position[] = [
        {
          coin: 'BTC',
          size: '0.5',
          entryPrice: '45000',
          positionValue: '22500',
          unrealizedPnl: '250',
          returnOnEquity: '0.05',
          leverage: {
            type: 'cross',
            value: 2,
            rawUsd: '3000',
          },
          liquidationPrice: '40000',
          marginUsed: '1500',
          maxLeverage: 100,
          cumulativeFunding: {
            allTime: '50',
            sinceOpen: '10',
            sinceChange: '5',
          },
        },
      ];

      (
        Engine.context.PerpsController.getPositions as jest.Mock
      ).mockResolvedValue(mockPositions);

      const { result } = renderHook(() => usePerpsTrading());

      const response = await result.current.getPositions();

      expect(Engine.context.PerpsController.getPositions).toHaveBeenCalled();
      expect(response).toEqual(mockPositions);
    });
  });

  describe('getAccountState', () => {
    it('should call PerpsController.getAccountState and return account state', async () => {
      const mockAccountState: AccountState = {
        availableBalance: '10000',
        totalBalance: '10000',
        marginUsed: '0',
        unrealizedPnl: '0',
      };

      (
        Engine.context.PerpsController.getAccountState as jest.Mock
      ).mockResolvedValue(mockAccountState);

      const { result } = renderHook(() => usePerpsTrading());

      const params: GetAccountStateParams = {};
      const response = await result.current.getAccountState(params);

      expect(
        Engine.context.PerpsController.getAccountState,
      ).toHaveBeenCalledWith(params);
      expect(response).toEqual(mockAccountState);
    });

    it('should call getAccountState without parameters', async () => {
      const mockAccountState: AccountState = {
        availableBalance: '10000',
        totalBalance: '10000',
        marginUsed: '0',
        unrealizedPnl: '0',
      };

      (
        Engine.context.PerpsController.getAccountState as jest.Mock
      ).mockResolvedValue(mockAccountState);

      const { result } = renderHook(() => usePerpsTrading());

      const response = await result.current.getAccountState();

      expect(
        Engine.context.PerpsController.getAccountState,
      ).toHaveBeenCalledWith(undefined);
      expect(response).toEqual(mockAccountState);
    });
  });

  describe('subscription methods', () => {
    it('should subscribe to prices and return unsubscribe function', () => {
      const mockUnsubscribe = jest.fn();
      (
        Engine.context.PerpsController.subscribeToPrices as jest.Mock
      ).mockReturnValue(mockUnsubscribe);

      const { result } = renderHook(() => usePerpsTrading());

      const subscription: SubscribePricesParams = {
        symbols: ['BTC', 'ETH'],
        callback: jest.fn(),
      };

      const unsubscribe = result.current.subscribeToPrices(subscription);

      expect(
        Engine.context.PerpsController.subscribeToPrices,
      ).toHaveBeenCalledWith(subscription);
      expect(typeof unsubscribe).toBe('function');

      // Test unsubscribe
      unsubscribe();
      expect(mockUnsubscribe).toHaveBeenCalled();
    });

    it('should subscribe to positions and return unsubscribe function', () => {
      const mockUnsubscribe = jest.fn();
      (
        Engine.context.PerpsController.subscribeToPositions as jest.Mock
      ).mockReturnValue(mockUnsubscribe);

      const { result } = renderHook(() => usePerpsTrading());

      const subscription: SubscribePositionsParams = {
        callback: jest.fn(),
      };

      const unsubscribe = result.current.subscribeToPositions(subscription);

      expect(
        Engine.context.PerpsController.subscribeToPositions,
      ).toHaveBeenCalledWith(subscription);
      expect(typeof unsubscribe).toBe('function');

      // Test unsubscribe
      unsubscribe();
      expect(mockUnsubscribe).toHaveBeenCalled();
    });

    it('should subscribe to order fills and return unsubscribe function', () => {
      const mockUnsubscribe = jest.fn();
      (
        Engine.context.PerpsController.subscribeToOrderFills as jest.Mock
      ).mockReturnValue(mockUnsubscribe);

      const { result } = renderHook(() => usePerpsTrading());

      const subscription: SubscribeOrderFillsParams = {
        callback: jest.fn(),
      };

      const unsubscribe = result.current.subscribeToOrderFills(subscription);

      expect(
        Engine.context.PerpsController.subscribeToOrderFills,
      ).toHaveBeenCalledWith(subscription);
      expect(typeof unsubscribe).toBe('function');

      // Test unsubscribe
      unsubscribe();
      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });

  describe('deposit methods', () => {
    it('should call PerpsController.deposit with correct parameters', async () => {
      const mockDepositResult: DepositResult = {
        success: true,
        txHash: '0xabc123',
      };

      (Engine.context.PerpsController.deposit as jest.Mock).mockResolvedValue(
        mockDepositResult,
      );

      const { result } = renderHook(() => usePerpsTrading());

      const depositParams: DepositParams = {
        amount: '1000',
        assetId:
          'eip155:42161/erc20:0xaf88d065e77c8cC2239327C5EDb3A432268e5831/default',
      };

      const response = await result.current.deposit(depositParams);

      expect(Engine.context.PerpsController.deposit).toHaveBeenCalledWith(
        depositParams,
      );
      expect(response).toEqual(mockDepositResult);
    });

    it('should handle deposit errors', async () => {
      const mockError = new Error('Deposit failed');
      (Engine.context.PerpsController.deposit as jest.Mock).mockRejectedValue(
        mockError,
      );

      const { result } = renderHook(() => usePerpsTrading());

      const depositParams: DepositParams = {
        amount: '1000',
        assetId:
          'eip155:42161/erc20:0xaf88d065e77c8cC2239327C5EDb3A432268e5831/default',
      };

      await expect(result.current.deposit(depositParams)).rejects.toThrow(
        'Deposit failed',
      );
    });

    it('should call getDepositRoutes and return routes', () => {
      const mockRoutes: AssetRoute[] = [
        {
          assetId:
            'eip155:42161/erc20:0xaf88d065e77c8cC2239327C5EDb3A432268e5831/default',
          chainId: 'eip155:42161',
          contractAddress: '0x2df1c51e09aecf9cacb7bc98cb1742757f163df7',
        },
      ];

      (
        Engine.context.PerpsController.getDepositRoutes as jest.Mock
      ).mockReturnValue(mockRoutes);

      const { result } = renderHook(() => usePerpsTrading());

      const routes = result.current.getDepositRoutes();

      expect(
        Engine.context.PerpsController.getDepositRoutes,
      ).toHaveBeenCalled();
      expect(routes).toEqual(mockRoutes);
    });

    it('should call resetDepositState', () => {
      const { result } = renderHook(() => usePerpsTrading());

      result.current.resetDepositState();

      expect(
        Engine.context.PerpsController.resetDepositState,
      ).toHaveBeenCalled();
    });
  });

  describe('hook stability', () => {
    it('should return stable function references', () => {
      const { result, rerender } = renderHook(() => usePerpsTrading());

      const initialFunctions = { ...result.current };

      rerender({});

      const updatedFunctions = { ...result.current };

      // All functions should maintain the same reference
      expect(initialFunctions.placeOrder).toBe(updatedFunctions.placeOrder);
      expect(initialFunctions.cancelOrder).toBe(updatedFunctions.cancelOrder);
      expect(initialFunctions.closePosition).toBe(
        updatedFunctions.closePosition,
      );
      expect(initialFunctions.getMarkets).toBe(updatedFunctions.getMarkets);
      expect(initialFunctions.getPositions).toBe(updatedFunctions.getPositions);
      expect(initialFunctions.getAccountState).toBe(
        updatedFunctions.getAccountState,
      );
      expect(initialFunctions.subscribeToPrices).toBe(
        updatedFunctions.subscribeToPrices,
      );
      expect(initialFunctions.subscribeToPositions).toBe(
        updatedFunctions.subscribeToPositions,
      );
      expect(initialFunctions.subscribeToOrderFills).toBe(
        updatedFunctions.subscribeToOrderFills,
      );
      expect(initialFunctions.deposit).toBe(updatedFunctions.deposit);
      expect(initialFunctions.getDepositRoutes).toBe(
        updatedFunctions.getDepositRoutes,
      );
      expect(initialFunctions.resetDepositState).toBe(
        updatedFunctions.resetDepositState,
      );
    });
  });
});
