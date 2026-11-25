import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { selectPredictAvailability } from './selectPredictAvailability';
import { usePredictAvailability } from './usePredictAvailability';

jest.mock('react-redux', () => ({ useSelector: jest.fn() }));

const mockUseSelector = jest.mocked(useSelector);

describe('usePredictAvailability', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each([true, false])(
    'returns selectPredictAvailability from the store (%s)',
    (available) => {
      mockUseSelector.mockReturnValue(available);

      const { result } = renderHook(() => usePredictAvailability());

      expect(mockUseSelector).toHaveBeenCalledWith(selectPredictAvailability);
      expect(result.current).toBe(available);
    },
  );
});
