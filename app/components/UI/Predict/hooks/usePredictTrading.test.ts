import { renderHook } from '@testing-library/react-native';
import Engine from '../../../../core/Engine';
import { usePredictTrading } from './usePredictTrading';

// Mock Engine
jest.mock('../../../../core/Engine', () => ({
  context: {
    PredictController: {
      getPositions: jest.fn(),
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

      const response = await result.current.getPositions();

      expect(Engine.context.PredictController.getPositions).toHaveBeenCalled();
      expect(response).toEqual(mockPositions);
    });

    it('handles errors from PredictController.getPositions', async () => {
      const mockError = new Error('Failed to fetch predict positions');
      (
        Engine.context.PredictController.getPositions as jest.Mock
      ).mockRejectedValue(mockError);

      const { result } = renderHook(() => usePredictTrading());

      await expect(result.current.getPositions()).rejects.toThrow(
        'Failed to fetch predict positions',
      );
    });
  });

  describe('hook stability', () => {
    it('returns stable function references', () => {
      const { result, rerender } = renderHook(() => usePredictTrading());

      const initialGetPositions = result.current.getPositions;

      rerender({});

      expect(result.current.getPositions).toBe(initialGetPositions);
    });
  });
});
