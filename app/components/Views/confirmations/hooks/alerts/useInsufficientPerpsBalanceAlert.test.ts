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

jest.mock('../transactions/useTransactionMetadataRequest');
jest.mock('../useTokenAmount');

const mockPerpsState = (availableBalance: string | null = '45.31') => ({
  engine: {
    backgroundState: {
      PerpsController: {
        accountState: availableBalance !== null ? { availableBalance } : null,
      },
    },
  },
});

function runHook({
  pendingAmount,
  availableBalance = '45.31',
}: {
  pendingAmount?: string;
  availableBalance?: string | null;
} = {}) {
  return renderHookWithProvider(
    () => useInsufficientPerpsBalanceAlert({ pendingAmount }),
    { state: mockPerpsState(availableBalance) },
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
    const { result } = runHook({
      pendingAmount: '50',
      availableBalance: null,
    });

    expect(result.current).toStrictEqual([]);
  });
});
