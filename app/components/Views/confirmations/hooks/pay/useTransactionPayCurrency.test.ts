import { renderHook } from '@testing-library/react-hooks';
import { TransactionType } from '@metamask/transaction-controller';
import { useTransactionPayCurrency } from './useTransactionPayCurrency';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';

jest.mock('../transactions/useTransactionMetadataRequest');

describe('useTransactionPayCurrency', () => {
  const useTransactionMetadataRequestMock = jest.mocked(
    useTransactionMetadataRequest,
  );

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it.each([
    TransactionType.moneyAccountDeposit,
    TransactionType.moneyAccountWithdraw,
    TransactionType.musdConversion,
    TransactionType.perpsDeposit,
    TransactionType.perpsDepositAndOrder,
    TransactionType.perpsWithdraw,
    TransactionType.predictDeposit,
    TransactionType.predictDepositAndOrder,
    TransactionType.predictWithdraw,
  ])('returns USD for pay-flow transaction type %s', (type) => {
    useTransactionMetadataRequestMock.mockReturnValue({
      type,
    } as ReturnType<typeof useTransactionMetadataRequest>);

    const { result } = renderHook(() => useTransactionPayCurrency());
    expect(result.current).toBe('USD');
  });

  it('returns undefined for musdClaim (USER_CURRENCY_TYPES exception)', () => {
    useTransactionMetadataRequestMock.mockReturnValue({
      type: TransactionType.musdClaim,
    } as ReturnType<typeof useTransactionMetadataRequest>);

    const { result } = renderHook(() => useTransactionPayCurrency());
    expect(result.current).toBeUndefined();
  });

  it('returns undefined for non-pay-flow transaction types', () => {
    useTransactionMetadataRequestMock.mockReturnValue({
      type: TransactionType.simpleSend,
    } as ReturnType<typeof useTransactionMetadataRequest>);

    const { result } = renderHook(() => useTransactionPayCurrency());
    expect(result.current).toBeUndefined();
  });

  it('returns undefined when transaction metadata is undefined', () => {
    useTransactionMetadataRequestMock.mockReturnValue(undefined);

    const { result } = renderHook(() => useTransactionPayCurrency());
    expect(result.current).toBeUndefined();
  });

  it('returns USD for a batch transaction whose nested type is a pay-flow type', () => {
    useTransactionMetadataRequestMock.mockReturnValue({
      type: TransactionType.batch,
      nestedTransactions: [{ type: TransactionType.perpsDepositAndOrder }],
    } as ReturnType<typeof useTransactionMetadataRequest>);

    const { result } = renderHook(() => useTransactionPayCurrency());
    expect(result.current).toBe('USD');
  });
});
