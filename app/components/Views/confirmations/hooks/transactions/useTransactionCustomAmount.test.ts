import { merge } from 'lodash';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { useTransactionCustomAmount } from './useTransactionCustomAmount';
import { simpleSendTransactionControllerMock } from '../../__mocks__/controllers/transaction-controller-mock';
import { otherControllersMock } from '../../__mocks__/controllers/other-controllers-mock';
import { transactionApprovalControllerMock } from '../../__mocks__/controllers/approval-controller-mock';
import { act } from 'react';
import { useTokenFiatRate } from '../tokens/useTokenFiatRates';
import { useTransactionPayToken } from '../pay/useTransactionPayToken';
import { useUpdateTokenAmount } from './useUpdateTokenAmount';
import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { useParams } from '../../../../../util/navigation/navUtils';
import { NATIVE_TOKEN_ADDRESS } from '../../constants/tokens';
import { Hex } from '@metamask/utils';
import { usePredictBalance } from '../../../../UI/Predict/hooks/usePredictBalance';
import { useTransactionPayRequiredTokens } from '../pay/useTransactionPayData';
import {
  TransactionPaymentToken,
  TransactionPayRequiredToken,
} from '@metamask/transaction-pay-controller';
import { useConfirmationMetricEvents } from '../metrics/useConfirmationMetricEvents';

jest.mock('../tokens/useTokenFiatRates');
jest.mock('../transactions/useUpdateTokenAmount');
jest.mock('../pay/useTransactionPayToken');
jest.mock('../pay/useTransactionPayData');
jest.mock('../useTokenAmount');
jest.mock('../../../../../util/navigation/navUtils');
jest.mock('../../../../UI/Predict/hooks/usePredictBalance');
jest.mock('../metrics/useConfirmationMetricEvents');

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
  const useUpdateTokenAmountMock = jest.mocked(useUpdateTokenAmount);
  const useTransactionPayTokenMock = jest.mocked(useTransactionPayToken);
  const useParamsMock = jest.mocked(useParams);
  const usePredictBalanceMock = jest.mocked(usePredictBalance);
  const useTransactionRequiredTokensMock = jest.mocked(
    useTransactionPayRequiredTokens,
  );
  const useConfirmationMetricEventsMock = jest.mocked(
    useConfirmationMetricEvents,
  );

  const updateTokenAmountMock: ReturnType<
    typeof useUpdateTokenAmount
  >['updateTokenAmount'] = jest.fn();

  const setConfirmationMetricMock = jest.fn();

  beforeEach(() => {
    jest.resetAllMocks();

    useTokenFiatRateMock.mockReturnValue(2);

    useUpdateTokenAmountMock.mockReturnValue({
      updateTokenAmount: updateTokenAmountMock,
    } as ReturnType<typeof useUpdateTokenAmountMock>);

    useTransactionPayTokenMock.mockReturnValue({
      payToken: {
        address: TOKEN_ADDRESS_MOCK,
        balanceUsd: '1234.56',
        chainId: '0x1' as Hex,
      } as TransactionPaymentToken,
    } as ReturnType<typeof useTransactionPayToken>);

    useParamsMock.mockReturnValue({});
    useTransactionRequiredTokensMock.mockReturnValue([]);
    usePredictBalanceMock.mockReturnValue({ balance: 0 } as never);
    useConfirmationMetricEventsMock.mockReturnValue({
      setConfirmationMetric: setConfirmationMetricMock,
    } as unknown as ReturnType<typeof useConfirmationMetricEvents>);
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

  it('updateTokenAmount updates token amount in transaction data', async () => {
    const { result } = runHook();

    await act(async () => {
      result.current.updatePendingAmount('123.45');
    });

    await act(async () => {
      result.current.updateTokenAmount();
    });

    expect(updateTokenAmountMock).toHaveBeenCalledWith('61.725');
  });

  it('returns default amount from params if available', async () => {
    useParamsMock.mockReturnValue({ amount: '43.21' });

    const { result } = runHook();

    expect(result.current.amountFiat).toBe('43.21');
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

    it('minus buffers if 100', async () => {
      useTransactionRequiredTokensMock.mockReturnValue([
        {},
        {},
      ] as TransactionPayRequiredToken[]);

      const { result } = runHook();

      await act(async () => {
        result.current.updatePendingAmountPercentage(100);
      });

      expect(result.current.amountFiat).toBe('1141.96');
    });

    it('minus additional buffer if 100 and pay token is native', async () => {
      useTransactionRequiredTokensMock.mockReturnValue([
        {},
        {},
      ] as TransactionPayRequiredToken[]);

      useTransactionPayTokenMock.mockReturnValue({
        payToken: {
          address: NATIVE_TOKEN_ADDRESS as Hex,
          balanceUsd: '1234.56',
        } as TransactionPaymentToken,
      } as ReturnType<typeof useTransactionPayToken>);

      const { result } = runHook();

      await act(async () => {
        result.current.updatePendingAmountPercentage(100);
      });

      expect(result.current.amountFiat).toBe('1111.1');
    });

    it('minus no buffer if 100 but pay token matches required token', async () => {
      useTransactionRequiredTokensMock.mockReturnValue([
        {
          address: TOKEN_ADDRESS_MOCK,
        },
        {},
      ] as TransactionPayRequiredToken[]);

      const { result } = runHook();

      await act(async () => {
        result.current.updatePendingAmountPercentage(100);
      });

      expect(result.current.amountFiat).toBe('1234.56');
    });

    it('minus no buffer if 100 but all required tokens have sufficient balance and skipIfBalance', async () => {
      useTransactionRequiredTokensMock.mockReturnValue([
        { skipIfBalance: true, amountRaw: '1', balanceRaw: '1' },
        { skipIfBalance: true, amountRaw: '1', balanceRaw: '1' },
      ] as TransactionPayRequiredToken[]);

      const { result } = runHook();

      await act(async () => {
        result.current.updatePendingAmountPercentage(100);
      });

      expect(result.current.amountFiat).toBe('1234.56');
    });

    it('to percentage of predict balance converted to USD', async () => {
      usePredictBalanceMock.mockReturnValue({ balance: 4321.23 } as never);

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

    it('to total predict balance with no buffers if 100', async () => {
      usePredictBalanceMock.mockReturnValue({ balance: 4321.23 } as never);

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
  });
});
