import { renderHook } from '@testing-library/react-hooks';
import useIsZeroBalanceAccount from './useIsZeroBalanceAccount';

const mockSelectAccountGroupBalanceForEmptyState = jest.fn();

jest.mock('../../../../../../selectors/assets/balances', () => ({
  selectAccountGroupBalanceForEmptyState: () =>
    mockSelectAccountGroupBalanceForEmptyState(),
}));

jest.mock('react-redux', () => ({
  useSelector: (selector: () => unknown) => selector(),
}));

describe('useIsZeroBalanceAccount', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns true when account has zero balance', () => {
    mockSelectAccountGroupBalanceForEmptyState.mockReturnValue({
      totalBalanceInUserCurrency: 0,
    });

    const { result } = renderHook(() => useIsZeroBalanceAccount());

    expect(result.current).toBe(true);
  });

  it('returns false when account has non-zero balance', () => {
    mockSelectAccountGroupBalanceForEmptyState.mockReturnValue({
      totalBalanceInUserCurrency: 100,
    });

    const { result } = renderHook(() => useIsZeroBalanceAccount());

    expect(result.current).toBe(false);
  });

  it('returns false when account group balance is null', () => {
    mockSelectAccountGroupBalanceForEmptyState.mockReturnValue(null);

    const { result } = renderHook(() => useIsZeroBalanceAccount());

    expect(result.current).toBe(false);
  });

  it('returns false when account group balance is undefined', () => {
    mockSelectAccountGroupBalanceForEmptyState.mockReturnValue(undefined);

    const { result } = renderHook(() => useIsZeroBalanceAccount());

    expect(result.current).toBe(false);
  });
});
