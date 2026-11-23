import { renderHook } from '@testing-library/react-native';
import { useIsMoneyAccountPaymentOverride } from './useIsMoneyAccountPaymentOverride';
import { usePayTokenAccountBalance } from './usePayTokenAccountBalance';
import { usePayTokenOrMoneyAccountBalance } from './usePayTokenOrMoneyAccountBalance';
import { useMoneyAccountPayBalance } from './useTransactionPayBalance';

jest.mock('./useIsMoneyAccountPaymentOverride');
jest.mock('./usePayTokenAccountBalance');
jest.mock('./useTransactionPayBalance');

describe('usePayTokenOrMoneyAccountBalance', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    jest.mocked(usePayTokenAccountBalance).mockReturnValue({
      balanceUsd: '0',
      balanceRaw: '0',
    });

    jest.mocked(useMoneyAccountPayBalance).mockReturnValue({
      balanceUsd: 7.56,
      balanceRaw: '7560000',
    });
  });

  it('returns the pay token wallet balance when no Money Account override is active', () => {
    jest.mocked(useIsMoneyAccountPaymentOverride).mockReturnValue(false);
    jest.mocked(usePayTokenAccountBalance).mockReturnValue({
      balanceUsd: '150.75',
      balanceRaw: '150750000',
    });

    const { result } = renderHook(() => usePayTokenOrMoneyAccountBalance());

    expect(result.current).toStrictEqual({
      balanceUsd: '150.75',
      balanceRaw: '150750000',
    });
  });

  it('returns the Money Account redeemable balance when the override is active', () => {
    jest.mocked(useIsMoneyAccountPaymentOverride).mockReturnValue(true);

    const { result } = renderHook(() => usePayTokenOrMoneyAccountBalance());

    expect(result.current).toStrictEqual({
      balanceUsd: '7.56',
      balanceRaw: '7560000',
    });
  });

  it('does not fall back to an empty EOA wallet balance while paying from the Money Account', () => {
    jest.mocked(useIsMoneyAccountPaymentOverride).mockReturnValue(true);
    jest.mocked(usePayTokenAccountBalance).mockReturnValue({
      balanceUsd: '0',
      balanceRaw: '0',
    });

    const { result } = renderHook(() => usePayTokenOrMoneyAccountBalance());

    expect(result.current.balanceUsd).toBe('7.56');
  });
});
