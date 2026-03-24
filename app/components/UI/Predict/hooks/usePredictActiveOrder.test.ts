import { renderHook, act } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { usePredictActiveOrder } from './usePredictActiveOrder';
import { ActiveOrderState, Recurrence } from '../types';

jest.mock('../../../../core/Engine', () => ({
  context: {
    PredictController: {
      clearActiveOrder: jest.fn(),
      clearOrderError: jest.fn(),
      initializeOrder: jest.fn(),
    },
  },
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../utils/analytics', () => ({
  parseAnalyticsProperties: jest.fn(() => ({ marketId: 'market-1' })),
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

describe('usePredictActiveOrder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector.mockReturnValue(undefined);
  });

  describe('clearOrderError', () => {
    it('delegates to PredictController.clearOrderError', () => {
      const { result } = renderHook(() => usePredictActiveOrder());

      act(() => {
        result.current.clearOrderError();
      });

      expect(
        Engine.context.PredictController.clearOrderError,
      ).toHaveBeenCalled();
    });
  });

  describe('return values', () => {
    it('returns activeOrder from useSelector', () => {
      const mockActiveOrder = {
        state: ActiveOrderState.PREVIEW,
        isInputFocused: true,
      };
      mockUseSelector.mockReturnValue(mockActiveOrder);

      const { result } = renderHook(() => usePredictActiveOrder());

      expect(result.current.activeOrder).toEqual(mockActiveOrder);
    });
  });
});
