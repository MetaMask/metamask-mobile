import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { useHasProMembership } from './useHasProMembership';
import { selectHasMoneyAccountPlusMembership } from '../selectors/subscriptionController';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

const mockUseSelector = jest.mocked(useSelector);

describe('useHasProMembership', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each([true, false])('returns the selected value %s', (hasMembership) => {
    mockUseSelector.mockReturnValue(hasMembership);

    const { result } = renderHook(() => useHasProMembership());

    expect(mockUseSelector).toHaveBeenCalledWith(
      selectHasMoneyAccountPlusMembership,
    );
    expect(result.current).toBe(hasMembership);
  });
});
