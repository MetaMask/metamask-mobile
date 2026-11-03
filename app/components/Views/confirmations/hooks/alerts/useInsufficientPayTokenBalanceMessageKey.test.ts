import { renderHook } from '@testing-library/react-native';
import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useInsufficientPayTokenBalanceMessageKey } from './useInsufficientPayTokenBalanceMessageKey';

jest.mock('../transactions/useTransactionMetadataRequest');

const GENERIC_MESSAGE_KEY =
  'alert_system.insufficient_pay_token_balance.message';
const MONEY_NO_FUNDS_MESSAGE_KEY =
  'alert_system.money_account_no_funds.message';

function runHook(balanceUsd: string) {
  return renderHook(() => useInsufficientPayTokenBalanceMessageKey(balanceUsd));
}

describe('useInsufficientPayTokenBalanceMessageKey', () => {
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

    expect(result.current).toBe(MONEY_NO_FUNDS_MESSAGE_KEY);
  });

  it('returns the Money message key for a sub-cent balance', () => {
    const { result } = runHook('0.009');

    expect(result.current).toBe(MONEY_NO_FUNDS_MESSAGE_KEY);
  });

  it('returns the generic message key for a funded balance', () => {
    const { result } = runHook('5');

    expect(result.current).toBe(GENERIC_MESSAGE_KEY);
  });

  it('returns the generic message key for other transaction types', () => {
    useTransactionMetadataRequestMock.mockReturnValue({
      type: TransactionType.perpsDeposit,
    } as unknown as TransactionMeta);

    const { result } = runHook('0');

    expect(result.current).toBe(GENERIC_MESSAGE_KEY);
  });
});
