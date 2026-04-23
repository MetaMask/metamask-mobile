import { AlertKeys } from '../../constants/alerts';
import { RowAlertKey } from '../../components/UI/info-row/alert-row/constants';
import { Severity } from '../../types/alerts';
import { strings } from '../../../../../../locales/i18n';
import { useInsufficientMoneyAccountBalanceAlert } from './useInsufficientMoneyAccountBalanceAlert';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import useMoneyAccountBalance from '../../../../UI/Money/hooks/useMoneyAccountBalance';
import { useTokenAmount } from '../useTokenAmount';
import BigNumber from 'bignumber.js';

jest.mock('../transactions/useTransactionMetadataRequest');
jest.mock('../../../../UI/Money/hooks/useMoneyAccountBalance');
jest.mock('../useTokenAmount');

function runHook({ pendingAmount }: { pendingAmount?: string } = {}) {
  return renderHookWithProvider(() =>
    useInsufficientMoneyAccountBalanceAlert({ pendingAmount }),
  );
}

describe('useInsufficientMoneyAccountBalanceAlert', () => {
  const useTransactionMetadataRequestMock = jest.mocked(
    useTransactionMetadataRequest,
  );
  const useMoneyAccountBalanceMock = jest.mocked(useMoneyAccountBalance);
  const useTokenAmountMock = jest.mocked(useTokenAmount);

  beforeEach(() => {
    jest.resetAllMocks();

    useTransactionMetadataRequestMock.mockReturnValue({
      txParams: { from: '0x0' },
      type: TransactionType.moneyAccountWithdraw,
    } as unknown as TransactionMeta);

    useMoneyAccountBalanceMock.mockReturnValue({
      tokenTotal: new BigNumber('100'),
    } as ReturnType<typeof useMoneyAccountBalance>);

    useTokenAmountMock.mockReturnValue({} as ReturnType<typeof useTokenAmount>);
  });

  it('returns alert when pending amount exceeds available balance', () => {
    const { result } = runHook({ pendingAmount: '150' });

    expect(result.current).toEqual([
      {
        key: AlertKeys.InsufficientMoneyAccountBalance,
        field: RowAlertKey.Amount,
        message: strings('alert_system.insufficient_pay_token_balance.message'),
        severity: Severity.Danger,
        isBlocking: true,
      },
    ]);
  });

  it('returns no alert when pending amount equals available balance', () => {
    const { result } = runHook({ pendingAmount: '100' });

    expect(result.current).toStrictEqual([]);
  });

  it('returns no alert when pending amount is less than available balance', () => {
    const { result } = runHook({ pendingAmount: '50' });

    expect(result.current).toStrictEqual([]);
  });

  it('returns no alert when tokenTotal is undefined', () => {
    useMoneyAccountBalanceMock.mockReturnValue({
      tokenTotal: undefined,
    } as ReturnType<typeof useMoneyAccountBalance>);

    const { result } = runHook({ pendingAmount: '150' });

    expect(result.current).toStrictEqual([]);
  });

  it('returns no alert when transaction type is not moneyAccountWithdraw', () => {
    useTransactionMetadataRequestMock.mockReturnValue({
      txParams: { from: '0x0' },
      type: TransactionType.simpleSend,
    } as unknown as TransactionMeta);

    const { result } = runHook({ pendingAmount: '150' });

    expect(result.current).toStrictEqual([]);
  });

  it('returns no alert when no pendingAmount is provided and defaults to zero', () => {
    const { result } = runHook();

    expect(result.current).toStrictEqual([]);
  });

  it('returns alert using amountPrecise when no pendingAmount provided', () => {
    useTokenAmountMock.mockReturnValue({
      amountPrecise: '150',
    } as ReturnType<typeof useTokenAmount>);

    const { result } = runHook();

    expect(result.current).toEqual([
      {
        key: AlertKeys.InsufficientMoneyAccountBalance,
        field: RowAlertKey.Amount,
        message: strings('alert_system.insufficient_pay_token_balance.message'),
        severity: Severity.Danger,
        isBlocking: true,
      },
    ]);
  });

  it('returns no alert when amountPrecise is within balance', () => {
    useTokenAmountMock.mockReturnValue({
      amountPrecise: '50',
    } as ReturnType<typeof useTokenAmount>);

    const { result } = runHook();

    expect(result.current).toStrictEqual([]);
  });
});
