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
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { usePredictBalance } from '../../../../UI/Predict/hooks/usePredictBalance';

jest.mock('../transactions/useTransactionMetadataRequest');
jest.mock('../useTokenAmount');
jest.mock('../../../../UI/Predict/hooks/usePredictBalance');

function runHook({ pendingAmount }: { pendingAmount?: string } = {}) {
  return renderHookWithProvider(() =>
    useInsufficientPredictBalanceAlert({ pendingAmount }),
  );
}

describe('useInsufficientPredictBalanceAlert', () => {
  const useTokenAmountMock = jest.mocked(useTokenAmount);
  const usePredictBalanceMock = jest.mocked(usePredictBalance);

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
    usePredictBalanceMock.mockReturnValue({ balance: 1233.99 } as never);
  });

  it('returns alert if predict balance less than pending amount', () => {
    const { result } = runHook({ pendingAmount: '1234' });

    expect(result.current).toEqual([
      {
        key: AlertKeys.InsufficientPredictBalance,
        field: RowAlertKey.Amount,
        message: strings('alert_system.insufficient_pay_token_balance.message'),
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
        message: strings('alert_system.insufficient_pay_token_balance.message'),
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
});
