import { renderHook, act } from '@testing-library/react-native';
import { usePredictBuyInputState } from './usePredictBuyInputState';

let mockActiveOrder: { amount?: number; isInputFocused?: boolean } | null =
  null;
const mockUpdateActiveOrder = jest.fn();

jest.mock('../../../hooks/usePredictActiveOrder', () => ({
  usePredictActiveOrder: () => ({
    activeOrder: mockActiveOrder,
    updateActiveOrder: mockUpdateActiveOrder,
  }),
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useRoute: () => ({
    params: {
      isConfirming: false,
    },
  }),
}));

describe('usePredictBuyInputState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockActiveOrder = null;
  });

  describe('currentValue', () => {
    it('returns amount from activeOrder when set', () => {
      mockActiveOrder = { amount: 42 };

      const { result } = renderHook(() => usePredictBuyInputState());

      expect(result.current.currentValue).toBe(42);
    });

    it('returns 0 when activeOrder is null', () => {
      mockActiveOrder = null;

      const { result } = renderHook(() => usePredictBuyInputState());

      expect(result.current.currentValue).toBe(0);
    });

    it('returns 0 when activeOrder.amount is undefined', () => {
      mockActiveOrder = {};

      const { result } = renderHook(() => usePredictBuyInputState());

      expect(result.current.currentValue).toBe(0);
    });
  });

  describe('setCurrentValue', () => {
    it('calls updateActiveOrder with new amount', () => {
      mockActiveOrder = { amount: 10 };

      const { result } = renderHook(() => usePredictBuyInputState());

      act(() => {
        result.current.setCurrentValue(20);
      });

      expect(mockUpdateActiveOrder).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 20 }),
      );
    });

    it('sets isUserInputChange to true when value changes and is greater than 0', () => {
      mockActiveOrder = { amount: 5 };

      const { result } = renderHook(() => usePredictBuyInputState());

      act(() => {
        result.current.setCurrentValue(15);
      });

      expect(result.current.isUserInputChange).toBe(true);
    });

    it('clears error when user input detected (amount > 0 and changed)', () => {
      mockActiveOrder = { amount: 5 };

      const { result } = renderHook(() => usePredictBuyInputState());

      act(() => {
        result.current.setCurrentValue(10);
      });

      expect(mockUpdateActiveOrder).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 10, error: null }),
      );
    });

    it('handles updater function (receives previous value)', () => {
      mockActiveOrder = { amount: 5 };

      const { result } = renderHook(() => usePredictBuyInputState());

      act(() => {
        result.current.setCurrentValue((prev) => prev + 5);
      });

      expect(mockUpdateActiveOrder).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 10 }),
      );
    });

    it('does not set isUserInputChange when value set to 0', () => {
      mockActiveOrder = { amount: 5 };

      const { result } = renderHook(() => usePredictBuyInputState());

      act(() => {
        result.current.setCurrentValue(0);
      });

      expect(result.current.isUserInputChange).toBe(false);
    });
  });

  describe('isInputFocused', () => {
    it('returns isInputFocused from activeOrder', () => {
      mockActiveOrder = { isInputFocused: true };

      const { result } = renderHook(() => usePredictBuyInputState());

      expect(result.current.isInputFocused).toBe(true);
    });

    it('returns false when activeOrder is null', () => {
      mockActiveOrder = null;

      const { result } = renderHook(() => usePredictBuyInputState());

      expect(result.current.isInputFocused).toBe(false);
    });

    it('setIsInputFocused calls updateActiveOrder with isInputFocused', () => {
      mockActiveOrder = { isInputFocused: false };

      const { result } = renderHook(() => usePredictBuyInputState());

      act(() => {
        result.current.setIsInputFocused(true);
      });

      expect(mockUpdateActiveOrder).toHaveBeenCalledWith({
        isInputFocused: true,
      });
    });
  });

  describe('isConfirming', () => {
    it('initializes from route params isConfirming', () => {
      const { result } = renderHook(() => usePredictBuyInputState());

      expect(result.current.isConfirming).toBe(false);
    });

    it('setIsConfirming updates the state', () => {
      const { result } = renderHook(() => usePredictBuyInputState());

      act(() => {
        result.current.setIsConfirming(true);
      });

      expect(result.current.isConfirming).toBe(true);
    });
  });

  describe('currentValueUSDString', () => {
    it('initializes as empty string when currentValue is 0', () => {
      mockActiveOrder = null;

      const { result } = renderHook(() => usePredictBuyInputState());

      expect(result.current.currentValueUSDString).toBe('');
    });

    it('initializes as string representation when currentValue exists', () => {
      mockActiveOrder = { amount: 25 };

      const { result } = renderHook(() => usePredictBuyInputState());

      expect(result.current.currentValueUSDString).toBe('25');
    });
  });
});
