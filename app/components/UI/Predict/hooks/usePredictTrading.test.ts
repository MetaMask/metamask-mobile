import { renderHook } from '@testing-library/react-native';
import Engine from '../../../../core/Engine';
import { usePredictTrading } from './usePredictTrading';

// Mock Engine
jest.mock('../../../../core/Engine', () => ({
  context: {
    PredictController: {
      getPositions: jest.fn(),
      buy: jest.fn(),
    },
  },
}));

describe('usePredictTrading', () => {
  beforeEach(() => {
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
      });

      expect(
        Engine.context.PredictController.getPositions,
      ).toHaveBeenCalledWith({
        address: '0x1234567890123456789012345678901234567890',
      });
      expect(response).toEqual(mockPositions);
    });

    it('handles errors from PredictController.getPositions', async () => {
      const mockError = new Error('Failed to fetch predict positions');
      (
        Engine.context.PredictController.getPositions as jest.Mock
      ).mockRejectedValue(mockError);

      const { result } = renderHook(() => usePredictTrading());

      await expect(
        result.current.getPositions({
          address: '0x1234567890123456789012345678901234567890',
        }),
      ).rejects.toThrow('Failed to fetch predict positions');
    });
  });

  describe('buy', () => {
    it('calls PredictController.buy and returns result', async () => {
      const mockBuyResult = {
        txMeta: { id: 'tx-123', hash: '0xabc123' },
        providerId: 'provider-789',
      };

      (Engine.context.PredictController.buy as jest.Mock).mockResolvedValue(
        mockBuyResult,
      );

      const { result } = renderHook(() => usePredictTrading());

      const response = await result.current.buy({
        providerId: 'provider-123',
        marketId: 'market-456',
        outcomeId: 'outcome-789',
        outcomeTokenId: 'outcome-token-101',
        amount: 100,
      });

      expect(Engine.context.PredictController.buy).toHaveBeenCalledWith({
        providerId: 'provider-123',
        marketId: 'market-456',
        outcomeId: 'outcome-789',
        outcomeTokenId: 'outcome-token-101',
        amount: 100,
      });
      expect(response).toEqual(mockBuyResult);
    });

    it('handles errors from PredictController.buy', async () => {
      const mockError = new Error('Failed to place buy order');
      (Engine.context.PredictController.buy as jest.Mock).mockRejectedValue(
        mockError,
      );

      const { result } = renderHook(() => usePredictTrading());

      await expect(
        result.current.buy({
          providerId: 'provider-123',
          marketId: 'market-456',
          outcomeId: 'outcome-789',
          outcomeTokenId: 'outcome-token-101',
          amount: 100,
        }),
      ).rejects.toThrow('Failed to place buy order');
    });
  });

  describe('hook stability', () => {
    it('returns stable function references', () => {
      const { result, rerender } = renderHook(() => usePredictTrading());

      const initialGetPositions = result.current.getPositions;
      const initialBuy = result.current.buy;

      rerender({});

      expect(result.current.getPositions).toBe(initialGetPositions);
      expect(result.current.buy).toBe(initialBuy);
    });
  });
});
