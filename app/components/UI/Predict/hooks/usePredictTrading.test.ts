import { renderHook } from '@testing-library/react-native';
import Engine from '../../../../core/Engine';
import { usePredictTrading } from './usePredictTrading';
import { Side } from '../types';

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

  describe('getPositions', () => {
    it('calls PredictController.getPositions and returns positions', async () => {
      const mockPositions = [
        {
          id: 'pos1',
          market: 'BTC/UP',
          side: 'UP',
          size: '10',
          entryPrice: '100',
          payout: '180',
          status: 'OPEN',
        },
      ];

      (
        Engine.context.PredictController.getPositions as jest.Mock
      ).mockResolvedValue(mockPositions);

      const { result } = renderHook(() => usePredictTrading());

      const response = await result.current.getPositions({
        address: '0x1234567890123456789012345678901234567890',
        providerId: 'polymarket',
      });

      expect(
        Engine.context.PredictController.getPositions,
      ).toHaveBeenCalledWith({
        address: '0x1234567890123456789012345678901234567890',
        providerId: 'polymarket',
      });
      expect(response).toEqual(mockPositions);
    });

    it('throws error when PredictController.getPositions fails', async () => {
      const mockError = new Error('Failed to fetch predict positions');
      (
        Engine.context.PredictController.getPositions as jest.Mock
      ).mockRejectedValue(mockError);
      const { result } = renderHook(() => usePredictTrading());

      await expect(
        result.current.getPositions({
          address: '0x1234567890123456789012345678901234567890',
          providerId: 'polymarket',
        }),
      ).rejects.toThrow('Failed to fetch predict positions');
    });
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
        providerId: 'polymarket',
        preview: mockPreview,
      });

      expect(Engine.context.PredictController.placeOrder).toHaveBeenCalledWith({
        providerId: 'polymarket',
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
        providerId: 'polymarket',
        preview: mockPreview,
      });

      expect(Engine.context.PredictController.placeOrder).toHaveBeenCalledWith({
        providerId: 'polymarket',
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
          providerId: 'polymarket',
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
        providerId: 'polymarket',
      });

      expect(
        Engine.context.PredictController.claimWithConfirmation,
      ).toHaveBeenCalledWith({
        providerId: 'polymarket',
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
        result.current.claim({ providerId: 'polymarket' }),
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
        providerId: 'polymarket',
        address: '0x1234567890123456789012345678901234567890',
      });

      expect(Engine.context.PredictController.getBalance).toHaveBeenCalledWith({
        providerId: 'polymarket',
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
          providerId: 'polymarket',
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

      const response = await result.current.getBalance({
        providerId: 'polymarket',
      });

      // The hook calls the controller directly, so the controller handles the default address
      expect(Engine.context.PredictController.getBalance).toHaveBeenCalledWith({
        providerId: 'polymarket',
      });
      expect(response).toBe(mockBalance);
    });
  });

  describe('hook stability', () => {
    it('returns stable function references', () => {
      const { result, rerender } = renderHook(() => usePredictTrading());

      const initialGetPositions = result.current.getPositions;
      const initialPlaceOrder = result.current.placeOrder;
      const initialClaim = result.current.claim;
      const initialGetBalance = result.current.getBalance;
      const initialPreviewOrder = result.current.previewOrder;

      rerender({});

      expect(result.current.getPositions).toBe(initialGetPositions);
      expect(result.current.placeOrder).toBe(initialPlaceOrder);
      expect(result.current.claim).toBe(initialClaim);
      expect(result.current.getBalance).toBe(initialGetBalance);
      expect(result.current.previewOrder).toBe(initialPreviewOrder);
    });
  });
});
