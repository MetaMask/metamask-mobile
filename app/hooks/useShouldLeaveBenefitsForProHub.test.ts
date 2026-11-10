import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { useShouldLeaveBenefitsForProHub } from './useShouldLeaveBenefitsForProHub';
import { selectShouldLeaveBenefitsForProHub } from '../selectors/subscriptionController';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

const mockUseSelector = jest.mocked(useSelector);

describe('useShouldLeaveBenefitsForProHub', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each([true, false])(
    'returns the selected value %s',
    (shouldLeaveBenefits) => {
      mockUseSelector.mockReturnValue(shouldLeaveBenefits);

      const { result } = renderHook(() => useShouldLeaveBenefitsForProHub());

      expect(mockUseSelector).toHaveBeenCalledWith(
        selectShouldLeaveBenefitsForProHub,
      );
      expect(result.current).toBe(shouldLeaveBenefits);
    },
  );
});
