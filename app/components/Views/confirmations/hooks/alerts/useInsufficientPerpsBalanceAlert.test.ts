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

jest.mock('../transactions/useTransactionMetadataRequest');
jest.mock('../useTokenAmount');
jest.mock('../pay/useTransactionPayData');

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
  const useTransactionPayTotalsMock = jest.mocked(useTransactionPayTotals);

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
    useTransactionPayTotalsMock.mockReturnValue(undefined);
    jest.mocked(useTransactionPayQuotes).mockReturnValue(undefined);
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

  it('returns alert on confirmation screen when fees exceed withdraw amount', () => {
    useTokenAmountMock.mockReturnValue({
      amountPrecise: '10',
    } as ReturnType<typeof useTokenAmount>);

    jest
      .mocked(useTransactionPayQuotes)
      .mockReturnValue([{} as TransactionPayQuote<Json>]);

    useTransactionPayTotalsMock.mockReturnValue({
      fees: {
        provider: { usd: '5' },
        sourceNetwork: { estimate: { usd: '3' } },
        targetNetwork: { usd: '4' },
        metaMask: { usd: '1' },
      },
    } as unknown as TransactionPayTotals);

    const { result } = runHook();

    expect(result.current).toHaveLength(1);
    expect(result.current[0].key).toBe(AlertKeys.InsufficientPerpsBalance);
  });

  it('does not trigger fee check during pending input even when fees exceed amount', () => {
    useTransactionPayTotalsMock.mockReturnValue({
      fees: {
        provider: { usd: '100' },
        sourceNetwork: { estimate: { usd: '0' } },
        targetNetwork: { usd: '0' },
        metaMask: { usd: '0' },
      },
    } as unknown as TransactionPayTotals);

    const { result } = runHook({ pendingAmount: '10' });

    expect(result.current).toStrictEqual([]);
  });

  it('returns no alert on confirmation screen when fees are less than amount', () => {
    useTokenAmountMock.mockReturnValue({
      amountPrecise: '40',
    } as ReturnType<typeof useTokenAmount>);

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
