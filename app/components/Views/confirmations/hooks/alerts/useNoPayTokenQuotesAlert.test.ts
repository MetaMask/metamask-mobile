import { cloneDeep, merge } from 'lodash';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { transactionApprovalControllerMock } from '../../__mocks__/controllers/approval-controller-mock';
import { simpleSendTransactionControllerMock } from '../../__mocks__/controllers/transaction-controller-mock';
import { Severity } from '../../types/alerts';
import { useNoPayTokenQuotesAlert } from './useNoPayTokenQuotesAlert';
import { RootState } from '../../../../../reducers';
import { useTransactionPayToken } from '../pay/useTransactionPayToken';
import { Hex, Json } from '@metamask/utils';
import { RowAlertKey } from '../../components/UI/info-row/alert-row/constants';
import { AlertKeys } from '../../constants/alerts';
import { strings } from '../../../../../../locales/i18n';
import {
  useIsTransactionPayLoading,
  useTransactionPayFiatPayment,
  useTransactionPayQuotes,
  useTransactionPaySourceAmounts,
} from '../pay/useTransactionPayData';
import {
  TransactionPayQuote,
  TransactionPaySourceAmount,
} from '@metamask/transaction-pay-controller';

jest.mock('../pay/useTransactionPayToken');
jest.mock('../pay/useTransactionPayData');

const STATE_MOCK = merge(
  {},
  simpleSendTransactionControllerMock,
  transactionApprovalControllerMock,
) as unknown as RootState;

const ADDRESS_MOCK = '0x1234567890abcdef1234567890abcdef12345678' as Hex;
const CHAIN_ID_MOCK = '0x123' as Hex;

function runHook() {
  const state = cloneDeep(STATE_MOCK);

  return renderHookWithProvider(useNoPayTokenQuotesAlert, {
    state,
  });
}

describe('useNoPayTokenQuotesAlert', () => {
  const useTransactionPayTokenMock = jest.mocked(useTransactionPayToken);
  const useTransactionPayQuotesMock = jest.mocked(useTransactionPayQuotes);
  const useTransactionPaySourceAmountsMock = jest.mocked(
    useTransactionPaySourceAmounts,
  );
  const useIsTransactionPayLoadingMock = jest.mocked(
    useIsTransactionPayLoading,
  );

  beforeEach(() => {
    jest.resetAllMocks();

    useTransactionPayTokenMock.mockReturnValue({
      payToken: {
        address: ADDRESS_MOCK,
        chainId: CHAIN_ID_MOCK,
      },
    } as ReturnType<typeof useTransactionPayToken>);

    useIsTransactionPayLoadingMock.mockReturnValue(false);
    useTransactionPayQuotesMock.mockReturnValue(undefined);
    useTransactionPaySourceAmountsMock.mockReturnValue([
      {} as TransactionPaySourceAmount,
    ]);
    jest.mocked(useTransactionPayFiatPayment).mockReturnValue(undefined);
  });

  it('returns alert if pay token selected and no quotes available', () => {
    const { result } = runHook();

    expect(result.current).toEqual([
      {
        key: AlertKeys.NoPayTokenQuotes,
        field: RowAlertKey.PayWith,
        message: strings('alert_system.no_pay_token_quotes.message'),
        title: strings('alert_system.no_pay_token_quotes.title'),
        severity: Severity.Danger,
        isBlocking: true,
      },
    ]);
  });

  it('returns no alerts if quotes available', () => {
    useTransactionPayQuotesMock.mockReturnValue([
      {} as TransactionPayQuote<Json>,
    ]);

    const { result } = runHook();
    expect(result.current).toStrictEqual([]);
  });

  it('returns no alerts if quotes loading', () => {
    useIsTransactionPayLoadingMock.mockReturnValue(true);

    const { result } = runHook();

    expect(result.current).toStrictEqual([]);
  });

  it('returns alert for fiat when selected with valid amount and no quotes', () => {
    useTransactionPayTokenMock.mockReturnValue({
      payToken: undefined,
    } as ReturnType<typeof useTransactionPayToken>);

    jest.mocked(useTransactionPayFiatPayment).mockReturnValue({
      selectedPaymentMethodId: 'pm-card',
      amountFiat: '50.00',
    });

    useTransactionPaySourceAmountsMock.mockReturnValue([]);
    useTransactionPayQuotesMock.mockReturnValue([]);

    const { result } = runHook();

    expect(result.current).toEqual([
      expect.objectContaining({
        key: AlertKeys.NoPayTokenQuotes,
        severity: Severity.Danger,
        isBlocking: true,
      }),
    ]);
  });

  it('returns no alerts for fiat when amount is not entered', () => {
    jest.mocked(useTransactionPayFiatPayment).mockReturnValue({
      selectedPaymentMethodId: 'pm-card',
    });

    useTransactionPaySourceAmountsMock.mockReturnValue([]);
    useTransactionPayQuotesMock.mockReturnValue([]);

    const { result } = runHook();

    expect(result.current).toStrictEqual([]);
  });
});
