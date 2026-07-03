import { AlertKeys } from '../../constants/alerts';
import { RowAlertKey } from '../../components/UI/info-row/alert-row/constants';
import { Severity } from '../../types/alerts';
import { strings } from '../../../../../../locales/i18n';
import { useInsufficientPredictBalanceAlert } from './useInsufficientPredictBalanceAlert';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { useTokenAmount } from '../useTokenAmount';
import {
  useTransactionPayQuotes,
  useTransactionPayTotals,
} from '../pay/useTransactionPayData';
import {
  TransactionPayQuote,
  TransactionPayTotals,
} from '@metamask/transaction-pay-controller';
import { Json } from '@metamask/utils';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { usePredictBalance } from '../../../../UI/Predict/hooks/usePredictBalance';

jest.mock('../transactions/useTransactionMetadataRequest');
jest.mock('../useTokenAmount');
jest.mock('../../../../UI/Predict/hooks/usePredictBalance');
jest.mock('../pay/useTransactionPayData');

function runHook({ pendingAmount }: { pendingAmount?: string } = {}) {
  return renderHookWithProvider(() =>
    useInsufficientPredictBalanceAlert({ pendingAmount }),
  );
}

describe('useInsufficientPredictBalanceAlert', () => {
  const useTokenAmountMock = jest.mocked(useTokenAmount);
  const usePredictBalanceMock = jest.mocked(usePredictBalance);
  const useTransactionPayTotalsMock = jest.mocked(useTransactionPayTotals);

  const useTransactionMetadataRequestMock = jest.mocked(
    useTransactionMetadataRequest,
  );

  beforeEach(() => {
    jest.resetAllMocks();

    useTransactionMetadataRequestMock.mockReturnValue({
      txParams: {
        from: '0x0',
      },
      type: TransactionType.predictWithdraw,
    } as unknown as TransactionMeta);

    useTokenAmountMock.mockReturnValue({} as ReturnType<typeof useTokenAmount>);
    usePredictBalanceMock.mockReturnValue({ data: 1233.99 } as never);
    useTransactionPayTotalsMock.mockReturnValue(undefined);
    jest.mocked(useTransactionPayQuotes).mockReturnValue(undefined);
  });

  it('returns alert if predict balance less than pending amount', () => {
    const { result } = runHook({ pendingAmount: '1234' });

    expect(result.current).toEqual([
      {
        key: AlertKeys.InsufficientPredictBalance,
        field: RowAlertKey.Amount,
        title: strings('alert_system.insufficient_pay_token_balance.message'),
        message: strings(
          'alert_system.insufficient_pay_method_balance.message',
        ),
        severity: Severity.Danger,
        isBlocking: true,
      },
    ]);
  });

  it('returns alert if predict balance less than token amount', () => {
    useTokenAmountMock.mockReturnValue({ amountPrecise: '1234' } as ReturnType<
      typeof useTokenAmount
    >);

    const { result } = runHook();

    expect(result.current).toEqual([
      {
        key: AlertKeys.InsufficientPredictBalance,
        field: RowAlertKey.Amount,
        title: strings('alert_system.insufficient_pay_token_balance.message'),
        message: strings(
          'alert_system.insufficient_pay_method_balance.message',
        ),
        severity: Severity.Danger,
        isBlocking: true,
      },
    ]);
  });

  it('returns no alert if predict balance is greater than token amount', () => {
    useTokenAmountMock.mockReturnValue({
      amountPrecise: '1233.98',
    } as ReturnType<typeof useTokenAmount>);

    const { result } = runHook();

    expect(result.current).toStrictEqual([]);
  });

  it('returns no alert if predict balance is greater than pending amount', () => {
    const { result } = runHook({ pendingAmount: '1233.98' });

    expect(result.current).toStrictEqual([]);
  });

  it('returns no alert if not predict withdraw', () => {
    useTransactionMetadataRequestMock.mockReturnValue({
      txParams: {
        from: '0x0',
      },
      type: TransactionType.simpleSend,
    } as unknown as TransactionMeta);

    useTokenAmountMock.mockReturnValue({ amountPrecise: '1234' } as ReturnType<
      typeof useTokenAmount
    >);

    const { result } = runHook();

    expect(result.current).toStrictEqual([]);
  });

  it('returns alert when amount + fees exceed predict balance', () => {
    usePredictBalanceMock.mockReturnValue({ data: 0.04 } as never);
    useTokenAmountMock.mockReturnValue({
      amountPrecise: '0.04',
    } as ReturnType<typeof useTokenAmount>);

    jest
      .mocked(useTransactionPayQuotes)
      .mockReturnValue([{} as TransactionPayQuote<Json>]);

    useTransactionPayTotalsMock.mockReturnValue({
      fees: {
        provider: { usd: '0.05' },
        sourceNetwork: { estimate: { usd: '0' } },
        targetNetwork: { usd: '0' },
        metaMask: { usd: '0' },
      },
    } as unknown as TransactionPayTotals);

    const { result } = runHook();

    expect(result.current).toHaveLength(1);
    expect(result.current[0].key).toBe(AlertKeys.InsufficientPredictBalance);
  });

  it('does not trigger fee check during pending input', () => {
    usePredictBalanceMock.mockReturnValue({ data: 0.04 } as never);

    jest
      .mocked(useTransactionPayQuotes)
      .mockReturnValue([{} as TransactionPayQuote<Json>]);

    useTransactionPayTotalsMock.mockReturnValue({
      fees: {
        provider: { usd: '0.05' },
        sourceNetwork: { estimate: { usd: '0' } },
        targetNetwork: { usd: '0' },
        metaMask: { usd: '0' },
      },
    } as unknown as TransactionPayTotals);

    const { result } = runHook({ pendingAmount: '0.04' });

    expect(result.current).toStrictEqual([]);
  });

  it('returns no alert when amount + fees are within predict balance', () => {
    usePredictBalanceMock.mockReturnValue({ data: 100 } as never);
    useTokenAmountMock.mockReturnValue({
      amountPrecise: '40',
    } as ReturnType<typeof useTokenAmount>);

    jest
      .mocked(useTransactionPayQuotes)
      .mockReturnValue([{} as TransactionPayQuote<Json>]);

    useTransactionPayTotalsMock.mockReturnValue({
      fees: {
        provider: { usd: '0.05' },
        sourceNetwork: { estimate: { usd: '0' } },
        targetNetwork: { usd: '0' },
        metaMask: { usd: '0.003' },
      },
    } as unknown as TransactionPayTotals);

    const { result } = runHook();

    expect(result.current).toStrictEqual([]);
  });
});
