import { renderHook, act } from '@testing-library/react-native';
import { usePredictBuyInputState } from './usePredictBuyInputState';

const mockClearOrderError = jest.fn();

jest.mock('../../../hooks/usePredictActiveOrder', () => ({
  usePredictActiveOrder: () => ({
    clearOrderError: mockClearOrderError,
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
  });

  describe('currentValue', () => {
    it('initializes to 0', () => {
      const { result } = renderHook(() => usePredictBuyInputState());

      expect(result.current.currentValue).toBe(0);
    });
  });

  describe('setCurrentValue', () => {
    it('updates currentValue to the given number', () => {
      const { result } = renderHook(() => usePredictBuyInputState());

      act(() => {
        result.current.setCurrentValue(20);
      });

      expect(result.current.currentValue).toBe(20);
    });

    it('sets isUserInputChange to true when value changes and is greater than 0', () => {
      const { result } = renderHook(() => usePredictBuyInputState());

      act(() => {
        result.current.setCurrentValue(15);
      });

      expect(result.current.isUserInputChange).toBe(true);
    });

    it('calls clearOrderError when user input detected (amount > 0 and changed)', () => {
      const { result } = renderHook(() => usePredictBuyInputState());

      act(() => {
        result.current.setCurrentValue(10);
      });

      expect(mockClearOrderError).toHaveBeenCalled();
    });

    it('handles updater function (receives previous value)', () => {
      const { result } = renderHook(() => usePredictBuyInputState());

      act(() => {
        result.current.setCurrentValue(5);
      });

      act(() => {
        result.current.setCurrentValue((prev) => prev + 5);
      });

      expect(result.current.currentValue).toBe(10);
      expect(mockClearOrderError).toHaveBeenCalled();
    });

    it('does not call clearOrderError when value set to 0', () => {
      const { result } = renderHook(() => usePredictBuyInputState());

      act(() => {
        result.current.setCurrentValue(5);
      });
      mockClearOrderError.mockClear();

      act(() => {
        result.current.setCurrentValue(0);
      });

      expect(mockClearOrderError).not.toHaveBeenCalled();
      expect(result.current.isUserInputChange).toBe(false);
    });
  });

  describe('isInputFocused', () => {
    it('initializes to true', () => {
      const { result } = renderHook(() => usePredictBuyInputState());

      expect(result.current.isInputFocused).toBe(true);
    });

    it('updates isInputFocused via setIsInputFocused', () => {
      const { result } = renderHook(() => usePredictBuyInputState());

      act(() => {
        result.current.setIsInputFocused(false);
      });

      expect(result.current.isInputFocused).toBe(false);
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
      const { result } = renderHook(() => usePredictBuyInputState());

      expect(result.current.currentValueUSDString).toBe('');
    });
  });
});
