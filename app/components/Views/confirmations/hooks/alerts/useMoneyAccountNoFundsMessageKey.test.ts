import { renderHook } from '@testing-library/react-native';
import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useMoneyAccountNoFundsMessageKey } from './useMoneyAccountNoFundsMessageKey';

jest.mock('../transactions/useTransactionMetadataRequest');

function runHook(balanceUsd: string) {
  return renderHook(() => useMoneyAccountNoFundsMessageKey(balanceUsd));
}

describe('useMoneyAccountNoFundsMessageKey', () => {
  const useTransactionMetadataRequestMock = jest.mocked(
    useTransactionMetadataRequest,
  );

  beforeEach(() => {
    useTransactionMetadataRequestMock.mockReturnValue({
      type: TransactionType.moneyAccountWithdraw,
    } as unknown as TransactionMeta);
  });

  it('returns the Money message key for a zero balance', () => {
    const { result } = runHook('0');

    expect(result.current).toBe('alert_system.money_account_no_funds.message');
  });

  it('returns the Money message key for a sub-cent balance', () => {
    const { result } = runHook('0.009');

    expect(result.current).toBe('alert_system.money_account_no_funds.message');
  });

  it('returns undefined for a funded balance', () => {
    const { result } = runHook('5');

    expect(result.current).toBeUndefined();
  });

  it('returns undefined for other transaction types', () => {
    useTransactionMetadataRequestMock.mockReturnValue({
      type: TransactionType.perpsDeposit,
    } as unknown as TransactionMeta);

    const { result } = runHook('0');

    expect(result.current).toBeUndefined();
  });
});
