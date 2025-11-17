import { renderHook } from '@testing-library/react-native';
import { useTransactionPayToken } from '../pay/useTransactionPayToken';
import { useInsufficientPayTokenBalanceAlert } from './useInsufficientPayTokenBalanceAlert';
import { AlertKeys } from '../../constants/alerts';
import { RowAlertKey } from '../../components/UI/info-row/alert-row/constants';
import { Severity } from '../../types/alerts';
import { strings } from '../../../../../../locales/i18n';
import { useTransactionPayRequiredTokens } from '../pay/useTransactionPayData';
import { TransactionPayRequiredToken } from '@metamask/transaction-pay-controller';

jest.mock('../pay/useTransactionPayToken');
jest.mock('../transactions/useTransactionMetadataRequest');
jest.mock('../pay/useTransactionPayData');

function runHook() {
  return renderHook(() => useInsufficientPayTokenBalanceAlert());
}

describe('useInsufficientPayTokenBalanceAlert', () => {
  const useTransactionPayRequiredTokensMock = jest.mocked(
    useTransactionPayRequiredTokens,
  );

  const useTransactionPayTokenMock = jest.mocked(useTransactionPayToken);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('returns alert if balance less than total', () => {
    useTransactionPayRequiredTokensMock.mockReturnValue([
      {
        amountUsd: '100.00',
      },
      {
        amountUsd: '23.45',
      },
    ] as TransactionPayRequiredToken[]);

    useTransactionPayTokenMock.mockReturnValue({
      payToken: { balanceUsd: '123.44', symbol: 'TST' },
    } as ReturnType<typeof useTransactionPayToken>);

    const { result } = runHook();

    expect(result.current).toEqual([
      {
        key: AlertKeys.InsufficientPayTokenBalance,
        field: RowAlertKey.Amount,
        message: strings(
          'alert_system.insufficient_pay_token_balance.message',
          {
            symbol: 'TST',
          },
        ),
        severity: Severity.Danger,
        isBlocking: true,
      },
    ]);
  });

  it('returns no alerts if balance is sufficient', () => {
    useTransactionPayRequiredTokensMock.mockReturnValue([
      {
        amountUsd: '100.00',
      },
      {
        amountUsd: '23.45',
      },
    ] as TransactionPayRequiredToken[]);

    useTransactionPayTokenMock.mockReturnValue({
      payToken: { balanceUsd: '123.45', symbol: 'TST' },
    } as ReturnType<typeof useTransactionPayToken>);

    const { result } = runHook();

    expect(result.current).toEqual([]);
  });

  it('returns no alert if no pay token selected', () => {
    useTransactionPayRequiredTokensMock.mockReturnValue([
      {
        amountUsd: '100.00',
      },
      {
        amountUsd: '23.45',
      },
    ] as TransactionPayRequiredToken[]);

    useTransactionPayTokenMock.mockReturnValue({
      payToken: undefined,
    } as ReturnType<typeof useTransactionPayToken>);

    const { result } = runHook();

    expect(result.current).toStrictEqual([]);
  });

  it('ignores tokens with skipIfBalance when calculating total', () => {
    useTransactionPayRequiredTokensMock.mockReturnValue([
      {
        amountUsd: '100.00',
      },
      {
        amountUsd: '50.00',
        skipIfBalance: true,
      },
    ] as TransactionPayRequiredToken[]);

    useTransactionPayTokenMock.mockReturnValue({
      payToken: { balanceUsd: '100.00', symbol: 'TST' },
    } as ReturnType<typeof useTransactionPayToken>);

    const { result } = runHook();

    expect(result.current).toEqual([]);
  });
});
