import { cloneDeep, merge } from 'lodash';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { transactionApprovalControllerMock } from '../../__mocks__/controllers/approval-controller-mock';
import { simpleSendTransactionControllerMock } from '../../__mocks__/controllers/transaction-controller-mock';
import { Alert, Severity } from '../../types/alerts';
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
  useTransactionPayQuoteValidationError,
  useTransactionPayQuotes,
  useTransactionPayRequiredTokens,
  useTransactionPaySourceAmounts,
} from '../pay/useTransactionPayData';
import {
  TransactionPayQuote,
  TransactionPayRequiredToken,
  TransactionPaySourceAmount,
} from '@metamask/transaction-pay-controller';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useTransactionPayWithdraw } from '../pay/useTransactionPayWithdraw';
import { TransactionType } from '@metamask/transaction-controller';

jest.mock('../pay/useTransactionPayToken');
jest.mock('../pay/useTransactionPayData');
jest.mock('../pay/useTransactionPayWithdraw');
jest.mock('../transactions/useTransactionMetadataRequest');

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
  const useTransactionPayWithdrawMock = jest.mocked(useTransactionPayWithdraw);

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
    useTransactionPayWithdrawMock.mockReturnValue({
      isWithdraw: false,
      canSelectWithdrawToken: false,
    });
    jest.mocked(useTransactionPayFiatPayment).mockReturnValue(undefined);
    jest.mocked(useTransactionPayIsMaxAmount).mockReturnValue(false);
    jest
      .mocked(useTransactionPayQuoteValidationError)
      .mockReturnValue(undefined);
  });

  it('returns alert if pay token selected and no quotes available', () => {
    const { result } = runHook();

    expect(result.current).toEqual([
      {
        key: AlertKeys.NoPayTokenQuotes,
        field: RowAlertKey.PayWith,
        message: strings('alert_system.no_pay_token_quotes.message'),
        alertDetails: undefined,
        title: strings('alert_system.no_pay_token_quotes.title'),
        severity: Severity.Danger,
        isBlocking: true,
      },
    ]);
  });

  it('uses quoteValidationError message and detail when present', () => {
    const validationError = {
      message: 'Insufficient balance',
      reason: 'insufficient-source-balance' as const,
      detail: ['Required: 1.5 USDC', 'Current: 1 USDC', 'Missing: 0.5 USDC'],
    };
    jest
      .mocked(useTransactionPayQuoteValidationError)
      .mockReturnValue(validationError);

    const { result } = runHook();

    expect(result.current).toHaveLength(1);
    const resultAlert = result.current[0] as Alert;
    expect(resultAlert.key).toBe(AlertKeys.NoPayTokenQuotes);
    expect(resultAlert.field).toBe(RowAlertKey.PayWith);
    expect(resultAlert.content).toBeDefined();
    expect(resultAlert.message).toBe('Insufficient balance');
    expect(resultAlert.title).toBe('No valid quotes');
    expect(resultAlert.severity).toBe(Severity.Danger);
    expect(resultAlert.isBlocking).toBe(true);
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

  it('returns no alerts for fiat when rampsQuote is present', () => {
    useTransactionPayTokenMock.mockReturnValue({
      payToken: undefined,
    } as ReturnType<typeof useTransactionPayToken>);

    jest.mocked(useTransactionPayFiatPayment).mockReturnValue({
      selectedPaymentMethodId: 'pm-card',
      amountFiat: '50.00',
      rampsQuote: { id: 'quote-1' },
    } as never);

    useTransactionPayQuotesMock.mockReturnValue([]);

    const { result } = runHook();

    expect(result.current).toStrictEqual([]);
  });

  it('returns alert for fiat when sourceAmounts is non-empty but no rampsQuote', () => {
    useTransactionPayTokenMock.mockReturnValue({
      payToken: undefined,
    } as ReturnType<typeof useTransactionPayToken>);

    jest.mocked(useTransactionPayFiatPayment).mockReturnValue({
      selectedPaymentMethodId: 'pm-card',
      amountFiat: '50.00',
    });

    useTransactionPaySourceAmountsMock.mockReturnValue([
      {} as TransactionPaySourceAmount,
    ]);
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

  describe('quote-required transaction types', () => {
    beforeEach(() => {
      jest.resetAllMocks();
      useTransactionPayTokenMock.mockReturnValue({
        payToken: undefined,
      } as ReturnType<typeof useTransactionPayToken>);
      useIsTransactionPayLoadingMock.mockReturnValue(false);
      useTransactionPayQuotesMock.mockReturnValue([]);
      useTransactionPaySourceAmountsMock.mockReturnValue([]);
      useTransactionPayIsPostQuoteMock.mockReturnValue(false);
      useTransactionPayRequiredTokensMock.mockReturnValue([
        {
          address: ADDRESS_MOCK,
          chainId: CHAIN_ID_MOCK,
          amountRaw: '10000',
          skipIfBalance: false,
        } as TransactionPayRequiredToken,
      ]);
      useTransactionPayWithdrawMock.mockReturnValue({
        isWithdraw: false,
        canSelectWithdrawToken: false,
      });
      jest.mocked(useTransactionPayFiatPayment).mockReturnValue(undefined);
      jest.mocked(useTransactionPayIsMaxAmount).mockReturnValue(false);
      jest.mocked(useTransactionMetadataRequest).mockReturnValue({
        type: TransactionType.moneyAccountDeposit,
      } as never);
    });

    it('returns alert for moneyAccountDeposit with no quotes and positive required amount', () => {
      const { result } = runHook();

      expect(result.current).toEqual([
        expect.objectContaining({
          key: AlertKeys.NoPayTokenQuotes,
          severity: Severity.Danger,
          isBlocking: true,
        }),
      ]);
    });

    it('returns no alert for moneyAccountDeposit with no required amount', () => {
      jest.mocked(useTransactionMetadataRequest).mockReturnValue({
        type: TransactionType.moneyAccountDeposit,
      } as never);
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

    it('returns no alert for moneyAccountDeposit when quotes are present', () => {
      jest.mocked(useTransactionMetadataRequest).mockReturnValue({
        type: TransactionType.moneyAccountDeposit,
      } as never);
      useTransactionPayQuotesMock.mockReturnValue([
        {} as TransactionPayQuote<Json>,
      ]);

      const { result } = runHook();

      expect(result.current).toStrictEqual([]);
    });

    it('returns no alert for moneyAccountDeposit while quotes are loading', () => {
      jest.mocked(useTransactionMetadataRequest).mockReturnValue({
        type: TransactionType.moneyAccountDeposit,
      } as never);
      useIsTransactionPayLoadingMock.mockReturnValue(true);

      const { result } = runHook();

      expect(result.current).toStrictEqual([]);
    });
  });

  describe('withdraw initialisation', () => {
    const BLOCKING_ALERT = expect.objectContaining({
      key: AlertKeys.NoPayTokenQuotes,
      severity: Severity.Danger,
      isBlocking: true,
    });

    beforeEach(() => {
      useTransactionPayQuotesMock.mockReturnValue([]);
      useTransactionPaySourceAmountsMock.mockReturnValue([]);
      useTransactionPayWithdrawMock.mockReturnValue({
        isWithdraw: true,
        canSelectWithdrawToken: true,
      });
      useTransactionPayRequiredTokensMock.mockReturnValue([
        {
          address: ADDRESS_MOCK,
          chainId: CHAIN_ID_MOCK,
          amountRaw: '10000',
          skipIfBalance: false,
        } as TransactionPayRequiredToken,
      ]);
    });

    it('returns alert when the pay config is not initialised', () => {
      useTransactionPayIsPostQuoteMock.mockReturnValue(false);

      const { result } = runHook();

      expect(result.current).toEqual([BLOCKING_ALERT]);
    });

    it('returns no alerts once the pay config is initialised, even with no destination token set', () => {
      // Withdraws with no preferred or last-used token intentionally leave
      // payToken unset and default to a direct, same-token transfer.
      useTransactionPayIsPostQuoteMock.mockReturnValue(true);
      useTransactionPayTokenMock.mockReturnValue({
        payToken: undefined,
      } as ReturnType<typeof useTransactionPayToken>);

      const { result } = runHook();

      expect(result.current).toStrictEqual([]);
    });

    it('returns no alerts when the destination token and pay config are set', () => {
      useTransactionPayIsPostQuoteMock.mockReturnValue(true);

      const { result } = runHook();

      expect(result.current).toStrictEqual([]);
    });

    it('returns no alerts when withdraw token selection is disabled', () => {
      useTransactionPayWithdrawMock.mockReturnValue({
        isWithdraw: true,
        canSelectWithdrawToken: false,
      });
      useTransactionPayTokenMock.mockReturnValue({
        payToken: undefined,
      } as ReturnType<typeof useTransactionPayToken>);

      const { result } = runHook();

      expect(result.current).toStrictEqual([]);
    });

    it('returns no alerts while quotes are loading', () => {
      useTransactionPayTokenMock.mockReturnValue({
        payToken: undefined,
      } as ReturnType<typeof useTransactionPayToken>);
      useIsTransactionPayLoadingMock.mockReturnValue(true);

      const { result } = runHook();

      expect(result.current).toStrictEqual([]);
    });
  });

  describe('pay-token-required transaction types', () => {
    const BLOCKING_ALERT = expect.objectContaining({
      key: AlertKeys.NoPayTokenQuotes,
      severity: Severity.Danger,
      isBlocking: true,
    });

    beforeEach(() => {
      useTransactionPayTokenMock.mockReturnValue({
        payToken: undefined,
      } as ReturnType<typeof useTransactionPayToken>);
      useTransactionPayQuotesMock.mockReturnValue([]);
      useTransactionPaySourceAmountsMock.mockReturnValue([]);
      useTransactionPayRequiredTokensMock.mockReturnValue([
        {
          address: ADDRESS_MOCK,
          chainId: CHAIN_ID_MOCK,
          amountRaw: '10000',
          skipIfBalance: false,
        } as TransactionPayRequiredToken,
      ]);
      jest.mocked(useTransactionMetadataRequest).mockReturnValue({
        type: TransactionType.perpsDeposit,
      } as never);
    });

    it('returns alert for perps deposit when no payment token is set', () => {
      const { result } = runHook();

      expect(result.current).toEqual([BLOCKING_ALERT]);
    });

    it('returns no alerts when a fiat payment method is selected', () => {
      jest.mocked(useTransactionPayFiatPayment).mockReturnValue({
        selectedPaymentMethodId: 'debit-credit-card',
      } as never);

      const { result } = runHook();

      expect(result.current).toStrictEqual([]);
    });

    it('returns no alerts when a payment token is set', () => {
      useTransactionPayTokenMock.mockReturnValue({
        payToken: {
          address: ADDRESS_MOCK,
          chainId: CHAIN_ID_MOCK,
        },
      } as ReturnType<typeof useTransactionPayToken>);

      const { result } = runHook();

      expect(result.current).toStrictEqual([]);
    });

    it('returns no alerts when the required amount is zero', () => {
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
  });
});
