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
  useTransactionPayQuotesRaw,
  useTransactionPayRequiredTokens,
} from '../pay/useTransactionPayData';
import {
  TransactionPayQuote,
  TransactionPayRequiredToken,
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
  const useTransactionPayQuotesRawMock = jest.mocked(
    useTransactionPayQuotesRaw,
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
    useTransactionPayQuotesRawMock.mockReturnValue(undefined);
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
    useTransactionPayQuotesRawMock.mockReturnValue([
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

    useTransactionPayQuotesRawMock.mockReturnValue([]);

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

    useTransactionPayQuotesRawMock.mockReturnValue([]);

    const { result } = runHook();

    expect(result.current).toStrictEqual([]);
  });

  it('returns no alerts for fiat when amount is not entered', () => {
    useTransactionPayTokenMock.mockReturnValue({
      payToken: undefined,
    } as ReturnType<typeof useTransactionPayToken>);

    jest.mocked(useTransactionPayFiatPayment).mockReturnValue({
      selectedPaymentMethodId: 'pm-card',
    });

    useTransactionPayQuotesRawMock.mockReturnValue([]);

    const { result } = runHook();

    expect(result.current).toStrictEqual([]);
  });

  describe('non-fiat input gating', () => {
    it('returns no alert when no required token amount has reached the controller', () => {
      useTransactionPayRequiredTokensMock.mockReturnValue([]);

      const { result } = runHook();

      expect(result.current).toStrictEqual([]);
    });

    it('returns no alert when the required token amount is zero', () => {
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

    it('returns no alert when the only required token is skipped by balance', () => {
      useTransactionPayRequiredTokensMock.mockReturnValue([
        {
          address: ADDRESS_MOCK,
          chainId: CHAIN_ID_MOCK,
          amountRaw: '10000',
          skipIfBalance: true,
        } as TransactionPayRequiredToken,
      ]);

      const { result } = runHook();

      expect(result.current).toStrictEqual([]);
    });

    it('returns alert once a positive required token amount has reached the controller', () => {
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

    it('returns no alert when isMaxAmount is set but the amount has not yet reached the controller', () => {
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

      expect(result.current).toStrictEqual([]);
    });

    it('returns alert when isMaxAmount is set and a positive amount has reached the controller', () => {
      jest.mocked(useTransactionPayIsMaxAmount).mockReturnValue(true);
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
  });

  it('returns alert for post-quote when a required token has a positive amount and no quotes', () => {
    useTransactionPayIsPostQuoteMock.mockReturnValue(true);
    useTransactionPayQuotesRawMock.mockReturnValue([]);

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

  it('returns no alerts for post-quote when a no-op raw quote is present', () => {
    // A direct, same-token route returns a no-op quote rather than an empty
    // list. Raw quotes are non-empty, so the alert is suppressed even though
    // the filtered quote list would be empty.
    useTransactionPayIsPostQuoteMock.mockReturnValue(true);
    useTransactionPayQuotesRawMock.mockReturnValue([
      {} as TransactionPayQuote<Json>,
    ]);

    useTransactionPayRequiredTokensMock.mockReturnValue([
      {
        address: ADDRESS_MOCK,
        chainId: CHAIN_ID_MOCK,
        amountRaw: '10000',
        skipIfBalance: false,
      } as TransactionPayRequiredToken,
    ]);

    const { result } = runHook();

    expect(result.current).toStrictEqual([]);
  });

  it('returns alert for post-quote when isMaxAmount is true', () => {
    useTransactionPayIsPostQuoteMock.mockReturnValue(true);
    useTransactionPayQuotesRawMock.mockReturnValue([]);
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
      useTransactionPayQuotesRawMock.mockReturnValue([]);
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
      useTransactionPayQuotesRawMock.mockReturnValue([
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
      useTransactionPayQuotesRawMock.mockReturnValue([]);
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
      // A configured same-token withdraw resolves to a direct no-op route,
      // which is returned as a non-empty raw quote list.
      useTransactionPayIsPostQuoteMock.mockReturnValue(true);
      useTransactionPayQuotesRawMock.mockReturnValue([
        {} as TransactionPayQuote<Json>,
      ]);

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
      useTransactionPayQuotesRawMock.mockReturnValue([]);
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

    it('returns no alerts when a payment token is set and quotes are available', () => {
      useTransactionPayTokenMock.mockReturnValue({
        payToken: {
          address: ADDRESS_MOCK,
          chainId: CHAIN_ID_MOCK,
        },
      } as ReturnType<typeof useTransactionPayToken>);
      useTransactionPayQuotesRawMock.mockReturnValue([
        {} as TransactionPayQuote<Json>,
      ]);

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
