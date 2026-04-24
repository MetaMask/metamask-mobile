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
  useTransactionPayIsMaxAmount,
  useTransactionPayIsPostQuote,
  useTransactionPayQuotes,
  useTransactionPayRequiredTokens,
  useTransactionPaySourceAmounts,
} from '../pay/useTransactionPayData';
import {
  TransactionPayQuote,
  TransactionPayRequiredToken,
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
  const useTransactionPayIsPostQuoteMock = jest.mocked(
    useTransactionPayIsPostQuote,
  );
  const useTransactionPayRequiredTokensMock = jest.mocked(
    useTransactionPayRequiredTokens,
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
    useTransactionPayIsPostQuoteMock.mockReturnValue(false);
    useTransactionPayRequiredTokensMock.mockReturnValue([]);
    jest.mocked(useTransactionPayFiatPayment).mockReturnValue(undefined);
    jest.mocked(useTransactionPayIsMaxAmount).mockReturnValue(false);
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

  // Non-post-quote: `sourceAmount.targetTokenAddress` is a required-token
  // address, so matching it against a `skipIfBalance` required token means the
  // only required token is optional (gas) and no quote is needed.
  it('returns no alerts when all source amounts target skipIfBalance required tokens (non-post-quote)', () => {
    const optionalTokenAddress =
      '0x0000000000000000000000000000000000000000' as Hex;

    useTransactionPaySourceAmountsMock.mockReturnValue([
      {
        targetTokenAddress: optionalTokenAddress,
      } as TransactionPaySourceAmount,
    ]);

    useTransactionPayRequiredTokensMock.mockReturnValue([
      {
        address: optionalTokenAddress,
        skipIfBalance: true,
      } as TransactionPayRequiredToken,
    ]);

    const { result } = runHook();

    expect(result.current).toStrictEqual([]);
  });

  // Regression for #29297: perps withdraw $0.1 → ETH on Ethereum. The
  // destination native token address (`0x0…0`) was false-matching the
  // Arbitrum native gas required token (also `0x0…0`, `skipIfBalance: true`),
  // making `isOptionalOnly` true and suppressing the "No quotes" alert, which
  // let the UI render a huge bogus `targetNetwork` fee.
  it('returns alert for post-quote even when sourceAmount target address false-matches a skipIfBalance required token', () => {
    const nativeTokenAddress =
      '0x0000000000000000000000000000000000000000' as Hex;

    useTransactionPayIsPostQuoteMock.mockReturnValue(true);

    useTransactionPaySourceAmountsMock.mockReturnValue([
      {
        targetTokenAddress: nativeTokenAddress,
      } as TransactionPaySourceAmount,
    ]);

    useTransactionPayRequiredTokensMock.mockReturnValue([
      {
        address: nativeTokenAddress,
        chainId: '0xa4b1' as Hex,
        skipIfBalance: true,
      } as TransactionPayRequiredToken,
    ]);

    const { result } = runHook();

    expect(result.current).toEqual([
      expect.objectContaining({
        key: AlertKeys.NoPayTokenQuotes,
        severity: Severity.Danger,
        isBlocking: true,
      }),
    ]);
  });

  // Money account withdraw MUSD -> MUSD: `calculatePostQuoteSourceAmounts`
  // filters out same-token/same-chain entries, so `sourceAmounts` is empty
  // even when the user has entered a positive amount. The alert must still
  // fire so the Withdraw button stays disabled.
  it('returns alert for post-quote when sourceAmounts is empty but a required token has a positive amount', () => {
    useTransactionPayIsPostQuoteMock.mockReturnValue(true);
    useTransactionPaySourceAmountsMock.mockReturnValue([]);
    useTransactionPayQuotesMock.mockReturnValue([]);

    useTransactionPayRequiredTokensMock.mockReturnValue([
      {
        address: ADDRESS_MOCK,
        chainId: CHAIN_ID_MOCK,
        amountRaw: '10000',
        skipIfBalance: false,
      } as TransactionPayRequiredToken,
    ]);

    const { result } = runHook();

    expect(result.current).toEqual([
      expect.objectContaining({
        key: AlertKeys.NoPayTokenQuotes,
        severity: Severity.Danger,
        isBlocking: true,
      }),
    ]);
  });

  it('returns no alerts for post-quote with empty sourceAmounts when the required token amount is zero', () => {
    useTransactionPayIsPostQuoteMock.mockReturnValue(true);
    useTransactionPaySourceAmountsMock.mockReturnValue([]);
    useTransactionPayQuotesMock.mockReturnValue([]);

    useTransactionPayRequiredTokensMock.mockReturnValue([
      {
        address: ADDRESS_MOCK,
        chainId: CHAIN_ID_MOCK,
        amountRaw: '0',
        skipIfBalance: false,
      } as TransactionPayRequiredToken,
    ]);

    const { result } = runHook();

    expect(result.current).toStrictEqual([]);
  });

  it('returns alert for post-quote with empty sourceAmounts when isMaxAmount is true', () => {
    useTransactionPayIsPostQuoteMock.mockReturnValue(true);
    useTransactionPaySourceAmountsMock.mockReturnValue([]);
    useTransactionPayQuotesMock.mockReturnValue([]);
    jest.mocked(useTransactionPayIsMaxAmount).mockReturnValue(true);

    useTransactionPayRequiredTokensMock.mockReturnValue([
      {
        address: ADDRESS_MOCK,
        chainId: CHAIN_ID_MOCK,
        amountRaw: '0',
        skipIfBalance: false,
      } as TransactionPayRequiredToken,
    ]);

    const { result } = runHook();

    expect(result.current).toEqual([
      expect.objectContaining({
        key: AlertKeys.NoPayTokenQuotes,
        severity: Severity.Danger,
        isBlocking: true,
      }),
    ]);
  });
});
