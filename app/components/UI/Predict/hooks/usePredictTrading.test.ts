import { renderHook } from '@testing-library/react-native';
import Engine from '../../../../core/Engine';
import { usePredictTrading } from './usePredictTrading';
import { Recurrence, PredictCategory } from '../types';

// Mock Engine
jest.mock('../../../../core/Engine', () => ({
  context: {
    PredictController: {
      getPositions: jest.fn(),
      buy: jest.fn(),
      sell: jest.fn(),
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
    const mockMarket = {
      id: 'market-456',
      providerId: 'provider-123',
      slug: 'btc-up',
      title: 'Will BTC go up?',
      description: 'Predict if Bitcoin will increase in price',
      image: 'btc-image.png',
      status: 'open' as const,
      recurrence: Recurrence.NONE,
      categories: ['crypto' as PredictCategory],
      outcomes: [],
    };

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
        market: mockMarket,
        outcomeId: 'outcome-789',
        outcomeTokenId: 'outcome-token-101',
        amount: 100,
      });

      expect(Engine.context.PredictController.buy).toHaveBeenCalledWith({
        market: mockMarket,
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
          market: mockMarket,
          outcomeId: 'outcome-789',
          outcomeTokenId: 'outcome-token-101',
          amount: 100,
        }),
      ).rejects.toThrow('Failed to place buy order');
    });
  });

  describe('sell', () => {
    const mockPosition = {
      id: 'position-123',
      providerId: 'provider-456',
      marketId: 'market-789',
      outcomeId: 'outcome-101',
      outcome: 'UP',
      outcomeTokenId: 'outcome-token-202',
      title: 'BTC UP',
      icon: 'btc-icon.png',
      amount: 50,
      price: 1.5,
      status: 'open' as const,
      size: 50,
      outcomeIndex: 0,
      realizedPnl: 0,
      curPrice: 1.8,
      conditionId: 'condition-303',
      percentPnl: 20,
      cashPnl: 10,
      redeemable: false,
      initialValue: 50,
      avgPrice: 1.5,
      currentValue: 90,
      endDate: '2025-12-31',
    };

    it('calls PredictController.sell and returns result', async () => {
      const mockSellResult = {
        txMeta: { id: 'tx-456', hash: '0xdef456' },
        success: true,
      };

      (Engine.context.PredictController.sell as jest.Mock).mockResolvedValue(
        mockSellResult,
      );

      const { result } = renderHook(() => usePredictTrading());

      const response = await result.current.sell({
        position: mockPosition,
        outcomeId: 'outcome-101',
        outcomeTokenId: 'outcome-token-202',
        quantity: 25,
      });

      expect(Engine.context.PredictController.sell).toHaveBeenCalledWith({
        position: mockPosition,
        outcomeId: 'outcome-101',
        outcomeTokenId: 'outcome-token-202',
        quantity: 25,
      });
      expect(response).toEqual(mockSellResult);
    });

    it('handles errors from PredictController.sell', async () => {
      const mockError = new Error('Failed to place sell order');
      (Engine.context.PredictController.sell as jest.Mock).mockRejectedValue(
        mockError,
      );

      const { result } = renderHook(() => usePredictTrading());

      await expect(
        result.current.sell({
          position: mockPosition,
          outcomeId: 'outcome-101',
          outcomeTokenId: 'outcome-token-202',
          quantity: 25,
        }),
      ).rejects.toThrow('Failed to place sell order');
    });
  });

  describe('hook stability', () => {
    it('returns stable function references', () => {
      const { result, rerender } = renderHook(() => usePredictTrading());

      const initialGetPositions = result.current.getPositions;
      const initialBuy = result.current.buy;
      const initialSell = result.current.sell;

      rerender({});

      expect(result.current.getPositions).toBe(initialGetPositions);
      expect(result.current.buy).toBe(initialBuy);
      expect(result.current.sell).toBe(initialSell);
    });
  });
});
