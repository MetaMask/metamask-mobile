import { renderHook } from '@testing-library/react-native';
import { useTransactionPayToken } from '../pay/useTransactionPayToken';
import { useTransactionPayTokenAmounts } from '../pay/useTransactionPayTokenAmounts';
import { useInsufficientPayTokenBalanceAlert } from './useInsufficientPayTokenBalanceAlert';
import { AlertKeys } from '../../constants/alerts';
import { RowAlertKey } from '../../components/UI/info-row/alert-row/constants';
import { Severity } from '../../types/alerts';
import { strings } from '../../../../../../locales/i18n';

jest.mock('../pay/useTransactionPayToken');
jest.mock('../pay/useTransactionPayTokenAmounts');

function runHook() {
  return renderHook(() => useInsufficientPayTokenBalanceAlert());
}

describe('useInsufficientPayTokenBalance', () => {
  const useTransactionPayTokenAmountsMock = jest.mocked(
    useTransactionPayTokenAmounts,
  );

  const useTransactionPayTokenMock = jest.mocked(useTransactionPayToken);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('returns alert if balance less than total', () => {
    useTransactionPayTokenAmountsMock.mockReturnValue({
      totalHuman: '123.456',
    } as ReturnType<typeof useTransactionPayTokenAmounts>);

    useTransactionPayTokenMock.mockReturnValue({
      balanceHuman: '123.455',
    } as ReturnType<typeof useTransactionPayToken>);

    const { result } = runHook();

    expect(result.current).toEqual([
      {
        key: AlertKeys.InsufficientPayTokenBalance,
        field: RowAlertKey.Amount,
        message: strings('alert_system.insufficient_pay_token_balance.message'),
        severity: Severity.Danger,
        isBlocking: true,
      },
    ]);
  });

  it('returns no alerts if balance is sufficient', () => {
    useTransactionPayTokenAmountsMock.mockReturnValue({
      totalHuman: '123.456',
    } as ReturnType<typeof useTransactionPayTokenAmounts>);

    useTransactionPayTokenMock.mockReturnValue({
      balanceHuman: '123.456',
    } as ReturnType<typeof useTransactionPayToken>);

    const { result } = runHook();

    expect(result.current).toEqual([]);
  });
});
