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
  MUSD_CONVERSION_DEFAULT_CHAIN_ID,
  MUSD_TOKEN_ADDRESS,
} from '../../../../UI/Earn/constants/musd';
import {
  useTransactionPayTotals,
  useTransactionPayIsMaxAmount,
  useTransactionPayIsPostQuote,
} from '../pay/useTransactionPayData';
import { useTransactionPayHasSourceAmount } from '../pay/useTransactionPayHasSourceAmount';
import {
  TransactionPaymentToken,
  TransactionPayTotals,
} from '@metamask/transaction-pay-controller';
import { useConfirmationMetricEvents } from '../metrics/useConfirmationMetricEvents';
import Engine from '../../../../../core/Engine';

jest.mock('../tokens/useTokenFiatRates');
jest.mock('../pay/useUpdateTransactionPayAmount');
jest.mock('../pay/useTransactionPayToken');
jest.mock('../pay/useTransactionPayData');
jest.mock('../pay/useTransactionPayHasSourceAmount');
jest.mock('../useTokenAmount');
jest.mock('../../../../../util/navigation/navUtils');
jest.mock('../../../../UI/Predict/hooks/usePredictBalance');
jest.mock('../../../../UI/Money/hooks/useMoneyAccountBalance');
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
const TOKEN_TRANSFER_DATA =
  '0xa9059cbb0000000000000000000000005a52e96bacdabb82fd05763e25335261b270efcb0000000000000000000000000000000000000000000000004563918244f40000';

function runHook({
  transactionMeta,
}: { transactionMeta?: Partial<TransactionMeta> } = {}) {
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
    ),
  });
}

describe('useTransactionCustomAmount', () => {
  const useTokenFiatRateMock = jest.mocked(useTokenFiatRate);
  const useUpdateTransactionPayAmountMock = jest.mocked(
    useUpdateTransactionPayAmount,
  );
  const useTransactionPayTokenMock = jest.mocked(useTransactionPayToken);
  const useParamsMock = jest.mocked(useParams);
  const usePredictBalanceMock = jest.mocked(usePredictBalance);
  const useMoneyAccountBalanceMock = jest.mocked(useMoneyAccountBalance);
  const useTransactionPayTotalsMock = jest.mocked(useTransactionPayTotals);
  const useTransactionPayIsMaxAmountMock = jest.mocked(
    useTransactionPayIsMaxAmount,
  );
  const useTransactionPayIsPostQuoteMock = jest.mocked(
    useTransactionPayIsPostQuote,
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

  const updateTransactionPayAmountMock: ReturnType<
    typeof useUpdateTransactionPayAmount
  >['updateTransactionPayAmount'] = jest.fn();

  const setConfirmationMetricMock = jest.fn();

  beforeEach(() => {
    jest.resetAllMocks();

    useTokenFiatRateMock.mockReturnValue(2);

    useUpdateTransactionPayAmountMock.mockReturnValue({
      updateTransactionPayAmount: updateTransactionPayAmountMock,
    } as ReturnType<typeof useUpdateTransactionPayAmountMock>);

    useTransactionPayTokenMock.mockReturnValue({
      payToken: {
        address: TOKEN_ADDRESS_MOCK,
        balanceUsd: '1234.56',
        chainId: '0x1' as Hex,
      } as TransactionPaymentToken,
    } as ReturnType<typeof useTransactionPayToken>);

    useParamsMock.mockReturnValue({});
    usePredictBalanceMock.mockReturnValue({ data: 0 } as never);
    useMoneyAccountBalanceMock.mockReturnValue({
      totalFiatRaw: undefined,
      tokenTotal: undefined,
    } as ReturnType<typeof useMoneyAccountBalance>);
    useConfirmationMetricEventsMock.mockReturnValue({
      setConfirmationMetric: setConfirmationMetricMock,
    } as unknown as ReturnType<typeof useConfirmationMetricEvents>);
    useTransactionPayTotalsMock.mockReturnValue(undefined);
    useTransactionPayIsMaxAmountMock.mockReturnValue(false);
    useTransactionPayIsPostQuoteMock.mockReturnValue(false);
    useTransactionPayHasSourceAmountMock.mockReturnValue(true);
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
      properties: {
        mm_pay_quote_requested: true,
      },
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
      properties: {
        mm_pay_quote_requested: true,
      },
    });
  });

  it('returns default amount from params if available', async () => {
    useParamsMock.mockReturnValue({ amount: '43.21' });

    const { result } = runHook();

    expect(result.current.amountFiat).toBe('43.21');
  });

  it('returns targetAmount.usd when isMaxAmount is true', async () => {
    useTransactionPayIsMaxAmountMock.mockReturnValue(true);
    useTransactionPayTotalsMock.mockReturnValue({
      targetAmount: { usd: '567.891' },
    } as TransactionPayTotals);

    const { result } = runHook();

    expect(result.current.amountFiat).toBe('567.89');
  });

  it.each([
    TransactionType.perpsWithdraw,
    TransactionType.predictWithdraw,
    TransactionType.moneyAccountWithdraw,
  ])(
    'skips the targetAmount.usd override for %s because it represents the destination-received value, not the withdraw amount',
    async (transactionType) => {
      useTransactionPayIsMaxAmountMock.mockReturnValue(true);
      useTransactionPayTotalsMock.mockReturnValue({
        targetAmount: { usd: '567.891' },
      } as TransactionPayTotals);

      useParamsMock.mockReturnValue({ amount: '100' });

      const { result } = runHook({
        transactionMeta: { type: transactionType },
      });

      expect(result.current.amountFiat).toBe('100');
    },
  );

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

    expect(result.current.hasInput).toBe(true);

    await act(async () => {
      jest.runAllTimers();
    });

    expect(result.current.hasInput).toBe(false);
  });

  describe('updatePendingAmountPercentage updates amount fiat', () => {
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

    it('to percentage of predict balance converted to USD', async () => {
      usePredictBalanceMock.mockReturnValue({ data: 4321.23 } as never);

      const { result } = runHook({
        transactionMeta: {
          type: TransactionType.predictWithdraw,
        },
      });

      await act(async () => {
        result.current.updatePendingAmountPercentage(43);
      });

      expect(result.current.amountFiat).toBe('3716.25');
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

      expect(result.current.amountFiat).toBe('8642.46');
    });

    it('to percentage of perps available balance', async () => {
      (Engine.context as Record<string, unknown>).PerpsController = {
        state: {
          accountState: {
            availableBalance: '500.00',
          },
        },
      };

      const { result } = runHook({
        transactionMeta: {
          type: TransactionType.perpsWithdraw,
        },
      });

      await act(async () => {
        result.current.updatePendingAmountPercentage(50);
      });

      expect(result.current.amountFiat).toBe('250');
    });

    it('truncates the Max amount for perps withdraw down to 2 decimals so the input field matches the displayed balance', async () => {
      // Real HL balances often have 3+ decimals (e.g. 50.389).
      // Max must truncate — not halfExpand — otherwise the typed value could
      // exceed the balance and trip the insufficient-balance alert.
      (Engine.context as Record<string, unknown>).PerpsController = {
        state: {
          accountState: {
            availableBalance: '50.389',
          },
        },
      };

      const { result } = runHook({
        transactionMeta: {
          type: TransactionType.perpsWithdraw,
        },
      });

      await act(async () => {
        result.current.updatePendingAmountPercentage(100);
      });

      expect(result.current.amountFiat).toBe('50.38');
    });

    it('does NOT set isMaxAmount=true for perps withdraw when Max is pressed', async () => {
      // TPC's calculatePostQuoteSourceAmounts substitutes token.balanceRaw
      // (the Arbitrum USDC wallet balance, not the HL balance) when
      // isMaxAmount=true, which would strand most of the HyperLiquid balance.
      // Letting isMaxAmount stay false routes the typed balance through as
      // token.amountRaw instead.
      (Engine.context as Record<string, unknown>).PerpsController = {
        state: {
          accountState: {
            availableBalance: '500.00',
          },
        },
      };

      const { result } = runHook({
        transactionMeta: {
          type: TransactionType.perpsWithdraw,
        },
      });

      await act(async () => {
        result.current.updatePendingAmountPercentage(100);
      });

      expect(setTransactionConfigMock).not.toHaveBeenCalled();
    });

    it('clears isMaxAmount for perps withdraw when Max was previously set and user re-selects 100%', async () => {
      // Defensive: if isMaxAmount is somehow already true, the perps-withdraw
      // Max path should still flip it back to false on re-selection.
      useTransactionPayIsMaxAmountMock.mockReturnValue(true);

      (Engine.context as Record<string, unknown>).PerpsController = {
        state: {
          accountState: {
            availableBalance: '500.00',
          },
        },
      };

      const { result } = runHook({
        transactionMeta: {
          type: TransactionType.perpsWithdraw,
        },
      });

      await act(async () => {
        result.current.updatePendingAmountPercentage(100);
      });

      const config = { isMaxAmount: true };
      setTransactionConfigMock.mock.calls[0][1](config);
      expect(config.isMaxAmount).toBe(false);
    });

    it('returns 0 for perps withdraw when no available balance', async () => {
      (Engine.context as Record<string, unknown>).PerpsController = {
        state: {
          accountState: {},
        },
      };

      const { result } = runHook({
        transactionMeta: {
          type: TransactionType.perpsWithdraw,
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
        tokenTotal: new BigNumber(500),
      } as ReturnType<typeof useMoneyAccountBalance>);

      const { result } = runHook({
        transactionMeta: {
          type: TransactionType.moneyAccountWithdraw,
        },
      });

      await act(async () => {
        result.current.updatePendingAmountPercentage(50);
      });

      expect(result.current.amountFiat).toBe('250');
    });

    it('requests fiat rate for mainnet mUSD when transaction is money account withdraw', () => {
      useTokenFiatRateMock.mockReturnValue(1);
      useMoneyAccountBalanceMock.mockReturnValue({
        tokenTotal: new BigNumber(100),
      } as ReturnType<typeof useMoneyAccountBalance>);

      runHook({
        transactionMeta: {
          type: TransactionType.moneyAccountWithdraw,
          id: transactionIdMock,
          chainId: '0x1' as Hex,
        } as TransactionMeta,
      });

      expect(useTokenFiatRateMock).toHaveBeenCalledWith(
        MUSD_TOKEN_ADDRESS,
        MUSD_CONVERSION_DEFAULT_CHAIN_ID,
        undefined,
      );
    });

    it('to total money account balance when selecting max', async () => {
      useTokenFiatRateMock.mockReturnValue(1);
      useMoneyAccountBalanceMock.mockReturnValue({
        tokenTotal: new BigNumber(500),
      } as ReturnType<typeof useMoneyAccountBalance>);

      const { result } = runHook({
        transactionMeta: {
          type: TransactionType.moneyAccountWithdraw,
        },
      });

      await act(async () => {
        result.current.updatePendingAmountPercentage(100);
      });

      expect(result.current.amountFiat).toBe('500');
    });

    it('does NOT set isMaxAmount=true for money account withdraw when Max is pressed', async () => {
      // Same class of bug as perps: isMaxAmount=true makes TPC use on-chain
      // token.balanceRaw (mUSD only) instead of the typed aggregate (mUSD +
      // musdSHFvd).
      useTokenFiatRateMock.mockReturnValue(1);
      useMoneyAccountBalanceMock.mockReturnValue({
        tokenTotal: new BigNumber(500),
      } as ReturnType<typeof useMoneyAccountBalance>);

      const { result } = runHook({
        transactionMeta: {
          type: TransactionType.moneyAccountWithdraw,
        },
      });

      await act(async () => {
        result.current.updatePendingAmountPercentage(100);
      });

      expect(result.current.amountFiat).toBe('500');
      expect(setTransactionConfigMock).not.toHaveBeenCalled();
    });

    it('clears isMaxAmount for money account withdraw when Max was previously set and user re-selects 100%', async () => {
      useTransactionPayIsMaxAmountMock.mockReturnValue(true);

      useTokenFiatRateMock.mockReturnValue(1);
      useMoneyAccountBalanceMock.mockReturnValue({
        tokenTotal: new BigNumber(500),
      } as ReturnType<typeof useMoneyAccountBalance>);

      const { result } = runHook({
        transactionMeta: {
          type: TransactionType.moneyAccountWithdraw,
        },
      });

      await act(async () => {
        result.current.updatePendingAmountPercentage(100);
      });

      expect(result.current.amountFiat).toBe('500');

      const config = { isMaxAmount: true };
      setTransactionConfigMock.mock.calls[0][1](config);
      expect(config.isMaxAmount).toBe(false);
    });

    it('returns 0 for money account withdraw when tokenTotal is undefined', async () => {
      useTokenFiatRateMock.mockReturnValue(1);
      useMoneyAccountBalanceMock.mockReturnValue({
        tokenTotal: undefined,
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
});
