import { CaipAssetId } from '@metamask/utils';
import { renderHook } from '@testing-library/react-native';
import type { Hex } from 'viem';
import Engine from '../../../../core/Engine';
import type {
  AccountState,
  CancelOrderParams,
  CancelOrderResult,
  ClosePositionParams,
  GetAccountStateParams,
  MarketInfo,
  OrderParams,
  OrderResult,
  Position,
  SubscribeOrderFillsParams,
  SubscribePositionsParams,
  SubscribePricesParams,
  WithdrawParams,
  WithdrawResult,
} from '../controllers/types';
import { usePerpsTrading } from './usePerpsTrading';

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
      depositWithConfirmation: jest.fn(),
      clearDepositResult: jest.fn(),
      withdraw: jest.fn(),
      calculateLiquidationPrice: jest.fn(),
      calculateMaintenanceMargin: jest.fn(),
      getMaxLeverage: jest.fn(),
      updatePositionTPSL: jest.fn(),
      calculateFees: jest.fn(),
      validateOrder: jest.fn(),
      validateClosePosition: jest.fn(),
      validateWithdrawal: jest.fn(),
      updateMargin: jest.fn(),
      flipPosition: jest.fn(),
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
          takeProfitCount: 0,
          stopLossCount: 0,
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
        marginUsed: '0',
        unrealizedPnl: '0',
        returnOnEquity: '16.67',
        totalBalance: '10500',
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
        marginUsed: '0',
        unrealizedPnl: '0',
        returnOnEquity: '16.67',
        totalBalance: '10500',
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
    it('should call PerpsController.depositWithConfirmation', async () => {
      const mockResult = {
        result: Promise.resolve('0xabc123'),
      };

      (
        Engine.context.PerpsController.depositWithConfirmation as jest.Mock
      ).mockResolvedValue(mockResult);

      const { result } = renderHook(() => usePerpsTrading());

      const response = await result.current.depositWithConfirmation();

      expect(
        Engine.context.PerpsController.depositWithConfirmation,
      ).toHaveBeenCalled();
      expect(response).toEqual(mockResult);
    });

    it('should call clearDepositResult', () => {
      const { result } = renderHook(() => usePerpsTrading());

      result.current.clearDepositResult();

      expect(
        Engine.context.PerpsController.clearDepositResult,
      ).toHaveBeenCalled();
    });
  });

  describe('withdraw methods', () => {
    it('should call PerpsController.withdraw with correct parameters', async () => {
      const mockWithdrawResult: WithdrawResult = {
        success: true,
        txHash:
          '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      };

      (Engine.context.PerpsController.withdraw as jest.Mock).mockResolvedValue(
        mockWithdrawResult,
      );

      const { result } = renderHook(() => usePerpsTrading());

      const withdrawParams: WithdrawParams = {
        amount: '100.00',
        assetId:
          'eip155:42161/erc20:0xaf88d065e77c8cc2239327c5edb3a432268e5831/default',
      };

      const response = await result.current.withdraw(withdrawParams);

      expect(Engine.context.PerpsController.withdraw).toHaveBeenCalledWith(
        withdrawParams,
      );
      expect(response).toEqual(mockWithdrawResult);
    });

    it('should handle withdraw without destination address', async () => {
      const mockWithdrawResult: WithdrawResult = {
        success: true,
        txHash:
          '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      };

      (Engine.context.PerpsController.withdraw as jest.Mock).mockResolvedValue(
        mockWithdrawResult,
      );

      const { result } = renderHook(() => usePerpsTrading());

      const withdrawParams: WithdrawParams = {
        amount: '50.00',
        assetId:
          'eip155:42161/erc20:0xaf88d065e77c8cc2239327c5edb3a432268e5831' as CaipAssetId,
      };

      const response = await result.current.withdraw(withdrawParams);

      expect(Engine.context.PerpsController.withdraw).toHaveBeenCalledWith(
        withdrawParams,
      );
      expect(response).toEqual(mockWithdrawResult);
    });

    it('should handle withdraw errors', async () => {
      const mockError = new Error('Insufficient balance');
      (Engine.context.PerpsController.withdraw as jest.Mock).mockRejectedValue(
        mockError,
      );

      const { result } = renderHook(() => usePerpsTrading());

      const withdrawParams: WithdrawParams = {
        amount: '10000',
      };

      await expect(result.current.withdraw(withdrawParams)).rejects.toThrow(
        'Insufficient balance',
      );
    });

    it('should handle withdrawal with minimum amount validation', async () => {
      const mockError = new Error(
        'Amount must be greater than $1.01 to cover fees',
      );
      (Engine.context.PerpsController.withdraw as jest.Mock).mockRejectedValue(
        mockError,
      );

      const { result } = renderHook(() => usePerpsTrading());

      const withdrawParams: WithdrawParams = {
        amount: '0.5', // Less than the $1 fee
      };

      await expect(result.current.withdraw(withdrawParams)).rejects.toThrow(
        'Amount must be greater than $1.01 to cover fees',
      );
    });
  });

  describe('calculateFees', () => {
    it('should calculate fees successfully', async () => {
      const mockFeeResult = {
        feeRate: 0.00045,
        feeAmount: 45,
      };

      (
        Engine.context.PerpsController.calculateFees as jest.Mock
      ).mockResolvedValue(mockFeeResult);

      const { result } = renderHook(() => usePerpsTrading());

      const params = {
        orderType: 'market' as const,
        isMaker: false,
        amount: '100000',
        coin: 'BTC',
      };

      const response = await result.current.calculateFees(params);

      expect(Engine.context.PerpsController.calculateFees).toHaveBeenCalledWith(
        params,
      );
      expect(response).toEqual(mockFeeResult);
    });

    it('should return Promise<FeeCalculationResult>', async () => {
      const mockFeeResult = {
        feeRate: 0.00015,
        feeAmount: 15,
      };

      (
        Engine.context.PerpsController.calculateFees as jest.Mock
      ).mockResolvedValue(mockFeeResult);

      const { result } = renderHook(() => usePerpsTrading());

      const params = {
        orderType: 'limit' as const,
        isMaker: true,
        amount: '100000',
        coin: 'BTC',
      };

      const resultPromise = result.current.calculateFees(params);
      expect(resultPromise).toBeInstanceOf(Promise);

      const response = await resultPromise;
      expect(response).toHaveProperty('feeRate');
      expect(response).toHaveProperty('feeAmount');
      expect(response.feeRate).toBe(0.00015);
      expect(response.feeAmount).toBe(15);
    });

    it('should handle fee calculation errors', async () => {
      const mockError = new Error('Fee calculation failed');
      (
        Engine.context.PerpsController.calculateFees as jest.Mock
      ).mockRejectedValue(mockError);

      const { result } = renderHook(() => usePerpsTrading());

      const params = {
        orderType: 'market' as const,
        isMaker: false,
        amount: '100000',
        coin: 'BTC',
      };

      await expect(result.current.calculateFees(params)).rejects.toThrow(
        'Fee calculation failed',
      );
    });

    it('should calculate fees with different order types', async () => {
      const mockMarketFeeResult = {
        feeRate: 0.00045,
        feeAmount: 45,
      };
      const mockLimitFeeResult = {
        feeRate: 0.00015,
        feeAmount: 15,
      };

      const { result } = renderHook(() => usePerpsTrading());

      // Test market order
      (
        Engine.context.PerpsController.calculateFees as jest.Mock
      ).mockResolvedValueOnce(mockMarketFeeResult);

      const marketResult = await result.current.calculateFees({
        orderType: 'market',
        isMaker: false,
        amount: '100000',
        coin: 'BTC',
      });
      expect(marketResult).toEqual(mockMarketFeeResult);

      // Test limit order
      (
        Engine.context.PerpsController.calculateFees as jest.Mock
      ).mockResolvedValueOnce(mockLimitFeeResult);

      const limitResult = await result.current.calculateFees({
        orderType: 'limit',
        isMaker: true,
        amount: '100000',
        coin: 'BTC',
      });
      expect(limitResult).toEqual(mockLimitFeeResult);
    });
  });

  describe('validateOrder', () => {
    it('should call PerpsController.validateOrder with correct parameters', async () => {
      const mockValidationResult = { isValid: true };
      (
        Engine.context.PerpsController.validateOrder as jest.Mock
      ).mockResolvedValue(mockValidationResult);

      const { result } = renderHook(() => usePerpsTrading());

      const orderParams: OrderParams = {
        coin: 'BTC',
        isBuy: true,
        size: '0.5',
        orderType: 'market',
      };

      const response = await result.current.validateOrder(orderParams);

      expect(Engine.context.PerpsController.validateOrder).toHaveBeenCalledWith(
        orderParams,
      );
      expect(response).toEqual(mockValidationResult);
    });

    it('should return validation error', async () => {
      const mockValidationResult = {
        isValid: false,
        error: 'Minimum order size is $10.00',
      };
      (
        Engine.context.PerpsController.validateOrder as jest.Mock
      ).mockResolvedValue(mockValidationResult);

      const { result } = renderHook(() => usePerpsTrading());

      const orderParams: OrderParams = {
        coin: 'BTC',
        isBuy: true,
        size: '0.00001',
        orderType: 'market',
        currentPrice: 50000,
      };

      const response = await result.current.validateOrder(orderParams);

      expect(response.isValid).toBe(false);
      expect(response.error).toBe('Minimum order size is $10.00');
    });
  });

  describe('validateClosePosition', () => {
    it('should call PerpsController.validateClosePosition with correct parameters', async () => {
      const mockValidationResult = { isValid: true };
      (
        Engine.context.PerpsController.validateClosePosition as jest.Mock
      ).mockResolvedValue(mockValidationResult);

      const { result } = renderHook(() => usePerpsTrading());

      const closeParams: ClosePositionParams = {
        coin: 'BTC',
        orderType: 'market',
      };

      const response = await result.current.validateClosePosition(closeParams);

      expect(
        Engine.context.PerpsController.validateClosePosition,
      ).toHaveBeenCalledWith(closeParams);
      expect(response).toEqual(mockValidationResult);
    });

    it('should return validation error for invalid close position', async () => {
      const mockValidationResult = {
        isValid: false,
        error: 'Coin is required',
      };
      (
        Engine.context.PerpsController.validateClosePosition as jest.Mock
      ).mockResolvedValue(mockValidationResult);

      const { result } = renderHook(() => usePerpsTrading());

      const closeParams: ClosePositionParams = {
        coin: '',
        orderType: 'market',
      };

      const response = await result.current.validateClosePosition(closeParams);

      expect(response.isValid).toBe(false);
      expect(response.error).toBe('Coin is required');
    });
  });

  describe('validateWithdrawal', () => {
    it('should call PerpsController.validateWithdrawal with correct parameters', async () => {
      const mockValidationResult = { isValid: true };
      (
        Engine.context.PerpsController.validateWithdrawal as jest.Mock
      ).mockResolvedValue(mockValidationResult);

      const { result } = renderHook(() => usePerpsTrading());

      const withdrawParams: WithdrawParams = {
        amount: '100',
        destination: '0x1234567890123456789012345678901234567890' as Hex,
        assetId:
          'eip155:42161/erc20:0xaf88d065e77c8cc2239327c5edb3a432268e5831/default' as CaipAssetId,
      };

      const response = await result.current.validateWithdrawal(withdrawParams);

      expect(
        Engine.context.PerpsController.validateWithdrawal,
      ).toHaveBeenCalledWith(withdrawParams);
      expect(response).toEqual(mockValidationResult);
    });

    it('should handle validation without errors', async () => {
      const mockValidationResult = { isValid: true };
      (
        Engine.context.PerpsController.validateWithdrawal as jest.Mock
      ).mockResolvedValue(mockValidationResult);

      const { result } = renderHook(() => usePerpsTrading());

      const withdrawParams: WithdrawParams = {
        amount: '100',
      };

      const response = await result.current.validateWithdrawal(withdrawParams);

      expect(response.isValid).toBe(true);
      expect(response.error).toBeUndefined();
    });
  });

  describe('updateMargin', () => {
    it('should call PerpsController.updateMargin with correct parameters', async () => {
      const mockResult = { success: true };
      (
        Engine.context.PerpsController.updateMargin as jest.Mock
      ).mockResolvedValue(mockResult);

      const { result } = renderHook(() => usePerpsTrading());

      const updateMarginParams = {
        coin: 'BTC',
        amount: '100',
      };

      const response = await result.current.updateMargin(updateMarginParams);

      expect(Engine.context.PerpsController.updateMargin).toHaveBeenCalledWith(
        updateMarginParams,
      );
      expect(response).toEqual(mockResult);
    });

    it('should handle updateMargin errors', async () => {
      const mockError = new Error('Insufficient balance');
      (
        Engine.context.PerpsController.updateMargin as jest.Mock
      ).mockRejectedValue(mockError);

      const { result } = renderHook(() => usePerpsTrading());

      const updateMarginParams = {
        coin: 'BTC',
        amount: '100',
      };

      await expect(
        result.current.updateMargin(updateMarginParams),
      ).rejects.toThrow('Insufficient balance');
    });
  });

  describe('flipPosition', () => {
    it('should call PerpsController.flipPosition with correct parameters', async () => {
      const mockResult: OrderResult = {
        success: true,
        orderId: 'flip-123',
        filledSize: '1.0',
        averagePrice: '50000',
      };
      (
        Engine.context.PerpsController.flipPosition as jest.Mock
      ).mockResolvedValue(mockResult);

      const { result } = renderHook(() => usePerpsTrading());

      const flipParams = {
        coin: 'BTC',
        position: {
          coin: 'BTC',
          size: '0.5',
          entryPrice: '50000',
          positionValue: '25000',
          unrealizedPnl: '1000',
          returnOnEquity: '0.04',
          leverage: { type: 'cross' as const, value: 10 },
          liquidationPrice: '45000',
          marginUsed: '2500',
          maxLeverage: 100,
          cumulativeFunding: { allTime: '0', sinceOpen: '0', sinceChange: '0' },
          takeProfitCount: 0,
          stopLossCount: 0,
        },
      };

      const response = await result.current.flipPosition(flipParams);

      expect(Engine.context.PerpsController.flipPosition).toHaveBeenCalledWith(
        flipParams,
      );
      expect(response).toEqual(mockResult);
    });

    it('should handle flipPosition errors', async () => {
      const mockError = new Error('Insufficient balance for flip fees');
      (
        Engine.context.PerpsController.flipPosition as jest.Mock
      ).mockRejectedValue(mockError);

      const { result } = renderHook(() => usePerpsTrading());

      const flipParams = {
        coin: 'BTC',
        position: {
          coin: 'BTC',
          size: '0.5',
          entryPrice: '50000',
          positionValue: '25000',
          unrealizedPnl: '1000',
          returnOnEquity: '0.04',
          leverage: { type: 'cross' as const, value: 10 },
          liquidationPrice: '45000',
          marginUsed: '2500',
          maxLeverage: 100,
          cumulativeFunding: { allTime: '0', sinceOpen: '0', sinceChange: '0' },
          takeProfitCount: 0,
          stopLossCount: 0,
        },
      };

      await expect(result.current.flipPosition(flipParams)).rejects.toThrow(
        'Insufficient balance for flip fees',
      );
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
      expect(initialFunctions.depositWithConfirmation).toBe(
        updatedFunctions.depositWithConfirmation,
      );
      expect(initialFunctions.clearDepositResult).toBe(
        updatedFunctions.clearDepositResult,
      );
      expect(initialFunctions.withdraw).toBe(updatedFunctions.withdraw);
      expect(initialFunctions.calculateLiquidationPrice).toBe(
        updatedFunctions.calculateLiquidationPrice,
      );
      expect(initialFunctions.calculateMaintenanceMargin).toBe(
        updatedFunctions.calculateMaintenanceMargin,
      );
      expect(initialFunctions.getMaxLeverage).toBe(
        updatedFunctions.getMaxLeverage,
      );
      expect(initialFunctions.updatePositionTPSL).toBe(
        updatedFunctions.updatePositionTPSL,
      );
      expect(initialFunctions.calculateFees).toBe(
        updatedFunctions.calculateFees,
      );
      expect(initialFunctions.validateOrder).toBe(
        updatedFunctions.validateOrder,
      );
      expect(initialFunctions.validateClosePosition).toBe(
        updatedFunctions.validateClosePosition,
      );
      expect(initialFunctions.validateWithdrawal).toBe(
        updatedFunctions.validateWithdrawal,
      );
      expect(initialFunctions.updateMargin).toBe(updatedFunctions.updateMargin);
      expect(initialFunctions.flipPosition).toBe(updatedFunctions.flipPosition);
    });
  });
});
