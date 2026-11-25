import { merge } from 'lodash';
import { BigNumber } from 'bignumber.js';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { useTransactionCustomAmount } from './useTransactionCustomAmount';
import {
  simpleSendTransactionControllerMock,
  transactionIdMock,
} from '../../__mocks__/controllers/transaction-controller-mock';
import { otherControllersMock } from '../../__mocks__/controllers/other-controllers-mock';
import { transactionApprovalControllerMock } from '../../__mocks__/controllers/approval-controller-mock';
import { act } from 'react';
import { useTokenFiatRate } from '../tokens/useTokenFiatRates';
import { useTransactionPayToken } from '../pay/useTransactionPayToken';
import { useTransactionPayPrefetch } from '../pay/useTransactionPayPrefetch';
import { useUpdateTransactionPayAmount } from '../pay/useUpdateTransactionPayAmount';
import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { useParams } from '../../../../../util/navigation/navUtils';
import { Hex } from '@metamask/utils';
import { usePredictBalance } from '../../../../UI/Predict/hooks/usePredictBalance';
import useMoneyAccountBalance from '../../../../UI/Money/hooks/useMoneyAccountBalance';
import {
  useIsTransactionPayQuoteLoading,
  useTransactionPayIsMaxAmount,
  useTransactionPayIsPostQuote,
  useTransactionPayFiatPayment,
  useTransactionPayQuotesLastUpdated,
} from '../pay/useTransactionPayData';
import { useMMPayFiatConfig } from '../pay/useMMPayFiatConfig';
import { useRampsBuyLimits } from '../../../../UI/Ramp/hooks/useRampsBuyLimits';
import { useTransactionPayHasSourceAmount } from '../pay/useTransactionPayHasSourceAmount';
import { PaymentOverride } from '@metamask/transaction-pay-controller';
import { useConfirmationMetricEvents } from '../metrics/useConfirmationMetricEvents';
import Engine from '../../../../../core/Engine';

import {
  selectMetaMaskPayFlags,
  selectDepositLimits,
} from '../../../../../selectors/featureFlagController/confirmations';
import { selectStablecoins } from '../../../../../selectors/featureFlagController/stableTokens';
import { mockedEmptyFlagsState } from '../../../../../selectors/featureFlagController/mocks';
import { getMoneyAccountDepositIntent } from '../../../../UI/Money/utils/moneyAccountDepositIntent';
import { resolveABTestAssignment } from '../../../../../util/abTest';
import { DepositPrefillStatus } from './useDepositPrefillAmount';
import {
  buildPaymentTokenMock,
  evmAssetId,
} from '../../__mocks__/pay-token.mock';
import { useTransactionMetadataRequest } from './useTransactionMetadataRequest';

const MEMBERSHIP_SUBSCRIPTION_TRANSACTION_TYPE =
  TransactionType.membershipSubscription;

jest.mock(
  '../../../../../selectors/featureFlagController/confirmations',
  () => ({
    ...jest.requireActual(
      '../../../../../selectors/featureFlagController/confirmations',
    ),
    selectMetaMaskPayFlags: jest.fn(),
    selectDepositLimits: jest.fn(),
  }),
);
jest.mock('../../../../UI/Money/utils/moneyAccountDepositIntent', () => ({
  getMoneyAccountDepositIntent: jest.fn(),
}));
jest.mock('../../../../../util/abTest', () => ({
  resolveABTestAssignment: jest.fn(),
}));

jest.mock('./useTransactionMetadataRequest', () => {
  const actual = jest.requireActual('./useTransactionMetadataRequest');
  return {
    ...actual,
    useTransactionMetadataRequest: jest.fn(
      actual.useTransactionMetadataRequest,
    ),
  };
});
jest.mock('../tokens/useTokenFiatRates');
jest.mock('../pay/useTransactionPayPrefetch');
jest.mock('../pay/useUpdateTransactionPayAmount');
jest.mock('../pay/useTransactionPayToken');
jest.mock('../pay/useTransactionPayData');
jest.mock('../pay/useTransactionPayHasSourceAmount');
jest.mock('../pay/useMMPayFiatConfig');
jest.mock('../../../../UI/Ramp/hooks/useRampsBuyLimits');
jest.mock('../useTokenAmount');
jest.mock('../../../../../util/navigation/navUtils');
jest.mock('../../../../UI/Predict/hooks/usePredictBalance');
jest.mock('../../../../UI/Money/hooks/useMoneyAccountBalance', () => ({
  __esModule: true,
  default: jest.fn(() => ({ balanceFiatNumber: 0 })),
}));
jest.mock('../metrics/useConfirmationMetricEvents');
jest.mock('../../../../../core/Engine', () => ({
  context: {
    TransactionPayController: {
      setTransactionConfig: jest.fn(),
    },
  },
}));

jest.useFakeTimers();

const TOKEN_ADDRESS_MOCK = '0x1234567890123456789012345678901234567890' as Hex;
/** Ethereum USDT from the stableTokens flag. Max-prefill cases use this address. */
const ETHEREUM_USDT_ADDRESS =
  '0xdac17f958d2ee523a2206206994597c13d831ec7' as Hex;
/** Ethereum USDC, used when a second listed stablecoin must also prefill to max. */
const ETHEREUM_USDC_ADDRESS =
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' as Hex;
/** Ethereum DAI. On the production stableTokens flag, not the in-app fallback. */
const ETHEREUM_DAI_ADDRESS =
  '0x6b175474e89094c44da98b954eedeac495271d0f' as Hex;
const TOKEN_TRANSFER_DATA =
  '0xa9059cbb0000000000000000000000005a52e96bacdabb82fd05763e25335261b270efcb0000000000000000000000000000000000000000000000004563918244f40000';
const MONEY_ACCOUNT_ADDRESS_MOCK = '0xabc123';
const MONEY_ACCOUNT_KEYRING_ID_MOCK = 'mock-money-keyring-id';

function getMoneyAccountState(balanceRaw?: string) {
  return {
    moneyBalance: {
      redeemable: balanceRaw
        ? { address: MONEY_ACCOUNT_ADDRESS_MOCK, raw: balanceRaw }
        : null,
    },
    engine: {
      backgroundState: {
        KeyringController: {
          keyrings: [
            {
              accounts: [],
              metadata: { id: MONEY_ACCOUNT_KEYRING_ID_MOCK, name: 'HD 1' },
              type: 'HD Key Tree',
            },
          ],
        },
        MoneyAccountController: {
          moneyAccounts: {
            account1: {
              address: MONEY_ACCOUNT_ADDRESS_MOCK,
              id: 'account1',
              options: {
                entropy: {
                  type: 'mnemonic',
                  id: MONEY_ACCOUNT_KEYRING_ID_MOCK,
                },
              },
            },
          },
        },
      },
    },
  };
}

function runHook({
  transactionMeta,
  stateOverrides,
}: {
  transactionMeta?: Partial<TransactionMeta>;
  stateOverrides?: Record<string, unknown>;
} = {}) {
  return renderHookWithProvider(useTransactionCustomAmount, {
    state: merge(
      {},
      simpleSendTransactionControllerMock,
      transactionApprovalControllerMock,
      otherControllersMock,
      transactionMeta
        ? {
            engine: {
              backgroundState: {
                TransactionController: {
                  transactions: [transactionMeta],
                },
              },
            },
          }
        : {},
      {
        engine: {
          backgroundState: {
            CurrencyRateController: {
              currentCurrency: 'tst',
              currencyRates: {
                ETH: {
                  conversionDate: 1732887955.694,
                  conversionRate: 1,
                  usdConversionRate: 2,
                },
              },
            },
          },
        },
      },
      stateOverrides ?? {},
    ),
  });
}

describe('useTransactionCustomAmount', () => {
  const useTokenFiatRateMock = jest.mocked(useTokenFiatRate);
  const useTransactionPayPrefetchMock = jest.mocked(useTransactionPayPrefetch);
  const useUpdateTransactionPayAmountMock = jest.mocked(
    useUpdateTransactionPayAmount,
  );
  const useTransactionPayTokenMock = jest.mocked(useTransactionPayToken);
  const useParamsMock = jest.mocked(useParams);
  const usePredictBalanceMock = jest.mocked(usePredictBalance);
  const useMoneyAccountBalanceMock = jest.mocked(useMoneyAccountBalance);
  const useTransactionPayIsMaxAmountMock = jest.mocked(
    useTransactionPayIsMaxAmount,
  );
  const useTransactionPayIsPostQuoteMock = jest.mocked(
    useTransactionPayIsPostQuote,
  );
  const useIsTransactionPayQuoteLoadingMock = jest.mocked(
    useIsTransactionPayQuoteLoading,
  );
  const useTransactionPayQuotesLastUpdatedMock = jest.mocked(
    useTransactionPayQuotesLastUpdated,
  );
  const useTransactionPayHasSourceAmountMock = jest.mocked(
    useTransactionPayHasSourceAmount,
  );
  const setTransactionConfigMock = jest.mocked(
    Engine.context.TransactionPayController.setTransactionConfig,
  );
  const useConfirmationMetricEventsMock = jest.mocked(
    useConfirmationMetricEvents,
  );
  const useTransactionPayFiatPaymentMock = jest.mocked(
    useTransactionPayFiatPayment,
  );
  const useMMPayFiatConfigMock = jest.mocked(useMMPayFiatConfig);
  const useRampsBuyLimitsMock = jest.mocked(useRampsBuyLimits);
  const resolveABTestAssignmentMock = jest.mocked(resolveABTestAssignment);

  const updateTransactionPayAmountMock = jest.fn(
    async (_amountHuman: string): Promise<boolean | undefined> =>
      Promise.resolve(true),
  );

  const setConfirmationMetricMock = jest.fn();

  beforeEach(() => {
    jest.resetAllMocks();

    jest
      .mocked(useTransactionMetadataRequest)
      .mockImplementation(
        jest.requireActual('./useTransactionMetadataRequest')
          .useTransactionMetadataRequest,
      );

    resolveABTestAssignmentMock.mockReturnValue({
      variantName: 'treatment',
      isActive: true,
    });

    updateTransactionPayAmountMock.mockResolvedValue(true);
    useTokenFiatRateMock.mockReturnValue(2);

    useTransactionPayPrefetchMock.mockReturnValue({ enabled: false });
    useUpdateTransactionPayAmountMock.mockReturnValue({
      updateTransactionPayAmount: updateTransactionPayAmountMock,
    } as ReturnType<typeof useUpdateTransactionPayAmountMock>);

    useTransactionPayTokenMock.mockReturnValue({
      payToken: buildPaymentTokenMock({
        address: TOKEN_ADDRESS_MOCK,
        balanceUsd: '1234.56',
        chainId: '0x1',
      }),
    } as ReturnType<typeof useTransactionPayToken>);

    useParamsMock.mockReturnValue({});
    usePredictBalanceMock.mockReturnValue({ data: 0 } as never);
    useMoneyAccountBalanceMock.mockReturnValue({
      withdrawableFiatRaw: undefined,
      tokenTotal: undefined,
    } as ReturnType<typeof useMoneyAccountBalance>);
    useConfirmationMetricEventsMock.mockReturnValue({
      setConfirmationMetric: setConfirmationMetricMock,
    } as unknown as ReturnType<typeof useConfirmationMetricEvents>);
    useTransactionPayIsMaxAmountMock.mockReturnValue(false);
    useTransactionPayIsPostQuoteMock.mockReturnValue(false);
    useIsTransactionPayQuoteLoadingMock.mockReturnValue(false);
    useTransactionPayQuotesLastUpdatedMock.mockReturnValue(undefined);
    useTransactionPayHasSourceAmountMock.mockReturnValue(true);
    useTransactionPayFiatPaymentMock.mockReturnValue(undefined);
    useMMPayFiatConfigMock.mockReturnValue({
      enabledTransactionTypes: [],
    } as unknown as ReturnType<typeof useMMPayFiatConfig>);
    useRampsBuyLimitsMock.mockReturnValue({
      amountLimitError: null,
      currency: 'usd',
    });

    (selectMetaMaskPayFlags as unknown as jest.Mock).mockReturnValue({
      prefilledAmount: {
        default: { enabled: false },
        overrides: {},
      },
    });
    (selectDepositLimits as unknown as jest.Mock).mockReturnValue({});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns pending amount provided by updatePendingAmount', async () => {
    const { result } = runHook();

    await act(async () => {
      result.current.updatePendingAmount('123.45');
    });

    expect(result.current.amountFiat).toBe('123.45');
  });

  it('returns amount human calculated from fiat amount', async () => {
    const { result } = runHook();

    await act(async () => {
      result.current.updatePendingAmount('123.45');
    });

    expect(result.current.amountHuman).toBe('61.725');
  });

  it('converts deposit USD to mUSD at par, applying no market rate', async () => {
    const { result } = runHook({
      transactionMeta: {
        type: TransactionType.moneyAccountDeposit,
      },
    });

    await act(async () => {
      result.current.updatePendingAmount('123.45');
    });

    expect(result.current.amountHuman).toBe('123.45');
  });

  it('converts withdraw USD to mUSD at par, applying no market rate', async () => {
    const { result } = runHook({
      transactionMeta: {
        type: TransactionType.moneyAccountWithdraw,
      },
    });

    await act(async () => {
      result.current.updatePendingAmount('123.45');
    });

    expect(result.current.amountHuman).toBe('123.45');
  });

  it('returns amount human calculated from nested call address', async () => {
    const { result } = runHook({
      transactionMeta: {
        txParams: {
          data: '0x4567',
          from: '0xabc',
        },
        nestedTransactions: [
          {
            data: TOKEN_TRANSFER_DATA,
            to: '0x123',
          },
        ],
      },
    });

    await act(async () => {
      result.current.updatePendingAmount('123.45');
    });

    expect(useTokenFiatRateMock).toHaveBeenCalledWith(
      '0x123',
      expect.anything(),
      undefined,
    );
  });

  it('returns amount fiat as zero if value empty', async () => {
    const { result } = runHook();

    await act(async () => {
      result.current.updatePendingAmount('');
    });

    expect(result.current.amountFiat).toBe('0');
  });

  it('returns amount fiat as zero if value has multiple leading zeroes', async () => {
    const { result } = runHook();

    await act(async () => {
      result.current.updatePendingAmount('000123');
    });

    expect(result.current.amountFiat).toBe('123');
  });

  it.each([',', '.'])(
    'adds leading zero to amount fiat if starts with %s',
    async (char) => {
      const { result } = runHook();

      await act(async () => {
        result.current.updatePendingAmount(char + '123');
      });

      expect(result.current.amountFiat).toBe('0' + char + '123');
    },
  );

  it('ignores value if length greater than max', async () => {
    const { result } = runHook();

    await act(async () => {
      result.current.updatePendingAmount('1'.repeat(26));
      result.current.updatePendingAmount('1'.repeat(27));
      result.current.updatePendingAmount('1'.repeat(28));
    });

    expect(result.current.amountFiat).toBe('1'.repeat(27));
  });

  describe('fiat payment maximum purchase limit', () => {
    function mockFiatBuyLimit(maxAmount?: number) {
      useMMPayFiatConfigMock.mockReturnValue({
        enabledTransactionTypes: [TransactionType.simpleSend],
      } as unknown as ReturnType<typeof useMMPayFiatConfig>);
      useTransactionPayFiatPaymentMock.mockReturnValue({
        selectedPaymentMethodId: '/payments/apple-pay',
      });
      useRampsBuyLimitsMock.mockReturnValue({
        maxAmount,
        amountLimitError: null,
        currency: 'usd',
      });
    }

    it('ignores input that exceeds the fiat maximum purchase', async () => {
      mockFiatBuyLimit(3000);
      const { result } = runHook();

      await act(async () => {
        result.current.updatePendingAmount('3000');
        result.current.updatePendingAmount('30000');
      });

      expect(result.current.amountFiat).toBe('3000');
    });

    it('allows input equal to the fiat maximum purchase', async () => {
      mockFiatBuyLimit(3000);
      const { result } = runHook();

      await act(async () => {
        result.current.updatePendingAmount('3000');
      });

      expect(result.current.amountFiat).toBe('3000');
    });

    it('does not cap input when no fiat payment method is selected', async () => {
      const { result } = runHook();

      await act(async () => {
        result.current.updatePendingAmount('30000');
      });

      expect(result.current.amountFiat).toBe('30000');
    });

    it('does not cap input when the payment method has no maximum', async () => {
      mockFiatBuyLimit(null as unknown as undefined);
      const { result } = runHook();

      await act(async () => {
        result.current.updatePendingAmount('30000');
      });

      expect(result.current.amountFiat).toBe('30000');
    });
  });

  it('updateTokenAmount delegates to updateTransactionPayAmount with the human amount', async () => {
    const { result } = runHook();

    await act(async () => {
      result.current.updatePendingAmount('123.45');
    });

    await act(async () => {
      result.current.updateTokenAmount();
    });

    expect(updateTransactionPayAmountMock).toHaveBeenCalledWith('61.725');
  });

  it('prefetches an optimized amount update after the typing debounce', async () => {
    useTransactionPayPrefetchMock.mockReturnValue({ enabled: true });
    useUpdateTransactionPayAmountMock.mockReturnValue({
      updateTransactionPayAmount: updateTransactionPayAmountMock,
    } as ReturnType<typeof useUpdateTransactionPayAmountMock>);
    const { result } = runHook({
      transactionMeta: { type: TransactionType.moneyAccountDeposit },
    });

    await act(async () => {
      result.current.updatePendingAmount('12');
    });
    await act(async () => {
      jest.advanceTimersByTime(200);
      result.current.updatePendingAmount('123.45');
    });
    await act(async () => {
      jest.advanceTimersByTime(299);
    });

    expect(updateTransactionPayAmountMock).not.toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(1);
    });

    expect(updateTransactionPayAmountMock).toHaveBeenCalledTimes(1);
    expect(updateTransactionPayAmountMock).toHaveBeenCalledWith('123.45');
  });

  it('marks the current amount as prefetched once its quote settles', async () => {
    useTransactionPayPrefetchMock.mockReturnValue({ enabled: true });
    useUpdateTransactionPayAmountMock.mockReturnValue({
      updateTransactionPayAmount: updateTransactionPayAmountMock,
    } as ReturnType<typeof useUpdateTransactionPayAmountMock>);
    useTransactionPayQuotesLastUpdatedMock.mockReturnValue(10);
    const { result, rerender } = runHook({
      transactionMeta: { type: TransactionType.moneyAccountDeposit },
    });

    await act(async () => {
      result.current.updatePendingAmount('123.45');
    });
    await act(async () => {
      jest.runAllTimers();
    });

    expect(result.current.hasPrefetchedQuote).toBe(false);

    useIsTransactionPayQuoteLoadingMock.mockReturnValue(true);
    rerender(undefined);
    useIsTransactionPayQuoteLoadingMock.mockReturnValue(false);
    useTransactionPayQuotesLastUpdatedMock.mockReturnValue(11);
    rerender(undefined);

    expect(result.current.hasPrefetchedQuote).toBe(true);

    await act(async () => {
      result.current.updatePendingAmount('456.78');
    });

    expect(result.current.hasPrefetchedQuote).toBe(false);
  });

  it('invalidates a prefetched quote when the pay token changes', async () => {
    useTransactionPayPrefetchMock.mockReturnValue({ enabled: true });
    useUpdateTransactionPayAmountMock.mockReturnValue({
      updateTransactionPayAmount: updateTransactionPayAmountMock,
    } as ReturnType<typeof useUpdateTransactionPayAmountMock>);
    useTransactionPayQuotesLastUpdatedMock.mockReturnValue(10);
    const { result, rerender } = runHook({
      transactionMeta: { type: TransactionType.moneyAccountDeposit },
    });

    await act(async () => {
      result.current.updatePendingAmount('123.45');
    });
    await act(async () => {
      jest.runAllTimers();
    });
    useIsTransactionPayQuoteLoadingMock.mockReturnValue(true);
    rerender(undefined);
    useIsTransactionPayQuoteLoadingMock.mockReturnValue(false);
    useTransactionPayQuotesLastUpdatedMock.mockReturnValue(11);
    rerender(undefined);

    expect(result.current.hasPrefetchedQuote).toBe(true);

    useTransactionPayTokenMock.mockReturnValue({
      payToken: buildPaymentTokenMock({
        address: '0x9876543210987654321098765432109876543210',
        balanceUsd: '1234.56',
        chainId: '0x1',
      }),
    } as ReturnType<typeof useTransactionPayToken>);
    await act(async () => {
      rerender(undefined);
    });

    expect(result.current.hasPrefetchedQuote).toBe(false);

    useIsTransactionPayQuoteLoadingMock.mockReturnValue(true);
    rerender(undefined);
    useIsTransactionPayQuoteLoadingMock.mockReturnValue(false);
    useTransactionPayQuotesLastUpdatedMock.mockReturnValue(12);
    rerender(undefined);

    expect(result.current.hasPrefetchedQuote).toBe(true);
  });

  it('does not mark an unpublished optimized amount update as prefetched', async () => {
    updateTransactionPayAmountMock.mockResolvedValue(false);
    useTransactionPayPrefetchMock.mockReturnValue({ enabled: true });
    useUpdateTransactionPayAmountMock.mockReturnValue({
      updateTransactionPayAmount: updateTransactionPayAmountMock,
    } as ReturnType<typeof useUpdateTransactionPayAmountMock>);
    useTransactionPayQuotesLastUpdatedMock.mockReturnValue(10);
    const { result, rerender } = runHook({
      transactionMeta: { type: TransactionType.moneyAccountDeposit },
    });

    await act(async () => {
      result.current.updatePendingAmount('123.45');
    });
    await act(async () => {
      jest.runAllTimers();
    });
    useIsTransactionPayQuoteLoadingMock.mockReturnValue(true);
    rerender(undefined);
    useIsTransactionPayQuoteLoadingMock.mockReturnValue(false);
    useTransactionPayQuotesLastUpdatedMock.mockReturnValue(11);
    rerender(undefined);

    expect(result.current.hasPrefetchedQuote).toBe(false);
  });

  it('does not prefetch an amount update when the optimized pipeline is disabled', async () => {
    const { result } = runHook({
      transactionMeta: { type: TransactionType.moneyAccountDeposit },
    });

    await act(async () => {
      result.current.updatePendingAmount('123.45');
    });

    await act(async () => {
      jest.runAllTimers();
    });

    expect(updateTransactionPayAmountMock).not.toHaveBeenCalled();
  });

  it('does not prefetch a zero amount', async () => {
    useTransactionPayPrefetchMock.mockReturnValue({ enabled: true });
    useUpdateTransactionPayAmountMock.mockReturnValue({
      updateTransactionPayAmount: updateTransactionPayAmountMock,
    } as ReturnType<typeof useUpdateTransactionPayAmountMock>);

    runHook({
      transactionMeta: { type: TransactionType.moneyAccountDeposit },
    });

    await act(async () => {
      jest.runAllTimers();
    });

    expect(updateTransactionPayAmountMock).not.toHaveBeenCalled();
  });

  it('sets mm_pay_quote_requested metric only when hasSourceAmount becomes true after updateTokenAmount was called', async () => {
    useTransactionPayHasSourceAmountMock.mockReturnValue(false);

    const { result, rerender } = runHook();

    await act(async () => {
      result.current.updatePendingAmount('123.45');
    });

    setConfirmationMetricMock.mockClear();

    await act(async () => {
      result.current.updateTokenAmount();
    });

    expect(setConfirmationMetricMock).not.toHaveBeenCalled();

    // Simulate hasSourceAmount becoming true
    useTransactionPayHasSourceAmountMock.mockReturnValue(true);

    await act(async () => {
      rerender({});
    });

    expect(setConfirmationMetricMock).toHaveBeenCalledWith({
      properties: expect.objectContaining({
        mm_pay_quote_requested: true,
      }),
    });
  });

  it('sets mm_pay_quote_requested metric when isPostQuote is true even if hasSourceAmount is false', async () => {
    useTransactionPayHasSourceAmountMock.mockReturnValue(false);
    useTransactionPayIsPostQuoteMock.mockReturnValue(true);

    const { result } = runHook();

    await act(async () => {
      result.current.updatePendingAmount('123.45');
    });

    setConfirmationMetricMock.mockClear();

    await act(async () => {
      result.current.updateTokenAmount();
    });

    expect(setConfirmationMetricMock).toHaveBeenCalledWith({
      properties: expect.objectContaining({
        mm_pay_quote_requested: true,
      }),
    });
  });

  it('includes mm_pay_time_to_request_quote_ms measuring from last amount change', async () => {
    useTransactionPayHasSourceAmountMock.mockReturnValue(false);

    const { result, rerender } = runHook();

    const dateNowSpy = jest.spyOn(Date, 'now').mockReturnValue(1746696741000);

    await act(async () => {
      result.current.updatePendingAmount('100');
    });

    setConfirmationMetricMock.mockClear();

    await act(async () => {
      result.current.updateTokenAmount();
    });

    dateNowSpy.mockReturnValue(1746696741250);
    useTransactionPayHasSourceAmountMock.mockReturnValue(true);

    await act(async () => {
      rerender({});
    });

    expect(setConfirmationMetricMock).toHaveBeenCalledWith({
      properties: expect.objectContaining({
        mm_pay_quote_requested: true,
        mm_pay_time_to_request_quote_ms: 250,
      }),
    });
  });

  it('returns default amount from params if available', async () => {
    useParamsMock.mockReturnValue({ amount: '43.21' });

    const { result } = runHook();

    expect(result.current.amountFiat).toBe('43.21');
  });

  it('rejects keypad and percentage edits for membership top-ups', () => {
    useParamsMock.mockReturnValue({
      amount: '1',
    });
    const { result } = runHook({
      transactionMeta: {
        type: MEMBERSHIP_SUBSCRIPTION_TRANSACTION_TYPE,
      },
    });

    act(() => {
      result.current.updatePendingAmount('50');
      expect(result.current.updatePendingAmountPercentage(100)).toBe(false);
      expect(result.current.updatePendingAmountPercentage(50)).toBe(false);
    });

    expect(result.current.amountFiat).toBe('1');
    expect(result.current.hasUserEditedAmountRef.current).toBe(false);
  });

  it('keeps the membership amount when the payment token loses its balance', () => {
    useParamsMock.mockReturnValue({
      amount: '1',
    });
    useTransactionPayTokenMock.mockReturnValue({
      payToken: {
        assetId: `eip155:1/erc20:${TOKEN_ADDRESS_MOCK}`,
        balanceUsd: '500',
        balanceFiat: '500',
        balanceHuman: '500',
        balanceRaw: '500000000',
        decimals: 6,
        symbol: 'USDC',
      },
      setPayToken: jest.fn(),
    });
    const { result, rerender } = runHook({
      transactionMeta: {
        type: MEMBERSHIP_SUBSCRIPTION_TRANSACTION_TYPE,
      },
    });

    act(() => {
      useTransactionPayTokenMock.mockReturnValue({
        payToken: undefined,
        setPayToken: jest.fn(),
      });
      rerender({});
    });

    expect(result.current.amountFiat).toBe('1');
  });

  it.each([
    [
      'top-level membership',
      undefined,
      { type: MEMBERSHIP_SUBSCRIPTION_TRANSACTION_TYPE },
    ],
    [
      'nested membership batch',
      undefined,
      {
        type: TransactionType.batch,
        nestedTransactions: [
          { type: MEMBERSHIP_SUBSCRIPTION_TRANSACTION_TYPE },
        ],
      },
    ],
    [
      'top-level membership',
      0,
      { type: MEMBERSHIP_SUBSCRIPTION_TRANSACTION_TYPE },
    ],
    [
      'nested membership batch',
      0,
      {
        type: TransactionType.batch,
        nestedTransactions: [
          { type: MEMBERSHIP_SUBSCRIPTION_TRANSACTION_TYPE },
        ],
      },
    ],
    [
      'top-level membership',
      0.5,
      { type: MEMBERSHIP_SUBSCRIPTION_TRANSACTION_TYPE },
    ],
    [
      'nested membership batch',
      0.5,
      {
        type: TransactionType.batch,
        nestedTransactions: [
          { type: MEMBERSHIP_SUBSCRIPTION_TRANSACTION_TYPE },
        ],
      },
    ],
  ] as [string, number | undefined, Partial<TransactionMeta>][])(
    'commits fixed membership amount for %s when token fiat rate is %s',
    async (_transactionKind, tokenFiatRate, transactionMeta) => {
      useParamsMock.mockReturnValue({ amount: '12.34' });
      useTokenFiatRateMock.mockReturnValue(tokenFiatRate);
      const { result } = runHook({ transactionMeta });

      expect(result.current.amountHuman).toBe('12.34');

      await act(async () => {
        await result.current.updateTokenAmount();
      });

      expect(updateTransactionPayAmountMock).toHaveBeenCalledWith('12.34');
    },
  );

  it('preserves an explicit money account deposit amount when balance prefill is enabled', async () => {
    (selectMetaMaskPayFlags as unknown as jest.Mock).mockReturnValue({
      prefilledAmount: {
        default: { enabled: false },
        overrides: {
          moneyAccountDeposit: { enabled: true },
        },
      },
    });
    useParamsMock.mockReturnValue({ amount: '5' });
    useTransactionPayTokenMock.mockReturnValue({
      payToken: buildPaymentTokenMock({
        address: TOKEN_ADDRESS_MOCK,
        balanceUsd: '500',
        chainId: '0x1',
      }),
    } as ReturnType<typeof useTransactionPayToken>);

    const { result } = runHook({
      transactionMeta: {
        type: TransactionType.moneyAccountDeposit,
        batchId: '0xtestbatchid',
      },
    });

    await act(async () => {
      jest.runAllTimers();
    });

    expect(result.current.amountFiat).toBe('5');
    expect(result.current.depositPrefillStatus).toBe(
      DepositPrefillStatus.Prefilled,
    );
  });

  it('preserves edits after starting from an explicit money account deposit amount', async () => {
    (selectMetaMaskPayFlags as unknown as jest.Mock).mockReturnValue({
      prefilledAmount: {
        default: { enabled: false },
        overrides: {
          moneyAccountDeposit: { enabled: true },
        },
      },
    });
    useParamsMock.mockReturnValue({ amount: '5' });
    useTransactionPayTokenMock.mockReturnValue({
      payToken: buildPaymentTokenMock({
        address: TOKEN_ADDRESS_MOCK,
        balanceUsd: '500',
        chainId: '0x1',
      }),
    } as ReturnType<typeof useTransactionPayToken>);

    const { result, rerender } = runHook({
      transactionMeta: {
        type: TransactionType.moneyAccountDeposit,
        batchId: '0xtestbatchid',
      },
    });

    await act(async () => {
      result.current.updatePendingAmount('57');
    });

    useParamsMock.mockReturnValue({ amount: '5' });
    useTransactionPayTokenMock.mockReturnValue({
      payToken: buildPaymentTokenMock({
        address: TOKEN_ADDRESS_MOCK,
        balanceUsd: '9999',
        chainId: '0x1',
      }),
    } as ReturnType<typeof useTransactionPayToken>);

    await act(async () => {
      rerender({});
      jest.runAllTimers();
    });

    expect(result.current.amountFiat).toBe('57');
  });

  it('displays the full input amount when isMaxAmount is true, not the destination-received targetAmount.usd', async () => {
    // The input field always shows what the user is putting in (their full
    // balance on Max). The net amount received after fees is surfaced by the
    // receive row, so the input no longer overrides its display with
    // targetAmount.usd.
    useTransactionPayIsMaxAmountMock.mockReturnValue(true);
    useParamsMock.mockReturnValue({ amount: '100' });

    const { result } = runHook();

    expect(result.current.amountFiat).toBe('100');
  });

  it('returns isInputChanged as true after amount changed and debounce', async () => {
    const { result } = runHook();

    expect(result.current.isInputChanged).toBe(false);

    await act(async () => {
      result.current.updatePendingAmount('123.45');
    });

    expect(result.current.isInputChanged).toBe(false);

    await act(async () => {
      jest.runAllTimers();
    });

    expect(result.current.isInputChanged).toBe(true);
  });

  it('sets manual metric when updatePendingAmount is called', async () => {
    const { result } = runHook();

    await act(async () => {
      result.current.updatePendingAmount('123.45');
    });

    expect(setConfirmationMetricMock).toHaveBeenCalledWith({
      properties: {
        mm_pay_amount_input_type: 'manual',
      },
    });
  });

  it('sets percentage metric when updatePendingAmountPercentage is called', async () => {
    const { result } = runHook();

    await act(async () => {
      result.current.updatePendingAmountPercentage(50);
    });

    expect(setConfirmationMetricMock).toHaveBeenCalledWith({
      properties: {
        mm_pay_amount_input_type: '50%',
      },
    });
  });

  it('sets the provided input type metric when updatePendingAmountPercentage is called with one', async () => {
    const { result } = runHook();

    await act(async () => {
      result.current.updatePendingAmountPercentage(100, 'manual_snapped_max');
    });

    expect(setConfirmationMetricMock).toHaveBeenCalledWith({
      properties: {
        mm_pay_amount_input_type: 'manual_snapped_max',
      },
    });
  });

  it('sets manual metric once across consecutive updatePendingAmount calls', async () => {
    const { result } = runHook();

    await act(async () => {
      result.current.updatePendingAmount('123.45');
    });

    await act(async () => {
      result.current.updatePendingAmount('123.46');
    });

    const manualMetricCalls = setConfirmationMetricMock.mock.calls.filter(
      ([metric]) => metric.properties?.mm_pay_amount_input_type === 'manual',
    );

    expect(manualMetricCalls).toHaveLength(1);
  });

  it('sets input type metric matching the last input source across manual and percentage updates', async () => {
    const { result } = runHook();

    await act(async () => {
      result.current.updatePendingAmount('123.45');
    });

    await act(async () => {
      result.current.updatePendingAmountPercentage(50);
    });

    await act(async () => {
      result.current.updatePendingAmount('678.9');
    });

    const inputTypeMetrics = setConfirmationMetricMock.mock.calls
      .map(([metric]) => metric.properties?.mm_pay_amount_input_type)
      .filter(Boolean);

    expect(inputTypeMetrics).toEqual(['manual', '50%', 'manual']);
  });

  it('returns hasInput as true after amount changed and debounce', async () => {
    const { result } = runHook();

    expect(result.current.hasInput).toBe(false);

    await act(async () => {
      result.current.updatePendingAmount('123.45');
    });

    expect(result.current.hasInput).toBe(false);

    await act(async () => {
      jest.runAllTimers();
    });

    expect(result.current.hasInput).toBe(true);

    await act(async () => {
      result.current.updatePendingAmount('0');
    });

    expect(result.current.hasInput).toBe(false);
  });

  it('clears debounced amounts immediately when amount is cleared', async () => {
    const { result } = runHook();

    await act(async () => {
      result.current.updatePendingAmount('123.45');
    });

    await act(async () => {
      jest.runAllTimers();
    });

    expect(result.current.amountFiatDebounced).toBe('123.45');

    await act(async () => {
      result.current.updatePendingAmount('0');
    });

    expect(result.current.amountFiatDebounced).toBe('0');
    expect(result.current.amountHumanDebounced).toBe('0');
  });

  describe('updatePendingAmountPercentage updates amount fiat', () => {
    it('returns false when there is no balance', async () => {
      useTransactionPayTokenMock.mockReturnValue({
        payToken: buildPaymentTokenMock({
          address: TOKEN_ADDRESS_MOCK,
          balanceUsd: '0',
          chainId: '0x1',
        }),
      } as ReturnType<typeof useTransactionPayToken>);

      const { result } = runHook();
      let didApply = true;

      await act(async () => {
        didApply = result.current.updatePendingAmountPercentage(100);
      });

      expect(didApply).toBe(false);
      expect(result.current.amountFiat).toBe('0');
    });

    it('returns false when balance rounds down to dust ($0.00)', async () => {
      useTransactionPayTokenMock.mockReturnValue({
        payToken: buildPaymentTokenMock({
          address: TOKEN_ADDRESS_MOCK,
          balanceUsd: '0.004',
          chainId: '0x1',
        }),
      } as ReturnType<typeof useTransactionPayToken>);

      const { result } = runHook();
      let didApply = true;

      await act(async () => {
        didApply = result.current.updatePendingAmountPercentage(100);
      });

      expect(didApply).toBe(false);
      expect(result.current.amountFiat).toBe('0');
    });

    it('to percentage of token balance', async () => {
      const { result } = runHook();

      await act(async () => {
        result.current.updatePendingAmountPercentage(43);
      });

      expect(result.current.amountFiat).toBe('530.86');
    });

    it('to percentage of token balance converted to usd if overridden', async () => {
      const { result } = runHook({
        transactionMeta: { type: TransactionType.predictDeposit },
      });

      await act(async () => {
        result.current.updatePendingAmountPercentage(43);
      });

      expect(result.current.amountFiat).toBe('530.86');
    });

    it('rounds a sub-100% amount down to cents so Total matches the amount plus fee shown', async () => {
      // The input truncates to cents but Total prices the committed amount in
      // full, so sub-cent digits left Total a cent above amount + fee.
      useTransactionPayTokenMock.mockReturnValue({
        payToken: buildPaymentTokenMock({
          address: TOKEN_ADDRESS_MOCK,
          balanceUsd: '58.841171',
          chainId: '0x1',
        }),
      } as ReturnType<typeof useTransactionPayToken>);

      const { result } = runHook();

      await act(async () => {
        result.current.updatePendingAmountPercentage(50);
      });

      expect(result.current.amountFiat).toBe('29.42');
    });

    it('to 100 percent of balance when selecting max', async () => {
      const { result } = runHook();

      await act(async () => {
        result.current.updatePendingAmountPercentage(100);
      });

      expect(result.current.amountFiat).toBe('1234.56');
      expect(setTransactionConfigMock).toHaveBeenCalledTimes(1);

      const config = { isMaxAmount: false };
      setTransactionConfigMock.mock.calls[0][1](config);
      expect(config.isMaxAmount).toBe(true);
    });

    it('to percentage of predict balance as USD 1:1', async () => {
      usePredictBalanceMock.mockReturnValue({ data: 4321.23 } as never);

      const { result } = runHook({
        transactionMeta: {
          type: TransactionType.predictWithdraw,
        },
      });

      await act(async () => {
        result.current.updatePendingAmountPercentage(43);
      });

      expect(result.current.amountFiat).toBe('1858.12');
    });

    it('to total predict balance when selecting max', async () => {
      usePredictBalanceMock.mockReturnValue({ data: 4321.23 } as never);

      const { result } = runHook({
        transactionMeta: {
          type: TransactionType.predictWithdraw,
        },
      });

      await act(async () => {
        result.current.updatePendingAmountPercentage(100);
      });

      expect(result.current.amountFiat).toBe('4321.23');
    });

    it('uses predict balance for predictWithdraw even when payment override is MoneyAccount', async () => {
      usePredictBalanceMock.mockReturnValue({ data: 4321.23 } as never);
      useMoneyAccountBalanceMock.mockReturnValue({
        withdrawableFiatRaw: '750.50',
      } as ReturnType<typeof useMoneyAccountBalance>);

      const { result } = runHook({
        transactionMeta: {
          type: TransactionType.predictWithdraw,
          id: transactionIdMock,
          chainId: '0x1' as Hex,
          txParams: { from: '0xabc' },
        } as unknown as Partial<TransactionMeta>,
        stateOverrides: {
          engine: {
            backgroundState: {
              TransactionPayController: {
                transactionData: {
                  [transactionIdMock]: {
                    paymentOverride: PaymentOverride.MoneyAccount,
                  },
                },
              },
            },
          },
        },
      });

      await act(async () => {
        result.current.updatePendingAmountPercentage(50);
      });

      // Predict balance is treated as USD 1:1, ignoring the pay-token fiat rate.
      expect(result.current.amountFiat).toBe('2160.61');
    });

    it('uses full predict balance for predictWithdraw max even when payment override is MoneyAccount', async () => {
      usePredictBalanceMock.mockReturnValue({ data: 4321.23 } as never);
      useMoneyAccountBalanceMock.mockReturnValue({
        withdrawableFiatRaw: '750.50',
      } as ReturnType<typeof useMoneyAccountBalance>);

      const { result } = runHook({
        transactionMeta: {
          type: TransactionType.predictWithdraw,
          id: transactionIdMock,
          chainId: '0x1' as Hex,
          txParams: { from: '0xabc' },
        } as unknown as Partial<TransactionMeta>,
        stateOverrides: {
          engine: {
            backgroundState: {
              TransactionPayController: {
                transactionData: {
                  [transactionIdMock]: {
                    paymentOverride: PaymentOverride.MoneyAccount,
                  },
                },
              },
            },
          },
        },
      });

      await act(async () => {
        result.current.updatePendingAmountPercentage(100);
      });

      // Predict balance is treated as USD 1:1, ignoring the pay-token fiat rate.
      expect(result.current.amountFiat).toBe('4321.23');
    });

    it('to percentage of perps available balance', async () => {
      const { result } = runHook({
        transactionMeta: {
          type: TransactionType.perpsWithdraw,
        },
        stateOverrides: {
          engine: {
            backgroundState: {
              PerpsController: {
                accountState: {
                  spendableBalance: '500.00',
                  withdrawableBalance: '500.00',
                },
              },
            },
          },
        },
      });

      await act(async () => {
        result.current.updatePendingAmountPercentage(50);
      });

      expect(result.current.amountFiat).toBe('250');
    });

    it('keeps the full precision of the Max amount for perps withdraw', async () => {
      // Real HL balances often have 3+ decimals (e.g. 50.389). Max must apply
      // the balance exactly so the withdraw encodes the whole position;
      // truncating to 2dp left dust behind. The amount can never exceed the
      // balance because it is the balance. Rounding to cents is display-only,
      // in custom-amount.tsx.
      const { result } = runHook({
        transactionMeta: {
          type: TransactionType.perpsWithdraw,
        },
        stateOverrides: {
          engine: {
            backgroundState: {
              PerpsController: {
                accountState: {
                  spendableBalance: '50.389',
                  withdrawableBalance: '50.389',
                },
              },
            },
          },
        },
      });

      await act(async () => {
        result.current.updatePendingAmountPercentage(100);
      });

      expect(result.current.amountFiat).toBe('50.389');
    });

    it('sets isMaxAmount=true for perps withdraw when Max is pressed', async () => {
      // The correct source balance (HyperLiquid, not the wallet USDC balance)
      // is resolved by TPC's getBalance callback, so the Max button always arms
      // isMaxAmount regardless of the transaction type.
      const { result } = runHook({
        transactionMeta: {
          type: TransactionType.perpsWithdraw,
        },
        stateOverrides: {
          engine: {
            backgroundState: {
              PerpsController: {
                accountState: {
                  spendableBalance: '500.00',
                  withdrawableBalance: '500.00',
                },
              },
            },
          },
        },
      });

      await act(async () => {
        result.current.updatePendingAmountPercentage(100);
      });

      const config = { isMaxAmount: false };
      setTransactionConfigMock.mock.calls[0][1](config);
      expect(config.isMaxAmount).toBe(true);
    });

    it('returns 0 for perps withdraw when no available balance', async () => {
      const { result } = runHook({
        transactionMeta: {
          type: TransactionType.perpsWithdraw,
        },
        stateOverrides: {
          engine: {
            backgroundState: {
              PerpsController: {
                accountState: {},
              },
            },
          },
        },
      });

      await act(async () => {
        result.current.updatePendingAmountPercentage(100);
      });

      expect(result.current.amountFiat).toBe('0');
    });

    it('to percentage of money account balance in USD (token total × USD rate)', async () => {
      useTokenFiatRateMock.mockReturnValue(1);
      useMoneyAccountBalanceMock.mockReturnValue({
        withdrawableMusd: new BigNumber(500),
      } as ReturnType<typeof useMoneyAccountBalance>);

      const { result } = runHook({
        transactionMeta: {
          type: TransactionType.moneyAccountWithdraw,
        },
        stateOverrides: getMoneyAccountState('500000000'),
      });

      await act(async () => {
        result.current.updatePendingAmountPercentage(50);
      });

      expect(result.current.amountFiat).toBe('250');
    });

    it('to total money account balance when selecting max', async () => {
      useTokenFiatRateMock.mockReturnValue(1);
      useMoneyAccountBalanceMock.mockReturnValue({
        withdrawableMusd: new BigNumber(500),
      } as ReturnType<typeof useMoneyAccountBalance>);

      const { result } = runHook({
        transactionMeta: {
          type: TransactionType.moneyAccountWithdraw,
        },
        stateOverrides: getMoneyAccountState('500000000'),
      });

      await act(async () => {
        result.current.updatePendingAmountPercentage(100);
      });

      expect(result.current.amountFiat).toBe('500');
    });

    it('keeps full precision for money account withdraw Max so the encoded withdraw matches the quote', async () => {
      // Cent-rounding here made the withdraw smaller than the amount the quote
      // had sized against the exact balance, reverting with
      // InsufficientBalance. The amount input truncates for display instead.
      useTokenFiatRateMock.mockReturnValue(1);
      useMoneyAccountBalanceMock.mockReturnValue({
        withdrawableMusd: new BigNumber('500.123456'),
      } as ReturnType<typeof useMoneyAccountBalance>);

      const { result } = runHook({
        transactionMeta: {
          type: TransactionType.moneyAccountWithdraw,
        },
        stateOverrides: getMoneyAccountState('500123456'),
      });

      await act(async () => {
        result.current.updatePendingAmountPercentage(100);
      });

      expect(result.current.amountFiat).toBe('500.123456');
    });

    it('pads a lone decimal up to cents without losing precision', async () => {
      useTokenFiatRateMock.mockReturnValue(1);
      useMoneyAccountBalanceMock.mockReturnValue({
        withdrawableMusd: new BigNumber('1000.2'),
      } as ReturnType<typeof useMoneyAccountBalance>);

      const { result } = runHook({
        transactionMeta: {
          type: TransactionType.moneyAccountWithdraw,
        },
        stateOverrides: getMoneyAccountState('1000200000'),
      });

      await act(async () => {
        result.current.updatePendingAmountPercentage(50);
      });

      expect(result.current.amountFiat).toBe('500.10');
    });

    it('sets isMaxAmount=true for money account withdraw when Max is pressed', async () => {
      // The mUSD + vmUSD aggregate balance is resolved by TPC's getBalance
      // callback, so the Max button always arms isMaxAmount here too.
      useTokenFiatRateMock.mockReturnValue(1);
      useMoneyAccountBalanceMock.mockReturnValue({
        withdrawableMusd: new BigNumber(500),
      } as ReturnType<typeof useMoneyAccountBalance>);

      const { result } = runHook({
        transactionMeta: {
          type: TransactionType.moneyAccountWithdraw,
        },
        stateOverrides: getMoneyAccountState('500000000'),
      });

      await act(async () => {
        result.current.updatePendingAmountPercentage(100);
      });

      expect(result.current.amountFiat).toBe('500');

      const config = { isMaxAmount: false };
      setTransactionConfigMock.mock.calls[0][1](config);
      expect(config.isMaxAmount).toBe(true);
    });

    it('returns 0 for money account withdraw when withdrawableMusd is undefined', async () => {
      useTokenFiatRateMock.mockReturnValue(1);
      useMoneyAccountBalanceMock.mockReturnValue({
        withdrawableMusd: undefined,
      } as ReturnType<typeof useMoneyAccountBalance>);

      const { result } = runHook({
        transactionMeta: {
          type: TransactionType.moneyAccountWithdraw,
        },
      });

      await act(async () => {
        result.current.updatePendingAmountPercentage(50);
      });

      expect(result.current.amountFiat).toBe('0');
    });

    it('sets isMax to false when percentage is not 100 and isMaxAmount is true', async () => {
      useTransactionPayIsMaxAmountMock.mockReturnValue(true);

      const { result } = runHook();

      await act(async () => {
        result.current.updatePendingAmountPercentage(50);
      });

      const config = { isMaxAmount: true };
      setTransactionConfigMock.mock.calls[0][1](config);
      expect(config.isMaxAmount).toBe(false);
    });
  });

  describe('addMusd intent auto-fill', () => {
    const addMusdTransactionMeta = {
      type: TransactionType.moneyAccountDeposit,
      batchId: '0xtestbatchid' as Hex,
    };

    beforeEach(() => {
      jest.mocked(getMoneyAccountDepositIntent).mockReturnValue('addMusd');
    });

    it('auto-fills with 100% of balance when intent is addMusd', async () => {
      const { result } = runHook({
        transactionMeta: addMusdTransactionMeta,
      });

      await act(async () => {
        jest.runAllTimers();
      });

      expect(result.current.amountFiat).toBe('1234.56');
    });

    it('does not auto-fill when intent is not addMusd', async () => {
      jest.mocked(getMoneyAccountDepositIntent).mockReturnValue('convert');

      const { result } = runHook({
        transactionMeta: addMusdTransactionMeta,
      });

      await act(async () => {
        jest.runAllTimers();
      });

      expect(result.current.amountFiat).toBe('0');
    });

    it('does not auto-fill when balance is zero', async () => {
      useTransactionPayTokenMock.mockReturnValue({
        payToken: buildPaymentTokenMock({
          address: TOKEN_ADDRESS_MOCK,
          balanceUsd: '0',
          chainId: '0x1',
        }),
      } as ReturnType<typeof useTransactionPayToken>);

      const { result } = runHook({
        transactionMeta: addMusdTransactionMeta,
      });

      await act(async () => {
        jest.runAllTimers();
      });

      expect(result.current.amountFiat).toBe('0');
    });

    it('only auto-fills once even if balance changes', async () => {
      const { result, rerender } = runHook({
        transactionMeta: addMusdTransactionMeta,
      });

      await act(async () => {
        jest.runAllTimers();
      });

      expect(result.current.amountFiat).toBe('1234.56');

      useTransactionPayTokenMock.mockReturnValue({
        payToken: buildPaymentTokenMock({
          address: TOKEN_ADDRESS_MOCK,
          balanceUsd: '9999',
          chainId: '0x1',
        }),
      } as ReturnType<typeof useTransactionPayToken>);

      await act(async () => {
        rerender({});
        jest.runAllTimers();
      });

      expect(result.current.amountFiat).toBe('1234.56');
    });

    it('returns isPrefillPending true while balance is not yet available', () => {
      useTransactionPayTokenMock.mockReturnValue({
        payToken: buildPaymentTokenMock({
          address: TOKEN_ADDRESS_MOCK,
          balanceUsd: '0',
          chainId: '0x1',
        }),
      } as ReturnType<typeof useTransactionPayToken>);

      const { result } = runHook({
        transactionMeta: addMusdTransactionMeta,
      });

      expect(result.current.isPrefillPending).toBe(true);
    });

    it('returns isPrefillPending false after balance loads and prefill completes', async () => {
      const { result } = runHook({
        transactionMeta: addMusdTransactionMeta,
      });

      await act(async () => {
        jest.runAllTimers();
      });

      expect(result.current.isPrefillPending).toBe(false);
      expect(result.current.amountFiat).toBe('1234.56');
    });

    it('returns isPrefillPending false for non-addMusd deposits', () => {
      jest.mocked(getMoneyAccountDepositIntent).mockReturnValue('convert');

      const { result } = runHook({
        transactionMeta: addMusdTransactionMeta,
      });

      expect(result.current.isPrefillPending).toBe(false);
    });
  });

  describe('money account deposit max', () => {
    const depositTransactionMeta = {
      type: TransactionType.moneyAccountDeposit,
      batchId: '0xtestbatchid' as Hex,
    };

    beforeEach(() => {
      jest.mocked(getMoneyAccountDepositIntent).mockReturnValue('convert');
    });

    it('updateTokenAmount uses the fiat-derived amount for a 100% deposit', async () => {
      // Money-account deposit Max no longer bypasses to full balanceRaw
      // precision. It flows through the same fiat-derived amount + atomic flag
      // path as every other Max; precision is preserved on the controller via
      // the atomic flag, not a full-precision override in the hook.
      useTransactionPayTokenMock.mockReturnValue({
        payToken: buildPaymentTokenMock({
          address: TOKEN_ADDRESS_MOCK,
          balanceUsd: '2.246912',
          balanceRaw: '1123456',
          decimals: 6,
          chainId: '0x1',
        }),
      } as ReturnType<typeof useTransactionPayToken>);

      const { result } = runHook({
        transactionMeta: depositTransactionMeta,
      });

      await act(async () => {
        result.current.updatePendingAmountPercentage(100);
      });

      await act(async () => {
        result.current.updateTokenAmount();
      });

      // 100% of 2.246912 committed as 2.246912 mUSD (par).
      expect(updateTransactionPayAmountMock).toHaveBeenCalledWith('2.246912');
    });

    it('updateTokenAmount uses fiat-derived amount for sub-100% deposit', async () => {
      useTransactionPayTokenMock.mockReturnValue({
        payToken: buildPaymentTokenMock({
          address: TOKEN_ADDRESS_MOCK,
          balanceUsd: '2.246912',
          balanceRaw: '1123456',
          decimals: 6,
          chainId: '0x1',
        }),
      } as ReturnType<typeof useTransactionPayToken>);

      const { result } = runHook({
        transactionMeta: depositTransactionMeta,
      });

      await act(async () => {
        result.current.updatePendingAmountPercentage(50);
      });

      await act(async () => {
        result.current.updateTokenAmount();
      });

      // 50% of 2.246912 is rounded down to the displayed cents and committed
      // as 1.12 mUSD (par).
      expect(updateTransactionPayAmountMock).toHaveBeenCalledWith('1.12');
    });

    it('manual input clears the deposit max override', async () => {
      useTransactionPayTokenMock.mockReturnValue({
        payToken: buildPaymentTokenMock({
          address: TOKEN_ADDRESS_MOCK,
          balanceUsd: '2.246912',
          balanceRaw: '1123456',
          decimals: 6,
          chainId: '0x1',
        }),
      } as ReturnType<typeof useTransactionPayToken>);

      const { result } = runHook({
        transactionMeta: depositTransactionMeta,
      });

      await act(async () => {
        result.current.updatePendingAmountPercentage(100);
      });

      await act(async () => {
        result.current.updatePendingAmount('7');
      });

      await act(async () => {
        result.current.updateTokenAmount();
      });

      // amountFiat = 7, committed as 7 mUSD (par).
      expect(updateTransactionPayAmountMock).toHaveBeenCalledWith('7');
    });

    it('does not set deposit max for non-deposit types at 100%', async () => {
      useTransactionPayTokenMock.mockReturnValue({
        payToken: buildPaymentTokenMock({
          address: TOKEN_ADDRESS_MOCK,
          balanceUsd: '2.246912',
          balanceRaw: '1123456',
          decimals: 6,
          chainId: '0x1',
        }),
      } as ReturnType<typeof useTransactionPayToken>);

      const { result } = runHook(); // default = simpleSend

      await act(async () => {
        result.current.updatePendingAmountPercentage(100);
      });

      await act(async () => {
        result.current.updateTokenAmount();
      });

      // Non-deposit type → fiat-derived amount
      // 100% of 2.246912 = 2.246912, ÷ 2 = 1.123456
      expect(updateTransactionPayAmountMock).toHaveBeenCalledWith('1.123456');
    });

    it('resets deposit max when payToken changes', async () => {
      useTransactionPayTokenMock.mockReturnValue({
        payToken: buildPaymentTokenMock({
          address: TOKEN_ADDRESS_MOCK,
          balanceUsd: '2.246912',
          balanceRaw: '1123456',
          decimals: 6,
          chainId: '0x1',
        }),
      } as ReturnType<typeof useTransactionPayToken>);

      const { result, rerender } = runHook({
        transactionMeta: depositTransactionMeta,
      });

      await act(async () => {
        result.current.updatePendingAmountPercentage(100);
      });

      // Switch to a different token
      useTransactionPayTokenMock.mockReturnValue({
        payToken: buildPaymentTokenMock({
          address: '0xdifferent0000000000000000000000000000000',
          balanceUsd: '2.246912',
          balanceRaw: '1123456',
          decimals: 6,
          chainId: '0x1',
        }),
      } as ReturnType<typeof useTransactionPayToken>);

      await act(async () => {
        rerender({});
      });

      await act(async () => {
        result.current.updateTokenAmount();
      });

      // payToken change resets Max state → amountFiat stays 2.246912, committed at par.
      expect(updateTransactionPayAmountMock).toHaveBeenCalledWith('2.246912');
    });
  });

  describe('money account deposit atomic toggle', () => {
    const depositTransactionMeta = {
      type: TransactionType.moneyAccountDeposit,
      batchId: '0xtestbatchid' as Hex,
      chainId: '0x1' as Hex,
      id: transactionIdMock,
      txParams: {
        from: '0x1234567890123456789012345678901234567890',
        to: '0x8888888888888888888888888888888888888888',
      },
    };

    const fixedSpreadOverrides = {
      confirmations_relay_fixed_spread: {
        chains: { eth: '0x1' },
        tokens: {
          sourceToken: '0x1234567890123456789012345678901234567890',
          targetToken: '0x8888888888888888888888888888888888888888',
        },
        routes: [['eth', 'sourceToken', 'eth', 'targetToken']],
      },
    };

    it('sets atomic to false when Max is pressed and route is NOT fixed-spread', async () => {
      // Empty overrides -> no fixed spread route matches
      const { result } = runHook({
        transactionMeta: depositTransactionMeta,
      });

      await act(async () => {
        result.current.updatePendingAmountPercentage(100);
      });

      const config: Record<string, unknown> = {};
      const atomicCall = setTransactionConfigMock.mock.calls.find((call) => {
        call[1](config);
        return Object.hasOwn(config, 'atomic');
      });
      expect(atomicCall).toBeDefined();
      expect(config.atomic).toBe(false);
    });

    it.each([
      { default: true },
      { transactionTypes: { [TransactionType.moneyAccountDeposit]: true } },
    ])(
      'uses an atomic hint for a fixed-spread route when atomic max is enabled by %j',
      async (atomicMaxEnabled) => {
        const { result } = runHook({
          transactionMeta: depositTransactionMeta,
          stateOverrides: {
            engine: {
              backgroundState: {
                RemoteFeatureFlagController: {
                  remoteFeatureFlags: {
                    ...fixedSpreadOverrides,
                    confirmations_pay_extended: {
                      payStrategies: { relay: { atomicMaxEnabled } },
                    },
                  },
                },
              },
            },
          },
        });

        await act(async () => {
          result.current.updatePendingAmountPercentage(100);
        });

        const atomicCall = setTransactionConfigMock.mock.calls.find((call) => {
          const cfg: Record<string, unknown> = {};
          call[1](cfg);
          return Object.hasOwn(cfg, 'atomic');
        });
        expect(atomicCall).toBeDefined();
        const cfg: Record<string, unknown> = {};
        atomicCall?.[1](cfg);
        expect(cfg.atomic).toBeUndefined();
      },
    );

    it.each([
      undefined,
      { default: false },
      {
        default: true,
        transactionTypes: { [TransactionType.moneyAccountDeposit]: false },
      },
    ])(
      'keeps fixed-spread Max non-atomic when atomic max is disabled by %j',
      async (atomicMaxEnabled) => {
        const { result } = runHook({
          transactionMeta: depositTransactionMeta,
          stateOverrides: {
            engine: {
              backgroundState: {
                RemoteFeatureFlagController: {
                  remoteFeatureFlags: {
                    ...fixedSpreadOverrides,
                    confirmations_pay_extended: {
                      payStrategies: { relay: { atomicMaxEnabled } },
                    },
                  },
                },
              },
            },
          },
        });

        await act(async () => {
          result.current.updatePendingAmountPercentage(100);
        });

        const config: Record<string, unknown> = {};
        setTransactionConfigMock.mock.calls.forEach((call) => call[1](config));
        expect(config.atomic).toBe(false);
      },
    );

    it('updates the active Max hint when the atomic max gate changes', async () => {
      useTransactionPayIsMaxAmountMock.mockReturnValue(true);
      const { store } = runHook({
        transactionMeta: depositTransactionMeta,
        stateOverrides: {
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: {
                remoteFeatureFlags: fixedSpreadOverrides,
              },
            },
          },
        },
      });
      const config: Record<string, unknown> = {};
      setTransactionConfigMock.mock.calls.forEach((call) => call[1](config));
      expect(config.atomic).toBe(false);

      for (const enabled of [true, false]) {
        setTransactionConfigMock.mockClear();
        const nextState = merge({}, store.getState(), {
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: {
                remoteFeatureFlags: {
                  confirmations_pay_extended: {
                    payStrategies: {
                      relay: { atomicMaxEnabled: { default: enabled } },
                    },
                  },
                },
              },
            },
          },
        });

        await act(async () => {
          store.replaceReducer(() => nextState);
        });

        expect(setTransactionConfigMock).toHaveBeenCalled();
        setTransactionConfigMock.mock.calls.forEach((call) => call[1](config));
        expect(config.atomic).toBe(enabled ? undefined : false);
      }
    });

    it('refreshes the active Max hint when switching between matching and non-matching routes', async () => {
      useTransactionPayIsMaxAmountMock.mockReturnValue(true);
      const initialPayToken =
        useTransactionPayTokenMock.getMockImplementation()?.();
      const { rerender } = runHook({
        transactionMeta: depositTransactionMeta,
        stateOverrides: {
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: {
                remoteFeatureFlags: {
                  ...fixedSpreadOverrides,
                  confirmations_pay_extended: {
                    payStrategies: {
                      relay: { atomicMaxEnabled: { default: true } },
                    },
                  },
                },
              },
            },
          },
        },
      });
      const config: Record<string, unknown> = {};
      setTransactionConfigMock.mock.calls.forEach((call) => call[1](config));
      expect(config.atomic).toBeUndefined();

      for (const matches of [false, true]) {
        setTransactionConfigMock.mockClear();
        useTransactionPayTokenMock.mockReturnValue({
          ...initialPayToken,
          payToken: {
            ...initialPayToken?.payToken,
            assetId: evmAssetId(
              matches
                ? TOKEN_ADDRESS_MOCK
                : '0x9999999999999999999999999999999999999999',
              '0x1',
            ),
          },
        } as ReturnType<typeof useTransactionPayToken>);

        await act(async () => {
          rerender({});
        });

        expect(setTransactionConfigMock).toHaveBeenCalled();
        setTransactionConfigMock.mock.calls.forEach((call) => call[1](config));
        expect(config.atomic).toBe(matches ? undefined : false);
      }
    });

    it('does not treat a fixed-spread source with a different destination as an atomic route', async () => {
      const { result } = runHook({
        transactionMeta: {
          ...depositTransactionMeta,
          chainId: '0x2',
        },
        stateOverrides: {
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: {
                remoteFeatureFlags: fixedSpreadOverrides,
              },
            },
          },
        },
      });

      await act(async () => {
        result.current.updatePendingAmountPercentage(100);
      });

      const config: Record<string, unknown> = {};
      setTransactionConfigMock.mock.calls.forEach((call) => call[1](config));
      expect(config.atomic).toBe(false);
    });

    it('clears atomic when Max is unset via non-100% selection', async () => {
      useTransactionPayIsMaxAmountMock.mockReturnValue(true);
      const { result } = runHook({
        transactionMeta: depositTransactionMeta,
      });

      await act(async () => {
        result.current.updatePendingAmountPercentage(50);
      });

      let isUndefined = false;
      const atomicCall = setTransactionConfigMock.mock.calls.find((call) => {
        const cfg: Record<string, unknown> = { atomic: false };
        call[1](cfg);
        if (cfg.atomic === undefined) {
          isUndefined = true;
          return true;
        }
        return false;
      });
      expect(atomicCall).toBeDefined();
      expect(isUndefined).toBe(true);
    });

    it('clears atomic when Max is unset via manual amount input', async () => {
      useTransactionPayIsMaxAmountMock.mockReturnValue(true);
      const { result } = runHook({
        transactionMeta: depositTransactionMeta,
      });

      await act(async () => {
        result.current.updatePendingAmount('5');
      });

      let isUndefined = false;
      const atomicCall = setTransactionConfigMock.mock.calls.find((call) => {
        const cfg: Record<string, unknown> = { atomic: false };
        call[1](cfg);
        if (cfg.atomic === undefined) {
          isUndefined = true;
          return true;
        }
        return false;
      });
      expect(atomicCall).toBeDefined();
      expect(isUndefined).toBe(true);
    });

    it('does not flip atomic when Max is pressed on non-deposit types', async () => {
      const { result } = runHook();

      await act(async () => {
        result.current.updatePendingAmountPercentage(100);
      });

      const atomicCall = setTransactionConfigMock.mock.calls.find((call) => {
        const cfg: Record<string, unknown> = {};
        call[1](cfg);
        return Object.hasOwn(cfg, 'atomic');
      });
      expect(atomicCall).toBeUndefined();
    });
  });

  it('resets isMax to false when updating amount while isMaxAmount is true', async () => {
    useTransactionPayIsMaxAmountMock.mockReturnValue(true);

    const { result } = runHook();

    await act(async () => {
      result.current.updatePendingAmount('100');
    });

    const config = { isMaxAmount: true };
    setTransactionConfigMock.mock.calls[0][1](config);
    expect(config.isMaxAmount).toBe(false);
  });

  describe('money account payment override', () => {
    const moneyAccountStateOverrides = {
      engine: {
        backgroundState: {
          TransactionPayController: {
            transactionData: {
              [transactionIdMock]: {
                paymentOverride: PaymentOverride.MoneyAccount,
              },
            },
          },
        },
      },
    };

    it('uses cached money-account redeemable raw as balance when payment override is MoneyAccount', async () => {
      useMoneyAccountBalanceMock.mockReturnValue({
        withdrawableFiatRaw: '750.50',
      } as ReturnType<typeof useMoneyAccountBalance>);

      const { result } = runHook({
        transactionMeta: {
          type: TransactionType.simpleSend,
          id: transactionIdMock,
          chainId: '0x1' as Hex,
          txParams: { from: '0xabc' },
        } as unknown as Partial<TransactionMeta>,
        stateOverrides: merge(
          {},
          moneyAccountStateOverrides,
          getMoneyAccountState('750500000'),
        ),
      });

      await act(async () => {
        result.current.updatePendingAmountPercentage(100);
      });

      expect(result.current.amountFiat).toBe('750.50');
    });

    it('returns 0 when payment override is MoneyAccount but cached redeemable raw is undefined', async () => {
      useMoneyAccountBalanceMock.mockReturnValue({
        withdrawableFiatRaw: undefined,
      } as ReturnType<typeof useMoneyAccountBalance>);
    });

    const addMusdTransactionMeta = {
      type: TransactionType.moneyAccountDeposit,
      id: transactionIdMock,
      batchId: '0xtestbatchid' as Hex,
      chainId: '0x1' as Hex,
      txParams: { from: '0xabc' },
    } as unknown as Partial<TransactionMeta>;

    it('does not auto-fill when intent is not addMusd', async () => {
      jest.mocked(getMoneyAccountDepositIntent).mockReturnValue('convert');

      const { result } = runHook({
        transactionMeta: {
          type: TransactionType.simpleSend,
          id: transactionIdMock,
          chainId: '0x1' as Hex,
          txParams: { from: '0xabc' },
        } as unknown as Partial<TransactionMeta>,
        stateOverrides: moneyAccountStateOverrides,
      });

      await act(async () => {
        result.current.updatePendingAmountPercentage(100);
      });

      expect(result.current.amountFiat).toBe('0');
    });
  });

  describe('money account deposit prefill', () => {
    const depositTransactionMeta = {
      type: TransactionType.moneyAccountDeposit,
      batchId: '0xtestbatchid' as Hex,
    };

    beforeEach(() => {
      (selectMetaMaskPayFlags as unknown as jest.Mock).mockReturnValue({
        prefilledAmount: {
          default: { enabled: false },
          overrides: {
            moneyAccountDeposit: { enabled: true },
          },
        },
      });
      (selectDepositLimits as unknown as jest.Mock).mockReturnValue({
        moneyAccountDeposit: 100000,
      });
    });

    it('returns skipped deposit prefill status for a zero-balance pay token', () => {
      useTransactionPayTokenMock.mockReturnValue({
        payToken: buildPaymentTokenMock({
          address: TOKEN_ADDRESS_MOCK,
          balanceUsd: '0',
          chainId: '0x1',
        }),
      } as ReturnType<typeof useTransactionPayToken>);

      const { result } = runHook({
        transactionMeta: depositTransactionMeta,
      });

      expect(result.current.depositPrefillStatus).toBe(
        DepositPrefillStatus.Skipped,
      );
    });

    const fallbackStablecoins = Object.entries(
      selectStablecoins(mockedEmptyFlagsState),
    ).flatMap(([chainId, addresses]) =>
      addresses.map((address) => ({ chainId, address })),
    );

    it.each(fallbackStablecoins)(
      'prefills stablecoin $address on $chainId to max',
      async ({ address, chainId }) => {
        useTransactionPayTokenMock.mockReturnValue({
          payToken: buildPaymentTokenMock({
            address,
            balanceUsd: '500',
            balanceRaw: '500000000',
            decimals: 6,
            chainId,
          }),
        } as ReturnType<typeof useTransactionPayToken>);

        const { result } = runHook({
          transactionMeta: depositTransactionMeta,
        });

        await act(async () => {
          jest.runAllTimers();
        });

        expect(result.current.amountFiat).toBe('500');

        // 100% prefill must set isMaxAmount like pressing Max, so the
        // insufficient-funds alert can skip a Max money account deposit.
        const isMaxCall = setTransactionConfigMock.mock.calls.find((call) => {
          const cfg: Record<string, unknown> = {};
          call[1](cfg);
          return cfg.isMaxAmount === true;
        });
        expect(isMaxCall).toBeDefined();

        expect(setConfirmationMetricMock).toHaveBeenCalledWith({
          properties: {
            mm_pay_amount_input_type: 'prefilled_max',
            mm_pay_amount_input_prefill_presented: true,
          },
        });
      },
    );

    it('prefills a stableTokens-flag token that is not in the fallback list to max', async () => {
      useTransactionPayTokenMock.mockReturnValue({
        payToken: buildPaymentTokenMock({
          address: ETHEREUM_DAI_ADDRESS,
          balanceUsd: '500',
          balanceRaw: '500000000',
          decimals: 18,
          chainId: '0x1',
        }),
      } as ReturnType<typeof useTransactionPayToken>);

      const { result } = runHook({
        transactionMeta: depositTransactionMeta,
        stateOverrides: {
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: {
                remoteFeatureFlags: {
                  stableTokens: {
                    rc: true,
                    '0x1': [ETHEREUM_USDT_ADDRESS, ETHEREUM_DAI_ADDRESS],
                  },
                },
                cacheTimestamp: 0,
              },
            },
          },
        },
      });

      await act(async () => {
        jest.runAllTimers();
      });

      expect(result.current.amountFiat).toBe('500');

      const isMaxCall = setTransactionConfigMock.mock.calls.find((call) => {
        const cfg: Record<string, unknown> = {};
        call[1](cfg);
        return cfg.isMaxAmount === true;
      });
      expect(isMaxCall).toBeDefined();
    });

    it('prefills non-stablecoin with 50% of balance via percentage path', async () => {
      useTransactionPayTokenMock.mockReturnValue({
        payToken: buildPaymentTokenMock({
          address: TOKEN_ADDRESS_MOCK,
          balanceUsd: '1000',
          chainId: '0x1',
        }),
      } as ReturnType<typeof useTransactionPayToken>);

      const { result } = runHook({
        transactionMeta: depositTransactionMeta,
      });

      await act(async () => {
        jest.runAllTimers();
      });

      expect(result.current.amountFiat).toBe('500');
      expect(setConfirmationMetricMock).toHaveBeenCalledWith({
        properties: {
          mm_pay_amount_input_type: 'prefilled_50',
          mm_pay_amount_input_prefill_presented: true,
        },
      });

      const isMaxCall = setTransactionConfigMock.mock.calls.find((call) => {
        const cfg: Record<string, unknown> = {};
        call[1](cfg);
        return cfg.isMaxAmount === true;
      });
      expect(isMaxCall).toBeUndefined();
    });

    it('caps at deposit limit when balance exceeds it without Max flags', async () => {
      useTransactionPayTokenMock.mockReturnValue({
        payToken: buildPaymentTokenMock({
          address: ETHEREUM_USDT_ADDRESS,
          balanceUsd: '200000',
          chainId: '0x1',
        }),
      } as ReturnType<typeof useTransactionPayToken>);

      const { result } = runHook({
        transactionMeta: depositTransactionMeta,
      });

      await act(async () => {
        jest.runAllTimers();
      });

      expect(result.current.amountFiat).toBe('100000');

      const isMaxCall = setTransactionConfigMock.mock.calls.find((call) => {
        const cfg: Record<string, unknown> = {};
        call[1](cfg);
        return cfg.isMaxAmount === true;
      });
      expect(isMaxCall).toBeUndefined();

      expect(setConfirmationMetricMock).toHaveBeenCalledWith({
        properties: {
          mm_pay_amount_input_type: 'prefilled',
          mm_pay_amount_input_prefill_presented: true,
        },
      });
    });

    it('does not prefill when flag is disabled', async () => {
      (selectMetaMaskPayFlags as unknown as jest.Mock).mockReturnValue({
        prefilledAmount: {
          default: { enabled: false },
          overrides: {},
        },
      });

      const { result } = runHook({
        transactionMeta: depositTransactionMeta,
      });

      await act(async () => {
        jest.runAllTimers();
      });

      expect(result.current.amountFiat).toBe('0');
    });

    it('resets amountFiat to zero when switching to zero-balance token', async () => {
      useTransactionPayTokenMock.mockReturnValue({
        payToken: buildPaymentTokenMock({
          address: ETHEREUM_USDT_ADDRESS,
          balanceUsd: '500',
          chainId: '0x1',
        }),
      } as ReturnType<typeof useTransactionPayToken>);

      const { result, rerender } = runHook({
        transactionMeta: depositTransactionMeta,
      });

      await act(async () => {
        jest.runAllTimers();
      });

      expect(result.current.amountFiat).toBe('500');

      useTransactionPayTokenMock.mockReturnValue({
        payToken: buildPaymentTokenMock({
          address: '0xdifferent',
          balanceUsd: '0',
          chainId: '0x1',
        }),
      } as ReturnType<typeof useTransactionPayToken>);

      await act(async () => {
        rerender({});
        jest.runAllTimers();
      });

      expect(result.current.amountFiat).toBe('0');
    });

    it('resets amountFiat to zero when switching to a sub-cent balance token', async () => {
      useTransactionPayTokenMock.mockReturnValue({
        payToken: buildPaymentTokenMock({
          address: ETHEREUM_USDT_ADDRESS,
          balanceUsd: '500',
          chainId: '0x1',
        }),
      } as ReturnType<typeof useTransactionPayToken>);

      const { result, rerender } = runHook({
        transactionMeta: depositTransactionMeta,
      });

      await act(async () => {
        jest.runAllTimers();
      });

      expect(result.current.amountFiat).toBe('500');

      // Dust renders as $0.00 and cannot fund a quote, so the previous
      // token's amount must not survive the switch and get quoted against it.
      useTransactionPayTokenMock.mockReturnValue({
        payToken: buildPaymentTokenMock({
          address: '0xdifferent',
          balanceUsd: '0.005',
          chainId: '0x1',
        }),
      } as ReturnType<typeof useTransactionPayToken>);

      await act(async () => {
        rerender({});
        jest.runAllTimers();
      });

      expect(result.current.amountFiat).toBe('0');
      expect(result.current.depositPrefillStatus).toBe(
        DepositPrefillStatus.Skipped,
      );
    });

    it('updates prefill amount when switching to a different funded token', async () => {
      useTransactionPayTokenMock.mockReturnValue({
        payToken: buildPaymentTokenMock({
          address: ETHEREUM_USDT_ADDRESS,
          balanceUsd: '500',
          chainId: '0x1',
        }),
      } as ReturnType<typeof useTransactionPayToken>);

      const { result, rerender } = runHook({
        transactionMeta: depositTransactionMeta,
      });

      await act(async () => {
        jest.runAllTimers();
      });

      expect(result.current.amountFiat).toBe('500');

      useTransactionPayTokenMock.mockReturnValue({
        payToken: buildPaymentTokenMock({
          address: ETHEREUM_USDC_ADDRESS,
          balanceUsd: '800',
          chainId: '0x1',
        }),
      } as ReturnType<typeof useTransactionPayToken>);

      await act(async () => {
        rerender({});
        jest.runAllTimers();
      });

      expect(result.current.amountFiat).toBe('800');
      expect(result.current.depositPrefillStatus).toBe(
        DepositPrefillStatus.Prefilled,
      );
    });

    it('only prefills once even if balance changes', async () => {
      useTransactionPayTokenMock.mockReturnValue({
        payToken: buildPaymentTokenMock({
          address: ETHEREUM_USDT_ADDRESS,
          balanceUsd: '500',
          chainId: '0x1',
        }),
      } as ReturnType<typeof useTransactionPayToken>);

      const { result, rerender } = runHook({
        transactionMeta: depositTransactionMeta,
      });

      await act(async () => {
        jest.runAllTimers();
      });

      expect(result.current.amountFiat).toBe('500');

      useTransactionPayTokenMock.mockReturnValue({
        payToken: buildPaymentTokenMock({
          address: ETHEREUM_USDT_ADDRESS,
          balanceUsd: '9999',
          chainId: '0x1',
        }),
      } as ReturnType<typeof useTransactionPayToken>);

      await act(async () => {
        rerender({});
        jest.runAllTimers();
      });

      expect(result.current.amountFiat).toBe('500');
    });

    it('preserves user-edited amount when hasPrefilled re-toggles', async () => {
      useTransactionPayTokenMock.mockReturnValue({
        payToken: buildPaymentTokenMock({
          address: ETHEREUM_USDT_ADDRESS,
          balanceUsd: '500',
          chainId: '0x1',
        }),
      } as ReturnType<typeof useTransactionPayToken>);

      const { result, rerender } = runHook({
        transactionMeta: depositTransactionMeta,
      });

      await act(async () => {
        jest.runAllTimers();
      });

      expect(result.current.amountFiat).toBe('500');

      await act(async () => {
        result.current.updatePendingAmount('42');
      });

      expect(result.current.amountFiat).toBe('42');

      // Simulate hasPrefilled toggling by switching to a zero-balance
      // token on the same address (accountOverride change), then back.
      // This mimics the transient tokenKey change that causes the bug.
      useTransactionPayTokenMock.mockReturnValue({
        payToken: buildPaymentTokenMock({
          address: ETHEREUM_USDT_ADDRESS,
          balanceUsd: '0',
          chainId: '0x1',
        }),
      } as ReturnType<typeof useTransactionPayToken>);

      await act(async () => {
        rerender({});
        jest.runAllTimers();
      });

      useTransactionPayTokenMock.mockReturnValue({
        payToken: buildPaymentTokenMock({
          address: ETHEREUM_USDT_ADDRESS,
          balanceUsd: '500',
          chainId: '0x1',
        }),
      } as ReturnType<typeof useTransactionPayToken>);

      await act(async () => {
        rerender({});
        jest.runAllTimers();
      });

      expect(result.current.amountFiat).toBe('42');
    });

    it('allows prefill after pay token address changes even if user previously edited', async () => {
      useTransactionPayTokenMock.mockReturnValue({
        payToken: buildPaymentTokenMock({
          address: ETHEREUM_USDT_ADDRESS,
          balanceUsd: '500',
          chainId: '0x1',
        }),
      } as ReturnType<typeof useTransactionPayToken>);

      const { result, rerender } = runHook({
        transactionMeta: depositTransactionMeta,
      });

      await act(async () => {
        jest.runAllTimers();
      });

      expect(result.current.amountFiat).toBe('500');

      await act(async () => {
        result.current.updatePendingAmount('42');
      });

      expect(result.current.amountFiat).toBe('42');

      // Switch to a genuinely different token — userHasEditedRef resets
      useTransactionPayTokenMock.mockReturnValue({
        payToken: buildPaymentTokenMock({
          address: ETHEREUM_USDC_ADDRESS,
          balanceUsd: '800',
          chainId: '0x1',
        }),
      } as ReturnType<typeof useTransactionPayToken>);

      await act(async () => {
        rerender({});
        jest.runAllTimers();
      });

      expect(result.current.amountFiat).toBe('800');
    });
  });

  describe('perps provider switch replaces the transaction', () => {
    const perpsDepositTransactionMeta = {
      type: TransactionType.perpsDeposit,
    };

    beforeEach(() => {
      (selectMetaMaskPayFlags as unknown as jest.Mock).mockReturnValue({
        prefilledAmount: {
          default: { enabled: false },
          overrides: {
            perpsDeposit: { enabled: true },
          },
        },
      });
    });

    function mockPayToken(address: Hex | undefined, balanceUsd = '500') {
      useTransactionPayTokenMock.mockReturnValue({
        payToken: address
          ? buildPaymentTokenMock({
              address,
              balanceUsd,
              chainId: '0x1',
            })
          : undefined,
      } as ReturnType<typeof useTransactionPayToken>);
    }

    // The replacement is a new confirmation with its own id, and its pay token
    // is unset until automatic selection runs again.
    async function replaceTransaction(
      rerender: ReturnType<typeof runHook>['rerender'],
    ) {
      const actualHook = jest.requireActual(
        './useTransactionMetadataRequest',
      ).useTransactionMetadataRequest;
      let replacement: TransactionMeta | undefined;

      jest.mocked(useTransactionMetadataRequest).mockImplementation(() => {
        const current = actualHook();
        replacement ??= { ...current, id: 'replacement-transaction' };
        return replacement;
      });
      mockPayToken(undefined);

      await act(async () => {
        rerender({});
        jest.runAllTimers();
      });

      mockPayToken(ETHEREUM_USDT_ADDRESS);

      await act(async () => {
        rerender({});
        jest.runAllTimers();
      });
    }

    it('keeps the amount the user entered', async () => {
      mockPayToken(ETHEREUM_USDT_ADDRESS);

      const { result, rerender } = runHook({
        transactionMeta: perpsDepositTransactionMeta,
      });

      await act(async () => {
        jest.runAllTimers();
      });

      await act(async () => {
        result.current.updatePendingAmount('42');
      });

      expect(result.current.amountFiat).toBe('42');

      await replaceTransaction(rerender);

      expect(result.current.amountFiat).toBe('42');
    });

    it('keeps the prefilled amount', async () => {
      mockPayToken(ETHEREUM_USDT_ADDRESS);

      const { result, rerender } = runHook({
        transactionMeta: perpsDepositTransactionMeta,
      });

      await act(async () => {
        jest.runAllTimers();
      });

      const prefilledAmount = result.current.amountFiat;
      expect(prefilledAmount).not.toBe('0');

      await replaceTransaction(rerender);

      expect(result.current.amountFiat).toBe(prefilledAmount);
    });

    it('clears keepAmountAfterReplacementRef after automatic token change, then user token change applies prefill', async () => {
      mockPayToken(ETHEREUM_USDT_ADDRESS, '1000');

      const { result, rerender } = runHook({
        transactionMeta: perpsDepositTransactionMeta,
      });

      await act(async () => {
        jest.runAllTimers();
      });

      await act(async () => {
        result.current.updatePendingAmount('42');
      });

      expect(result.current.amountFiat).toBe('42');

      await replaceTransaction(rerender);

      expect(result.current.amountFiat).toBe('42');

      // First token change after replacement is automatic (provider switch),
      // so the amount is preserved
      mockPayToken(ETHEREUM_USDC_ADDRESS, '800');

      await act(async () => {
        rerender({});
        jest.runAllTimers();
      });

      expect(result.current.amountFiat).toBe('42');

      // Second token change is user-initiated, so keepAmountAfterReplacementRef
      // is cleared and prefill applies. Perps deposits prefill to 50%.
      mockPayToken(ETHEREUM_DAI_ADDRESS, '1200');

      await act(async () => {
        rerender({});
        jest.runAllTimers();
      });

      expect(result.current.amountFiat).toBe('600');
    });

    it('clamps a 100% Hyperliquid Max to 90% when switching into a first Lighter deposit', async () => {
      // Start with Hyperliquid deposit at 100%
      mockPayToken(ETHEREUM_USDT_ADDRESS, '1000');

      const perpsDepositMeta = {
        type: TransactionType.perpsDeposit,
        id: transactionIdMock,
        chainId: '0x1' as Hex,
        txParams: { from: '0xabc' as Hex },
      } as unknown as Partial<TransactionMeta>;

      const { result, rerender } = runHook({
        transactionMeta: perpsDepositMeta,
      });

      await act(async () => {
        result.current.updatePendingAmountPercentage(100);
      });

      expect(result.current.amountFiat).toBe('1000');

      // Replace with a first Lighter deposit (approve + deposit calls)
      const actualHook = jest.requireActual(
        './useTransactionMetadataRequest',
      ).useTransactionMetadataRequest;

      jest.mocked(useTransactionMetadataRequest).mockImplementation(() => {
        const current = actualHook();
        return {
          ...current,
          id: 'replacement-lighter-deposit',
          type: TransactionType.perpsLighterDeposit,
          nestedTransactions: [
            { data: '0x095ea7b3' }, // approve
            { data: '0x8a857083' }, // deposit
          ],
        } as TransactionMeta;
      });
      mockPayToken(undefined);

      await act(async () => {
        rerender({});
        jest.runAllTimers();
      });

      mockPayToken(ETHEREUM_USDT_ADDRESS, '1000');

      await act(async () => {
        rerender({});
        jest.runAllTimers();
      });

      // 100% should be clamped to 90% = 900
      expect(result.current.amountFiat).toBe('900');
      // The clamped amount should also be committed to the transaction
      // 900 USD / 2 (fiat rate) = 450 tokens
      expect(updateTransactionPayAmountMock).toHaveBeenCalledWith('450');
    });

    it('keeps a normal kept amount below the first-deposit cap unchanged', async () => {
      mockPayToken(ETHEREUM_USDT_ADDRESS, '1000');

      const perpsDepositMeta = {
        type: TransactionType.perpsDeposit,
        id: transactionIdMock,
        chainId: '0x1' as Hex,
        txParams: { from: '0xabc' as Hex },
      } as unknown as Partial<TransactionMeta>;

      const { result, rerender } = runHook({
        transactionMeta: perpsDepositMeta,
      });

      await act(async () => {
        result.current.updatePendingAmount('500');
      });

      expect(result.current.amountFiat).toBe('500');

      // Replace with a first Lighter deposit
      const actualHook = jest.requireActual(
        './useTransactionMetadataRequest',
      ).useTransactionMetadataRequest;

      jest.mocked(useTransactionMetadataRequest).mockImplementation(() => {
        const current = actualHook();
        return {
          ...current,
          id: 'replacement-lighter-deposit',
          type: TransactionType.perpsLighterDeposit,
          nestedTransactions: [{ data: '0x095ea7b3' }, { data: '0x8a857083' }],
        } as TransactionMeta;
      });
      mockPayToken(undefined);

      await act(async () => {
        rerender({});
        jest.runAllTimers();
      });

      mockPayToken(ETHEREUM_USDT_ADDRESS, '1000');

      await act(async () => {
        rerender({});
        jest.runAllTimers();
      });

      // 500 is below the 90% cap (900), so it should remain unchanged
      expect(result.current.amountFiat).toBe('500');
    });

    it('clamps successive replacements into first Lighter deposits', async () => {
      // Start with Hyperliquid deposit at 100%
      mockPayToken(ETHEREUM_USDT_ADDRESS, '1000');

      const perpsDepositMeta = {
        type: TransactionType.perpsDeposit,
        id: transactionIdMock,
        chainId: '0x1' as Hex,
        txParams: { from: '0xabc' as Hex },
      } as unknown as Partial<TransactionMeta>;

      const { result, rerender } = runHook({
        transactionMeta: perpsDepositMeta,
      });

      await act(async () => {
        result.current.updatePendingAmountPercentage(100);
      });

      expect(result.current.amountFiat).toBe('1000');

      // First replacement with Lighter deposit
      const actualHook = jest.requireActual(
        './useTransactionMetadataRequest',
      ).useTransactionMetadataRequest;

      jest.mocked(useTransactionMetadataRequest).mockImplementation(() => {
        const current = actualHook();
        return {
          ...current,
          id: 'first-lighter-deposit',
          type: TransactionType.perpsLighterDeposit,
          nestedTransactions: [{ data: '0x095ea7b3' }, { data: '0x8a857083' }],
        } as TransactionMeta;
      });
      mockPayToken(undefined);

      await act(async () => {
        rerender({});
        jest.runAllTimers();
      });

      mockPayToken(ETHEREUM_USDT_ADDRESS, '1000');

      await act(async () => {
        rerender({});
        jest.runAllTimers();
      });

      // First clamp: 100% -> 90% = 900
      expect(result.current.amountFiat).toBe('900');

      // Switch back to Hyperliquid with the clamped 900, then set to 100% again
      jest.mocked(useTransactionMetadataRequest).mockImplementation(() => {
        const current = actualHook();
        return {
          ...current,
          id: 'back-to-hyperliquid',
          type: TransactionType.perpsDeposit,
        } as TransactionMeta;
      });
      mockPayToken(undefined);

      await act(async () => {
        rerender({});
        jest.runAllTimers();
      });

      // Increase balance and set to 100% again
      mockPayToken(ETHEREUM_USDT_ADDRESS, '1200');

      await act(async () => {
        rerender({});
        jest.runAllTimers();
      });

      await act(async () => {
        result.current.updatePendingAmountPercentage(100);
      });

      expect(result.current.amountFiat).toBe('1200');

      // Second replacement with Lighter deposit
      jest.mocked(useTransactionMetadataRequest).mockImplementation(() => {
        const current = actualHook();
        return {
          ...current,
          id: 'second-lighter-deposit',
          type: TransactionType.perpsLighterDeposit,
          nestedTransactions: [{ data: '0x095ea7b3' }, { data: '0x8a857083' }],
        } as TransactionMeta;
      });
      mockPayToken(undefined);

      await act(async () => {
        rerender({});
        jest.runAllTimers();
      });

      mockPayToken(ETHEREUM_USDT_ADDRESS, '1200');

      await act(async () => {
        rerender({});
        jest.runAllTimers();
      });

      // Second clamp: 100% of 1200 -> 90% = 1080
      expect(result.current.amountFiat).toBe('1080');
    });

    it('waits for tokenFiatRate before committing clamped amount', async () => {
      // Start with Hyperliquid deposit at 100%
      mockPayToken(ETHEREUM_USDT_ADDRESS, '1000');

      const perpsDepositMeta = {
        type: TransactionType.perpsDeposit,
        id: transactionIdMock,
        chainId: '0x1' as Hex,
        txParams: { from: '0xabc' as Hex },
      } as unknown as Partial<TransactionMeta>;

      const { result, rerender } = runHook({
        transactionMeta: perpsDepositMeta,
      });

      await act(async () => {
        result.current.updatePendingAmountPercentage(100);
      });

      expect(result.current.amountFiat).toBe('1000');

      // Replace with a first Lighter deposit
      const actualHook = jest.requireActual(
        './useTransactionMetadataRequest',
      ).useTransactionMetadataRequest;

      jest.mocked(useTransactionMetadataRequest).mockImplementation(() => {
        const current = actualHook();
        return {
          ...current,
          id: 'replacement-lighter-deposit',
          type: TransactionType.perpsLighterDeposit,
          nestedTransactions: [{ data: '0x095ea7b3' }, { data: '0x8a857083' }],
        } as TransactionMeta;
      });
      mockPayToken(undefined);

      await act(async () => {
        rerender({});
        jest.runAllTimers();
      });

      // Pay token is set but tokenFiatRate is missing
      useTokenFiatRateMock.mockReturnValue(undefined);
      mockPayToken(ETHEREUM_USDT_ADDRESS, '1000');

      await act(async () => {
        rerender({});
        jest.runAllTimers();
      });

      // Without tokenFiatRate, the clamp should not run yet
      expect(result.current.amountFiat).toBe('1000');
      // And updateTransactionPayAmount should NOT have been called (no rate)
      expect(updateTransactionPayAmountMock).not.toHaveBeenCalled();

      // Now the tokenFiatRate loads
      useTokenFiatRateMock.mockReturnValue(2);

      await act(async () => {
        rerender({});
        jest.runAllTimers();
      });

      // Now the clamp should run: 100% -> 90% = 900
      expect(result.current.amountFiat).toBe('900');
      // And updateTransactionPayAmount should be called with the clamped amount
      // 900 USD / 2 (fiat rate) = 450 tokens
      expect(updateTransactionPayAmountMock).toHaveBeenCalledWith('450');
    });

    it('retries the clamp commit if updateTransactionPayAmount fails', async () => {
      // Start with Hyperliquid deposit at 100%
      mockPayToken(ETHEREUM_USDT_ADDRESS, '1000');

      const perpsDepositMeta = {
        type: TransactionType.perpsDeposit,
        id: transactionIdMock,
        chainId: '0x1' as Hex,
        txParams: { from: '0xabc' as Hex },
      } as unknown as Partial<TransactionMeta>;

      const { result, rerender } = runHook({
        transactionMeta: perpsDepositMeta,
      });

      await act(async () => {
        result.current.updatePendingAmountPercentage(100);
      });

      expect(result.current.amountFiat).toBe('1000');

      // Replace with a first Lighter deposit
      const actualHook = jest.requireActual(
        './useTransactionMetadataRequest',
      ).useTransactionMetadataRequest;

      jest.mocked(useTransactionMetadataRequest).mockImplementation(() => {
        const current = actualHook();
        return {
          ...current,
          id: 'replacement-lighter-deposit',
          type: TransactionType.perpsLighterDeposit,
          nestedTransactions: [
            { data: '0x095ea7b3' }, // approve
            { data: '0x8a857083' }, // deposit
          ],
        } as TransactionMeta;
      });
      mockPayToken(undefined);

      await act(async () => {
        rerender({});
        jest.runAllTimers();
      });

      // Make updateTransactionPayAmount fail on the first attempt, then succeed
      updateTransactionPayAmountMock
        .mockRejectedValueOnce(new Error('Network failure'))
        .mockResolvedValue(true);

      mockPayToken(ETHEREUM_USDT_ADDRESS, '1000');

      await act(async () => {
        rerender({});
        jest.runAllTimers();
        // Wait for the async update to complete and trigger the retry
        await Promise.resolve();
        await Promise.resolve();
      });

      // The UI should show the clamped 90% = 900
      expect(result.current.amountFiat).toBe('900');
      // updateTransactionPayAmount was called, failed, then retried and succeeded
      expect(updateTransactionPayAmountMock).toHaveBeenCalledWith('450');
      expect(updateTransactionPayAmountMock).toHaveBeenCalledTimes(2);
      expect(updateTransactionPayAmountMock).toHaveBeenLastCalledWith('450');
    });

    it('does not clear pendingClampRef while commit is in flight', async () => {
      // Start with Hyperliquid deposit at 100%
      mockPayToken(ETHEREUM_USDT_ADDRESS, '1000');

      const perpsDepositMeta = {
        type: TransactionType.perpsDeposit,
        id: transactionIdMock,
        chainId: '0x1' as Hex,
        txParams: { from: '0xabc' as Hex },
      } as unknown as Partial<TransactionMeta>;

      const { result, rerender } = runHook({
        transactionMeta: perpsDepositMeta,
      });

      await act(async () => {
        result.current.updatePendingAmountPercentage(100);
      });

      expect(result.current.amountFiat).toBe('1000');

      // Replace with a first Lighter deposit
      const actualHook = jest.requireActual(
        './useTransactionMetadataRequest',
      ).useTransactionMetadataRequest;

      jest.mocked(useTransactionMetadataRequest).mockImplementation(() => {
        const current = actualHook();
        return {
          ...current,
          id: 'replacement-lighter-deposit',
          type: TransactionType.perpsLighterDeposit,
          nestedTransactions: [
            { data: '0x095ea7b3' }, // approve
            { data: '0x8a857083' }, // deposit
          ],
        } as TransactionMeta;
      });
      mockPayToken(undefined);

      await act(async () => {
        rerender({});
        jest.runAllTimers();
      });

      // Make updateTransactionPayAmount hang (never resolve)
      let resolveUpdate: (value: boolean) => void;
      const hangingPromise = new Promise<boolean>((resolve) => {
        resolveUpdate = resolve;
      });
      updateTransactionPayAmountMock.mockReturnValue(hangingPromise);

      mockPayToken(ETHEREUM_USDT_ADDRESS, '1000');

      // First render: triggers the clamp and starts the async commit
      await act(async () => {
        rerender({});
        jest.runAllTimers();
      });

      // The UI should show the clamped 90% = 900
      expect(result.current.amountFiat).toBe('900');
      // updateTransactionPayAmount was called
      expect(updateTransactionPayAmountMock).toHaveBeenCalledWith('450');
      expect(updateTransactionPayAmountMock).toHaveBeenCalledTimes(1);

      // Second render: amountFiat === clampedAmount, but commit is still in flight
      // The effect should return early and NOT clear pendingClampRef
      await act(async () => {
        rerender({});
        jest.runAllTimers();
      });

      // Should not have called updateTransactionPayAmount again
      expect(updateTransactionPayAmountMock).toHaveBeenCalledTimes(1);

      // Now resolve the update
      await act(async () => {
        if (resolveUpdate) {
          resolveUpdate(true);
        }
        await Promise.resolve();
      });

      // After success, pendingClampRef should be cleared
      // A subsequent rerender should not trigger another clamp
      await act(async () => {
        rerender({});
        jest.runAllTimers();
      });

      expect(updateTransactionPayAmountMock).toHaveBeenCalledTimes(1);
      expect(result.current.amountFiat).toBe('900');
    });

    it('caps retries at MAX_CLAMP_COMMIT_RETRIES and surfaces failure', async () => {
      jest.useFakeTimers();

      mockPayToken(ETHEREUM_USDT_ADDRESS, '1000');

      const perpsDepositMeta = {
        type: TransactionType.perpsDeposit,
        id: transactionIdMock,
        chainId: '0x1' as Hex,
        txParams: { from: '0xabc' as Hex },
      } as unknown as Partial<TransactionMeta>;

      const { result, rerender } = runHook({
        transactionMeta: perpsDepositMeta,
      });

      await act(async () => {
        result.current.updatePendingAmountPercentage(100);
      });

      // Replace with a first Lighter deposit
      const actualHook = jest.requireActual(
        './useTransactionMetadataRequest',
      ).useTransactionMetadataRequest;

      jest.mocked(useTransactionMetadataRequest).mockImplementation(() => {
        const current = actualHook();
        return {
          ...current,
          id: 'replacement-lighter-deposit',
          type: TransactionType.perpsLighterDeposit,
          nestedTransactions: [{ data: '0x095ea7b3' }, { data: '0x8a857083' }],
        } as TransactionMeta;
      });
      mockPayToken(undefined);

      await act(async () => {
        rerender({});
        jest.runAllTimers();
      });

      // Make updateTransactionPayAmount always fail
      updateTransactionPayAmountMock.mockRejectedValue(
        new Error('Network failure'),
      );

      mockPayToken(ETHEREUM_USDT_ADDRESS, '1000');

      // Initial attempt + 3 retries = 4 total attempts
      await act(async () => {
        rerender({});
        jest.runAllTimers();
        await Promise.resolve();
      });

      expect(result.current.amountFiat).toBe('900');
      expect(updateTransactionPayAmountMock).toHaveBeenCalledTimes(1);

      // Retry 1
      await act(async () => {
        jest.advanceTimersByTime(500);
        rerender({});
        jest.runAllTimers();
        await Promise.resolve();
      });
      expect(updateTransactionPayAmountMock).toHaveBeenCalledTimes(2);

      // Retry 2
      await act(async () => {
        jest.advanceTimersByTime(500);
        rerender({});
        jest.runAllTimers();
        await Promise.resolve();
      });
      expect(updateTransactionPayAmountMock).toHaveBeenCalledTimes(3);

      // Retry 3 (final)
      await act(async () => {
        jest.advanceTimersByTime(500);
        rerender({});
        jest.runAllTimers();
        await Promise.resolve();
      });
      expect(updateTransactionPayAmountMock).toHaveBeenCalledTimes(4);
      expect(result.current.isClampCommitFailed).toBe(true);

      // Further rerenders should not trigger more attempts
      await act(async () => {
        jest.advanceTimersByTime(500);
        rerender({});
        jest.runAllTimers();
      });
      expect(updateTransactionPayAmountMock).toHaveBeenCalledTimes(4);

      jest.useRealTimers();
    });

    it('clears failure state on successful retry', async () => {
      jest.useFakeTimers();

      mockPayToken(ETHEREUM_USDT_ADDRESS, '1000');

      const perpsDepositMeta = {
        type: TransactionType.perpsDeposit,
        id: transactionIdMock,
        chainId: '0x1' as Hex,
        txParams: { from: '0xabc' as Hex },
      } as unknown as Partial<TransactionMeta>;

      const { result, rerender } = runHook({
        transactionMeta: perpsDepositMeta,
      });

      await act(async () => {
        result.current.updatePendingAmountPercentage(100);
      });

      // Replace with a first Lighter deposit
      const actualHook = jest.requireActual(
        './useTransactionMetadataRequest',
      ).useTransactionMetadataRequest;

      jest.mocked(useTransactionMetadataRequest).mockImplementation(() => {
        const current = actualHook();
        return {
          ...current,
          id: 'replacement-lighter-deposit',
          type: TransactionType.perpsLighterDeposit,
          nestedTransactions: [{ data: '0x095ea7b3' }, { data: '0x8a857083' }],
        } as TransactionMeta;
      });
      mockPayToken(undefined);

      await act(async () => {
        rerender({});
        jest.runAllTimers();
      });

      // Fail once, then succeed
      updateTransactionPayAmountMock
        .mockRejectedValueOnce(new Error('Network failure'))
        .mockResolvedValue(true);

      mockPayToken(ETHEREUM_USDT_ADDRESS, '1000');

      await act(async () => {
        rerender({});
        jest.runAllTimers();
        await Promise.resolve();
      });

      expect(updateTransactionPayAmountMock).toHaveBeenCalledTimes(1);
      expect(result.current.isClampCommitPending).toBe(false);

      // Retry succeeds
      await act(async () => {
        jest.advanceTimersByTime(500);
        rerender({});
        jest.runAllTimers();
        await Promise.resolve();
      });

      expect(updateTransactionPayAmountMock).toHaveBeenCalledTimes(2);
      expect(result.current.isClampCommitFailed).toBe(false);
      expect(result.current.isClampCommitPending).toBe(false);

      jest.useRealTimers();
    });

    it('reports pending state while commit is in flight', async () => {
      mockPayToken(ETHEREUM_USDT_ADDRESS, '1000');

      const perpsDepositMeta = {
        type: TransactionType.perpsDeposit,
        id: transactionIdMock,
        chainId: '0x1' as Hex,
        txParams: { from: '0xabc' as Hex },
      } as unknown as Partial<TransactionMeta>;

      const { result, rerender } = runHook({
        transactionMeta: perpsDepositMeta,
      });

      await act(async () => {
        result.current.updatePendingAmountPercentage(100);
      });

      // Replace with a first Lighter deposit
      const actualHook = jest.requireActual(
        './useTransactionMetadataRequest',
      ).useTransactionMetadataRequest;

      jest.mocked(useTransactionMetadataRequest).mockImplementation(() => {
        const current = actualHook();
        return {
          ...current,
          id: 'replacement-lighter-deposit',
          type: TransactionType.perpsLighterDeposit,
          nestedTransactions: [{ data: '0x095ea7b3' }, { data: '0x8a857083' }],
        } as TransactionMeta;
      });
      mockPayToken(undefined);

      await act(async () => {
        rerender({});
        jest.runAllTimers();
      });

      // Make updateTransactionPayAmount hang
      let resolveUpdate: (value: boolean) => void;
      const hangingPromise = new Promise<boolean>((resolve) => {
        resolveUpdate = resolve;
      });
      updateTransactionPayAmountMock.mockReturnValue(hangingPromise);

      mockPayToken(ETHEREUM_USDT_ADDRESS, '1000');

      await act(async () => {
        rerender({});
        jest.runAllTimers();
      });

      // Should show pending while in flight
      expect(result.current.isClampCommitPending).toBe(true);

      // Resolve
      await act(async () => {
        if (resolveUpdate) {
          resolveUpdate(true);
        }
        await Promise.resolve();
      });

      expect(result.current.isClampCommitPending).toBe(false);
    });

    it('keeps the replaced amount when depositPrefill status toggles', async () => {
      (selectMetaMaskPayFlags as unknown as jest.Mock).mockReturnValue({
        prefilledAmount: {
          default: { enabled: false },
          overrides: {
            perpsDeposit: { enabled: true },
          },
        },
      });

      mockPayToken(ETHEREUM_USDT_ADDRESS, '1000');

      const { result, rerender } = runHook({
        transactionMeta: perpsDepositTransactionMeta,
      });

      // Initial prefill to 50%
      await act(async () => {
        jest.runAllTimers();
      });

      expect(result.current.amountFiat).toBe('500');

      // User edits to a different amount
      await act(async () => {
        result.current.updatePendingAmount('350');
      });

      expect(result.current.amountFiat).toBe('350');

      // Replace transaction - amount is kept
      await replaceTransaction(rerender);

      expect(result.current.amountFiat).toBe('350');

      // Toggle prefill status: Prefilled -> not prefilled (zero balance)
      mockPayToken(ETHEREUM_USDT_ADDRESS, '0');

      await act(async () => {
        rerender({});
        jest.runAllTimers();
      });

      // Amount should stay 350, not cleared to 0 by prefill logic
      expect(result.current.amountFiat).toBe('350');

      // Toggle back: not prefilled -> Prefilled with higher balance
      mockPayToken(ETHEREUM_USDT_ADDRESS, '2000');

      await act(async () => {
        rerender({});
        jest.runAllTimers();
      });

      // Amount should still be 350, not changed to the new prefill (1000)
      expect(result.current.amountFiat).toBe('350');
    });

    it('keeps amount through automatic token change after replacement, then clears on user token change', async () => {
      (selectMetaMaskPayFlags as unknown as jest.Mock).mockReturnValue({
        prefilledAmount: {
          default: { enabled: false },
          overrides: {
            perpsDeposit: { enabled: true },
          },
        },
      });

      // Start with token A at $1000
      mockPayToken(ETHEREUM_USDT_ADDRESS, '1000');

      const { result, rerender } = runHook({
        transactionMeta: perpsDepositTransactionMeta,
      });

      await act(async () => {
        jest.runAllTimers();
      });

      // Prefill to 50% = $500
      expect(result.current.amountFiat).toBe('500');

      // User edits to $700
      await act(async () => {
        result.current.updatePendingAmount('700');
      });

      expect(result.current.amountFiat).toBe('700');

      // Replace transaction
      await replaceTransaction(rerender);

      expect(result.current.amountFiat).toBe('700');

      // Automatic token selection picks a different token (token B at $800)
      // This simulates Hyperliquid -> Lighter provider switch picking different chains
      mockPayToken(ETHEREUM_USDC_ADDRESS, '800');

      await act(async () => {
        rerender({});
        jest.runAllTimers();
      });

      // Amount should still be 700, not changed to new prefill (400 = 50% of 800)
      expect(result.current.amountFiat).toBe('700');

      // Now user manually changes to a third token (token C at $1200)
      mockPayToken(ETHEREUM_DAI_ADDRESS, '1200');

      await act(async () => {
        rerender({});
        jest.runAllTimers();
      });

      // This was a user-initiated change, so prefill applies: 50% of 1200 = 600
      expect(result.current.amountFiat).toBe('600');
    });
  });
});
