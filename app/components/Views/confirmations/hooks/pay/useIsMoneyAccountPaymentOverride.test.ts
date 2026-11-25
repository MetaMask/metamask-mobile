import { PaymentOverride } from '@metamask/transaction-pay-controller';
import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useIsMoneyAccountPaymentOverride } from './useIsMoneyAccountPaymentOverride';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));
jest.mock('../transactions/useTransactionMetadataRequest');

describe('useIsMoneyAccountPaymentOverride', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useTransactionMetadataRequest).mockReturnValue({
      id: 'transaction-id',
    } as ReturnType<typeof useTransactionMetadataRequest>);
  });

  it('returns true when Money Account payment override is active', () => {
    jest.mocked(useSelector).mockReturnValue(PaymentOverride.MoneyAccount);

    const { result } = renderHook(() => useIsMoneyAccountPaymentOverride());

    expect(result.current).toBe(true);
  });

  it('returns false when Money Account payment override is not active', () => {
    jest.mocked(useSelector).mockReturnValue(undefined);

    const { result } = renderHook(() => useIsMoneyAccountPaymentOverride());

    expect(result.current).toBe(false);
  });
});
