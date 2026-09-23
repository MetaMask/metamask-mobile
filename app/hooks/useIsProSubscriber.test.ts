import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { useIsProSubscriber } from './useIsProSubscriber';
import { selectIsMoneyAccountPlusSubscriber } from '../selectors/subscriptionController';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

const mockUseSelector = jest.mocked(useSelector);

describe('useIsProSubscriber', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each([true, false])('returns the selected value %s', (isSubscriber) => {
    mockUseSelector.mockReturnValue(isSubscriber);

    const { result } = renderHook(() => useIsProSubscriber());

    expect(mockUseSelector).toHaveBeenCalledWith(
      selectIsMoneyAccountPlusSubscriber,
    );
    expect(result.current).toBe(isSubscriber);
  });
});
