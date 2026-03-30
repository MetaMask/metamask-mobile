import { renderHook } from '@testing-library/react-native';
import Engine from '../../../../core/Engine';
import { usePredictTrading } from './usePredictTrading';
import { Side } from '../types';

import { POLYMARKET_PROVIDER_ID } from '../providers/polymarket/constants';
// Mock Engine
jest.mock('../../../../core/Engine', () => ({
  context: {
    PredictController: {
      getPositions: jest.fn(),
      getClaimablePositions: jest.fn(),
      placeOrder: jest.fn(),
      claim: jest.fn(),
      claimWithConfirmation: jest.fn(),
      calculateBetAmounts: jest.fn(),
      calculateCashOutAmounts: jest.fn(),
      getBalance: jest.fn(),
      deposit: jest.fn(),
      payWithAnyTokenConfirmation: jest.fn(),
      initPayWithAnyToken: jest.fn(),
      previewOrder: jest.fn(),
      prepareWithdraw: jest.fn(),
      depositWithConfirmation: jest.fn(),
    },
  },
}));

describe('usePredictTrading', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('placeOrder', () => {
    it('calls PredictController.placeOrder for buy and returns result', async () => {
      const mockBuyResult = {
        txMeta: { id: 'tx-123', hash: '0xabc123' },
        providerId: 'provider-789',
      };

      (
        Engine.context.PredictController.placeOrder as jest.Mock
      ).mockResolvedValue(mockBuyResult);

      const { result } = renderHook(() => usePredictTrading());

      const mockPreview = {
        marketId: 'market-1',
        outcomeId: 'outcome-789',
        outcomeTokenId: 'outcome-token-101',
        timestamp: Date.now(),
        side: Side.BUY,
        sharePrice: 0.5,
        maxAmountSpent: 100,
        minAmountReceived: 180,
        slippage: 0.01,
        tickSize: 0.01,
        minOrderSize: 1,
        negRisk: false,
      };

      const response = await result.current.placeOrder({
        preview: mockPreview,
      });

      expect(Engine.context.PredictController.placeOrder).toHaveBeenCalledWith({
        preview: mockPreview,
      });
      expect(response).toEqual(mockBuyResult);
    });

    it('calls PredictController.placeOrder for sell and returns result', async () => {
      const mockSellResult = {
        txMeta: { id: 'tx-456', hash: '0xdef456' },
        success: true,
      };

      (
        Engine.context.PredictController.placeOrder as jest.Mock
      ).mockResolvedValue(mockSellResult);

      const { result } = renderHook(() => usePredictTrading());

      const mockPreview = {
        marketId: 'market-1',
        outcomeId: 'outcome-101',
        outcomeTokenId: 'outcome-token-202',
        timestamp: Date.now(),
        side: Side.SELL,
        sharePrice: 0.7,
        maxAmountSpent: 50,
        minAmountReceived: 35,
        slippage: 0.005,
        tickSize: 0.01,
        minOrderSize: 1,
        negRisk: false,
      };

      const response = await result.current.placeOrder({
        preview: mockPreview,
      });

      expect(Engine.context.PredictController.placeOrder).toHaveBeenCalledWith({
        preview: mockPreview,
      });
      expect(response).toEqual(mockSellResult);
    });

    it('throws error when PredictController.placeOrder fails', async () => {
      const mockError = new Error('Failed to place order');
      (
        Engine.context.PredictController.placeOrder as jest.Mock
      ).mockRejectedValue(mockError);
      const { result } = renderHook(() => usePredictTrading());
      const mockPreview = {
        marketId: 'market-1',
        outcomeId: 'outcome-789',
        outcomeTokenId: 'outcome-token-101',
        timestamp: Date.now(),
        side: Side.BUY,
        sharePrice: 0.5,
        maxAmountSpent: 100,
        minAmountReceived: 180,
        slippage: 0.01,
        tickSize: 0.01,
        minOrderSize: 1,
        negRisk: false,
      };

      await expect(
        result.current.placeOrder({
          preview: mockPreview,
        }),
      ).rejects.toThrow('Failed to place order');
    });
  });

  describe('claim', () => {
    it('calls PredictController.claim and returns result', async () => {
      const mockClaimResult = {
        txMeta: { id: 'tx-789', hash: '0xghi789' },
        success: true,
        claimedAmount: 175,
      };

      (
        Engine.context.PredictController.claimWithConfirmation as jest.Mock
      ).mockResolvedValue(mockClaimResult);

      const { result } = renderHook(() => usePredictTrading());

      const response = await result.current.claim({
        providerId: POLYMARKET_PROVIDER_ID,
      });

      expect(
        Engine.context.PredictController.claimWithConfirmation,
      ).toHaveBeenCalledWith({
        providerId: POLYMARKET_PROVIDER_ID,
      });
      expect(response).toEqual(mockClaimResult);
    });

    it('throws error when PredictController.claim fails', async () => {
      const mockError = new Error('Failed to claim winnings');
      (
        Engine.context.PredictController.claimWithConfirmation as jest.Mock
      ).mockRejectedValue(mockError);
      const { result } = renderHook(() => usePredictTrading());

      await expect(
        result.current.claim({ providerId: POLYMARKET_PROVIDER_ID }),
      ).rejects.toThrow('Failed to claim winnings');
    });
  });

  describe('getBalance', () => {
    it('calls PredictController.getBalance and returns balance', async () => {
      const mockBalance = 1500.75;

      (
        Engine.context.PredictController.getBalance as jest.Mock
      ).mockResolvedValue(mockBalance);

      const { result } = renderHook(() => usePredictTrading());

      const response = await result.current.getBalance({
        address: '0x1234567890123456789012345678901234567890',
      });

      expect(Engine.context.PredictController.getBalance).toHaveBeenCalledWith({
        address: '0x1234567890123456789012345678901234567890',
      });
      expect(response).toBe(mockBalance);
    });

    it('throws error when PredictController.getBalance fails', async () => {
      const mockError = new Error('Failed to fetch balance');
      (
        Engine.context.PredictController.getBalance as jest.Mock
      ).mockRejectedValue(mockError);
      const { result } = renderHook(() => usePredictTrading());

      await expect(
        result.current.getBalance({
          address: '0x1234567890123456789012345678901234567890',
        }),
      ).rejects.toThrow('Failed to fetch balance');
    });

    it('calls getBalance with default address when not provided', async () => {
      const mockBalance = 500.0;

      (
        Engine.context.PredictController.getBalance as jest.Mock
      ).mockResolvedValue(mockBalance);

      const { result } = renderHook(() => usePredictTrading());

      const response = await result.current.getBalance({});

      // The hook calls the controller directly, so the controller handles the default address
      expect(Engine.context.PredictController.getBalance).toHaveBeenCalledWith(
        {},
      );
      expect(response).toBe(mockBalance);
    });
  });

  describe('initPayWithAnyToken', () => {
    it('calls PredictController.initPayWithAnyToken and returns result', async () => {
      const mockResult = {
        success: true,
        response: { batchId: 'batch-123' },
      };

      (
        Engine.context.PredictController.initPayWithAnyToken as jest.Mock
      ).mockResolvedValue(mockResult);

      const { result } = renderHook(() => usePredictTrading());

      const response = await result.current.initPayWithAnyToken();

      expect(
        Engine.context.PredictController.initPayWithAnyToken,
      ).toHaveBeenCalled();
      expect(response).toEqual(mockResult);
    });

    it('throws error when PredictController.initPayWithAnyToken fails', async () => {
      const mockError = new Error('Failed to initialize pay with any token');
      (
        Engine.context.PredictController.initPayWithAnyToken as jest.Mock
      ).mockRejectedValue(mockError);
      const { result } = renderHook(() => usePredictTrading());

      await expect(result.current.initPayWithAnyToken()).rejects.toThrow(
        'Failed to initialize pay with any token',
      );
    });
  });

  describe('previewOrder', () => {
    it('calls PredictController.previewOrder and returns result', async () => {
      const mockPreviewResult = {
        marketId: 'market-1',
        outcomeId: 'outcome-789',
        outcomeTokenId: 'outcome-token-101',
        timestamp: Date.now(),
        side: Side.BUY,
        sharePrice: 0.5,
        maxAmountSpent: 100,
        minAmountReceived: 180,
        slippage: 0.01,
        tickSize: 0.01,
        minOrderSize: 1,
        negRisk: false,
      };

      (
        Engine.context.PredictController.previewOrder as jest.Mock
      ).mockResolvedValue(mockPreviewResult);

      const { result } = renderHook(() => usePredictTrading());

      const params = {
        marketId: 'market-1',
        outcomeId: 'outcome-789',
        outcomeTokenId: 'outcome-token-101',
        side: Side.BUY,
        size: 100,
      };

      const response = await result.current.previewOrder(params);

      expect(
        Engine.context.PredictController.previewOrder,
      ).toHaveBeenCalledWith(params);
      expect(response).toEqual(mockPreviewResult);
    });

    it('throws error when PredictController.previewOrder fails', async () => {
      const mockError = new Error('Failed to preview order');
      (
        Engine.context.PredictController.previewOrder as jest.Mock
      ).mockRejectedValue(mockError);

      const { result } = renderHook(() => usePredictTrading());

      const params = {
        marketId: 'market-1',
        outcomeId: 'outcome-789',
        outcomeTokenId: 'outcome-token-101',
        side: Side.BUY,
        size: 100,
      };

      await expect(result.current.previewOrder(params)).rejects.toThrow(
        'Failed to preview order',
      );
    });
  });

  describe('prepareWithdraw', () => {
    it('calls PredictController.prepareWithdraw and returns result', async () => {
      const mockWithdrawResult = {
        txMeta: { id: 'tx-withdraw-123', hash: '0xwithdraw123' },
        success: true,
        amount: 500,
      };

      (
        Engine.context.PredictController.prepareWithdraw as jest.Mock
      ).mockResolvedValue(mockWithdrawResult);

      const { result } = renderHook(() => usePredictTrading());

      const params = {};

      const response = await result.current.prepareWithdraw(params);

      expect(
        Engine.context.PredictController.prepareWithdraw,
      ).toHaveBeenCalledWith(params);
      expect(response).toEqual(mockWithdrawResult);
    });

    it('throws error when PredictController.prepareWithdraw fails', async () => {
      const mockError = new Error('Failed to prepare withdraw');
      (
        Engine.context.PredictController.prepareWithdraw as jest.Mock
      ).mockRejectedValue(mockError);

      const { result } = renderHook(() => usePredictTrading());

      const params = {};

      await expect(result.current.prepareWithdraw(params)).rejects.toThrow(
        'Failed to prepare withdraw',
      );
    });
  });

  describe('deposit', () => {
    it('calls PredictController.depositWithConfirmation and returns result', async () => {
      const mockDepositResult = {
        txMeta: { id: 'tx-deposit-456', hash: '0xdeposit456' },
        success: true,
        depositedAmount: 1000,
      };

      (
        Engine.context.PredictController.depositWithConfirmation as jest.Mock
      ).mockResolvedValue(mockDepositResult);

      const { result } = renderHook(() => usePredictTrading());

      const params = {};

      const response = await result.current.deposit(params);

      expect(
        Engine.context.PredictController.depositWithConfirmation,
      ).toHaveBeenCalledWith(params);
      expect(response).toEqual(mockDepositResult);
    });

    it('throws error when PredictController.depositWithConfirmation fails', async () => {
      const mockError = new Error('Failed to deposit');
      (
        Engine.context.PredictController.depositWithConfirmation as jest.Mock
      ).mockRejectedValue(mockError);

      const { result } = renderHook(() => usePredictTrading());

      const params = {};

      await expect(result.current.deposit(params)).rejects.toThrow(
        'Failed to deposit',
      );
    });
  });

  describe('hook stability', () => {
    it('returns stable function references', () => {
      const { result, rerender } = renderHook(() => usePredictTrading());

      const initialPlaceOrder = result.current.placeOrder;
      const initialClaim = result.current.claim;
      const initialGetBalance = result.current.getBalance;
      const initialPreviewOrder = result.current.previewOrder;
      const initialPrepareWithdraw = result.current.prepareWithdraw;
      const initialDeposit = result.current.deposit;
      const initialInitPayWithAnyToken = result.current.initPayWithAnyToken;

      rerender({});

      expect(result.current.placeOrder).toBe(initialPlaceOrder);
      expect(result.current.claim).toBe(initialClaim);
      expect(result.current.getBalance).toBe(initialGetBalance);
      expect(result.current.previewOrder).toBe(initialPreviewOrder);
      expect(result.current.prepareWithdraw).toBe(initialPrepareWithdraw);
      expect(result.current.deposit).toBe(initialDeposit);
      expect(result.current.initPayWithAnyToken).toBe(
        initialInitPayWithAnyToken,
      );
    });
  });
});
