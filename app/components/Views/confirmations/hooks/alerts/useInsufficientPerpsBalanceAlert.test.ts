import { AlertKeys } from '../../constants/alerts';
import { RowAlertKey } from '../../components/UI/info-row/alert-row/constants';
import { Severity } from '../../types/alerts';
import { strings } from '../../../../../../locales/i18n';
import { useInsufficientPerpsBalanceAlert } from './useInsufficientPerpsBalanceAlert';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { useTokenAmount } from '../useTokenAmount';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import Engine from '../../../../../core/Engine';

jest.mock('../transactions/useTransactionMetadataRequest');
jest.mock('../useTokenAmount');
jest.mock('../../../../../core/Engine', () => ({
  context: {
    PerpsController: {
      state: {
        accountState: {
          availableBalance: '45.31',
        },
      },
    },
  },
}));

function runHook({ pendingAmount }: { pendingAmount?: string } = {}) {
  return renderHookWithProvider(() =>
    useInsufficientPerpsBalanceAlert({ pendingAmount }),
  );
}

describe('useInsufficientPerpsBalanceAlert', () => {
  const useTokenAmountMock = jest.mocked(useTokenAmount);

  const useTransactionMetadataRequestMock = jest.mocked(
    useTransactionMetadataRequest,
  );

  beforeEach(() => {
    jest.clearAllMocks();

    useTransactionMetadataRequestMock.mockReturnValue({
      txParams: {
        from: '0x0',
      },
      type: TransactionType.perpsWithdraw,
    } as unknown as TransactionMeta);

    useTokenAmountMock.mockReturnValue({} as ReturnType<typeof useTokenAmount>);

    (Engine.context.PerpsController as Record<string, unknown>).state = {
      accountState: {
        availableBalance: '45.31',
      },
    };
  });

  it('returns alert if perps balance less than pending amount', () => {
    const { result } = runHook({ pendingAmount: '50' });

    expect(result.current).toEqual([
      {
        key: AlertKeys.InsufficientPerpsBalance,
        field: RowAlertKey.Amount,
        message: strings('alert_system.insufficient_pay_token_balance.message'),
        severity: Severity.Danger,
        isBlocking: true,
      },
    ]);
  });

  it('returns alert if perps balance less than token amount', () => {
    useTokenAmountMock.mockReturnValue({ amountPrecise: '50' } as ReturnType<
      typeof useTokenAmount
    >);

    const { result } = runHook();

    expect(result.current).toEqual([
      {
        key: AlertKeys.InsufficientPerpsBalance,
        field: RowAlertKey.Amount,
        message: strings('alert_system.insufficient_pay_token_balance.message'),
        severity: Severity.Danger,
        isBlocking: true,
      },
    ]);
  });

  it('returns no alert if perps balance is greater than token amount', () => {
    useTokenAmountMock.mockReturnValue({
      amountPrecise: '40',
    } as ReturnType<typeof useTokenAmount>);

    const { result } = runHook();

    expect(result.current).toStrictEqual([]);
  });

  it('returns no alert if perps balance is greater than pending amount', () => {
    const { result } = runHook({ pendingAmount: '40' });

    expect(result.current).toStrictEqual([]);
  });

  it('returns no alert if perps balance equals pending amount', () => {
    const { result } = runHook({ pendingAmount: '45.31' });

    expect(result.current).toStrictEqual([]);
  });

  it('returns no alert if not perps withdraw', () => {
    useTransactionMetadataRequestMock.mockReturnValue({
      txParams: {
        from: '0x0',
      },
      type: TransactionType.simpleSend,
    } as unknown as TransactionMeta);

    useTokenAmountMock.mockReturnValue({ amountPrecise: '50' } as ReturnType<
      typeof useTokenAmount
    >);

    const { result } = runHook();

    expect(result.current).toStrictEqual([]);
  });

  it('returns no alert if perps controller state is unavailable', () => {
    (Engine.context.PerpsController as Record<string, unknown>).state = undefined;

    const { result } = runHook({ pendingAmount: '50' });

    expect(result.current).toStrictEqual([]);
  });
});
