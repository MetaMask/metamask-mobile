import {
  PaymentOverride,
  TransactionPaymentToken,
} from '@metamask/transaction-pay-controller';
import { TransactionMeta } from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import { merge } from 'lodash';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { otherControllersMock } from '../../__mocks__/controllers/other-controllers-mock';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { usePayTokenAccountBalance } from './usePayTokenAccountBalance';
import {
  useTransactionPayFiatPayment,
  useTransactionPayIsPostQuote,
} from './useTransactionPayData';
import { useTransactionPayToken } from './useTransactionPayToken';
import { useIsPayTokenBalanceUnresolved } from './useIsPayTokenBalanceUnresolved';

jest.mock('./useTransactionPayToken');
jest.mock('./usePayTokenAccountBalance');
jest.mock('./useTransactionPayData');
jest.mock('../transactions/useTransactionMetadataRequest');

const PAY_TOKEN_MOCK = {
  address: '0xabc' as Hex,
  chainId: '0x1' as Hex,
  balanceUsd: '5.00',
  balanceRaw: '5000000000000000000',
  balanceHuman: '5',
  balanceFiat: '5.00',
  decimals: 18,
  symbol: 'ETH',
} as TransactionPaymentToken;

const TRANSACTION_ID_MOCK = 'tx-pay-balance-1';

function runHook(stateOverrides: Record<string, unknown> = {}) {
  return renderHookWithProvider(useIsPayTokenBalanceUnresolved, {
    state: merge({}, otherControllersMock, stateOverrides),
  });
}

describe('useIsPayTokenBalanceUnresolved', () => {
  const useTransactionPayTokenMock = jest.mocked(useTransactionPayToken);
  const usePayTokenAccountBalanceMock = jest.mocked(usePayTokenAccountBalance);
  const useTransactionPayIsPostQuoteMock = jest.mocked(
    useTransactionPayIsPostQuote,
  );
  const useTransactionPayFiatPaymentMock = jest.mocked(
    useTransactionPayFiatPayment,
  );
  const useTransactionMetadataRequestMock = jest.mocked(
    useTransactionMetadataRequest,
  );

  beforeEach(() => {
    jest.resetAllMocks();

    useTransactionPayTokenMock.mockReturnValue({
      payToken: PAY_TOKEN_MOCK,
      setPayToken: jest.fn(),
    });
    usePayTokenAccountBalanceMock.mockReturnValue({
      balanceUsd: undefined,
      balanceRaw: undefined,
    });
    useTransactionPayIsPostQuoteMock.mockReturnValue(false);
    useTransactionPayFiatPaymentMock.mockReturnValue(undefined);
    useTransactionMetadataRequestMock.mockReturnValue({
      id: TRANSACTION_ID_MOCK,
    } as TransactionMeta);
  });

  it('returns true when a crypto pay token USD balance has not resolved', () => {
    const { result } = runHook();

    expect(result.current).toBe(true);
  });

  it('returns false when the live USD balance is present', () => {
    usePayTokenAccountBalanceMock.mockReturnValue({
      balanceUsd: '5.00',
      balanceRaw: '5000000000000000000',
    });

    const { result } = runHook();

    expect(result.current).toBe(false);
  });

  it('returns false when no pay token is selected', () => {
    useTransactionPayTokenMock.mockReturnValue({
      payToken: undefined,
      setPayToken: jest.fn(),
    });

    const { result } = runHook();

    expect(result.current).toBe(false);
  });

  it('returns false for post-quote withdrawal flows', () => {
    useTransactionPayIsPostQuoteMock.mockReturnValue(true);

    const { result } = runHook();

    expect(result.current).toBe(false);
  });

  it('returns false when a fiat payment method is selected', () => {
    useTransactionPayFiatPaymentMock.mockReturnValue({
      selectedPaymentMethodId: 'debit-card',
    } as ReturnType<typeof useTransactionPayFiatPayment>);

    const { result } = runHook();

    expect(result.current).toBe(false);
  });

  it('returns false for money account payment override', () => {
    const { result } = runHook({
      engine: {
        backgroundState: {
          TransactionPayController: {
            transactionData: {
              [TRANSACTION_ID_MOCK]: {
                paymentOverride: PaymentOverride.MoneyAccount,
              },
            },
          },
        },
      },
    });

    expect(result.current).toBe(false);
  });
});
