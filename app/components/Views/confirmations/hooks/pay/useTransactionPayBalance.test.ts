import { BigNumber } from 'bignumber.js';
import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import {
  PaymentOverride,
  TransactionPaymentToken,
} from '@metamask/transaction-pay-controller';
import { Hex } from '@metamask/utils';
import { merge } from 'lodash';

import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { otherControllersMock } from '../../__mocks__/controllers/other-controllers-mock';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useTransactionPayToken } from './useTransactionPayToken';
import { useTokenFiatRate } from '../tokens/useTokenFiatRates';
import { usePredictBalance } from '../../../../UI/Predict/hooks/usePredictBalance';
import useMoneyAccountBalance from '../../../../UI/Money/hooks/useMoneyAccountBalance';
import { usePayTokenAccountBalance } from './usePayTokenAccountBalance';
import { useTransactionPayBalance } from './useTransactionPayBalance';

jest.mock('../transactions/useTransactionMetadataRequest');
jest.mock('./useTransactionPayToken');
jest.mock('../tokens/useTokenFiatRates');
jest.mock('../../../../UI/Predict/hooks/usePredictBalance');
jest.mock('../../../../UI/Money/hooks/useMoneyAccountBalance');
jest.mock('./usePayTokenAccountBalance');

const TRANSACTION_ID_MOCK = 'tx-1';

const PAY_TOKEN_MOCK = {
  address: '0x1234567890123456789012345678901234567890' as Hex,
  chainId: '0x1' as Hex,
  balanceHuman: '12.5',
  balanceUsd: '25',
} as TransactionPaymentToken;

function runHook(stateOverrides?: Record<string, unknown>) {
  return renderHookWithProvider(() => useTransactionPayBalance(), {
    state: merge({}, otherControllersMock, stateOverrides ?? {}),
  });
}

describe('useTransactionPayBalance', () => {
  const useTransactionMetadataRequestMock = jest.mocked(
    useTransactionMetadataRequest,
  );
  const useTransactionPayTokenMock = jest.mocked(useTransactionPayToken);
  const useTokenFiatRateMock = jest.mocked(useTokenFiatRate);
  const usePredictBalanceMock = jest.mocked(usePredictBalance);
  const useMoneyAccountBalanceMock = jest.mocked(useMoneyAccountBalance);
  const usePayTokenAccountBalanceMock = jest.mocked(usePayTokenAccountBalance);

  function mockTransaction(overrides: Partial<TransactionMeta> = {}) {
    useTransactionMetadataRequestMock.mockReturnValue({
      id: TRANSACTION_ID_MOCK,
      chainId: '0x1' as Hex,
      ...overrides,
    } as TransactionMeta);
  }

  beforeEach(() => {
    jest.resetAllMocks();

    mockTransaction();

    useTransactionPayTokenMock.mockReturnValue({
      payToken: PAY_TOKEN_MOCK,
      setPayToken: jest.fn(),
    });

    useTokenFiatRateMock.mockReturnValue(1);

    usePredictBalanceMock.mockReturnValue({
      data: 0,
    } as ReturnType<typeof usePredictBalance>);

    useMoneyAccountBalanceMock.mockReturnValue({
      withdrawableMusd: undefined,
      withdrawableFiatRaw: undefined,
    } as ReturnType<typeof useMoneyAccountBalance>);

    // Reactive wallet balance backing the default (deposit) flow.
    usePayTokenAccountBalanceMock.mockReturnValue({
      balanceUsd: '25',
      balanceRaw: '12500000',
    });
  });

  it('returns the pay token balance by default', () => {
    const { result } = runHook();

    expect(result.current).toStrictEqual({
      balanceHuman: '12.5',
      balanceUsd: 25,
      balanceRaw: '12500000',
    });
  });

  it('returns zero when the pay token is unset', () => {
    useTransactionPayTokenMock.mockReturnValue({
      payToken: undefined,
      setPayToken: jest.fn(),
    });
    usePayTokenAccountBalanceMock.mockReturnValue({
      balanceUsd: '0',
      balanceRaw: '0',
    });

    const { result } = runHook();

    expect(result.current).toStrictEqual({
      balanceHuman: '0',
      balanceUsd: 0,
      balanceRaw: '0',
    });
  });

  describe('perps withdraw', () => {
    beforeEach(() => {
      mockTransaction({ type: TransactionType.perpsWithdraw });
    });

    it('returns the withdrawable balance with USD 1:1', () => {
      const { result } = renderHookWithProvider(
        () => useTransactionPayBalance(),
        {
          state: merge({}, otherControllersMock, {
            engine: {
              backgroundState: {
                PerpsController: {
                  accountState: { withdrawableBalance: '500.5' },
                },
              },
            },
          }),
        },
      );

      expect(result.current).toStrictEqual({
        balanceHuman: '500.5',
        balanceUsd: 500.5,
        balanceRaw: '500500000',
      });
    });

    it('returns zero when there is no withdrawable balance', () => {
      const { result } = renderHookWithProvider(
        () => useTransactionPayBalance(),
        {
          state: merge({}, otherControllersMock, {
            engine: {
              backgroundState: {
                PerpsController: { accountState: {} },
              },
            },
          }),
        },
      );

      expect(result.current).toStrictEqual({
        balanceHuman: '0',
        balanceUsd: 0,
        balanceRaw: '0',
      });
    });
  });

  describe('money account withdraw', () => {
    beforeEach(() => {
      mockTransaction({ type: TransactionType.moneyAccountWithdraw });
    });

    it('returns the withdrawable mUSD converted to USD via the mUSD rate', () => {
      useTokenFiatRateMock.mockReturnValue(2);
      useMoneyAccountBalanceMock.mockReturnValue({
        withdrawableMusd: new BigNumber('10'),
      } as ReturnType<typeof useMoneyAccountBalance>);

      const { result } = runHook();

      expect(result.current).toStrictEqual({
        balanceHuman: '10',
        balanceUsd: 20,
        balanceRaw: '10000000',
      });
    });

    it('returns zero when the withdrawable mUSD is unavailable', () => {
      useMoneyAccountBalanceMock.mockReturnValue({
        withdrawableMusd: undefined,
      } as ReturnType<typeof useMoneyAccountBalance>);

      const { result } = runHook();

      expect(result.current).toStrictEqual({
        balanceHuman: '0',
        balanceUsd: 0,
        balanceRaw: '0',
      });
    });
  });

  describe('predict withdraw', () => {
    beforeEach(() => {
      mockTransaction({ type: TransactionType.predictWithdraw });
    });

    it('returns the predict balance converted to USD via the pay token rate', () => {
      useTokenFiatRateMock.mockReturnValue(3);
      usePredictBalanceMock.mockReturnValue({
        data: 4,
      } as ReturnType<typeof usePredictBalance>);

      const { result } = runHook();

      expect(result.current).toStrictEqual({
        balanceHuman: '4',
        balanceUsd: 12,
        balanceRaw: '4000000',
      });
    });
  });

  describe('money account payment override', () => {
    const overrideState = {
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
    };

    it('returns the withdrawable fiat rounded down to cents, human == usd', () => {
      useMoneyAccountBalanceMock.mockReturnValue({
        withdrawableFiatRaw: '3.129',
      } as ReturnType<typeof useMoneyAccountBalance>);

      const { result } = renderHookWithProvider(
        () => useTransactionPayBalance(),
        { state: merge({}, otherControllersMock, overrideState) },
      );

      expect(result.current).toStrictEqual({
        balanceHuman: '3.12',
        balanceUsd: 3.12,
        balanceRaw: '3120000',
      });
    });

    it('returns zero when the withdrawable fiat is unavailable', () => {
      useMoneyAccountBalanceMock.mockReturnValue({
        withdrawableFiatRaw: undefined,
      } as ReturnType<typeof useMoneyAccountBalance>);

      const { result } = renderHookWithProvider(
        () => useTransactionPayBalance(),
        { state: merge({}, otherControllersMock, overrideState) },
      );

      expect(result.current).toStrictEqual({
        balanceHuman: '0',
        balanceUsd: 0,
        balanceRaw: '0',
      });
    });
  });
});
