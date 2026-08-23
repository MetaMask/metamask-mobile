import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { PaymentOverride } from '@metamask/transaction-pay-controller';
import { Hex } from '@metamask/utils';
import { merge } from 'lodash';

import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { otherControllersMock } from '../../__mocks__/controllers/other-controllers-mock';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { usePredictBalance } from '../../../../UI/Predict/hooks/usePredictBalance';
import { usePayTokenAccountBalance } from './usePayTokenAccountBalance';
import { useTransactionPayBalance } from './useTransactionPayBalance';

jest.mock('../transactions/useTransactionMetadataRequest');
jest.mock('../../../../UI/Predict/hooks/usePredictBalance');
jest.mock('./usePayTokenAccountBalance');

const MONEY_ACCOUNT_ADDRESS_MOCK = '0xabc123';
const MONEY_ACCOUNT_KEYRING_ID_MOCK = 'mock-money-keyring-id';
const TRANSACTION_ID_MOCK = 'tx-1';

function runHook(stateOverrides?: Record<string, unknown>) {
  return renderHookWithProvider(() => useTransactionPayBalance(), {
    state: merge({}, otherControllersMock, stateOverrides ?? {}),
  });
}

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
                entropy: { id: MONEY_ACCOUNT_KEYRING_ID_MOCK },
              },
            },
          },
        },
      },
    },
  };
}

describe('useTransactionPayBalance', () => {
  const useTransactionMetadataRequestMock = jest.mocked(
    useTransactionMetadataRequest,
  );
  const usePredictBalanceMock = jest.mocked(usePredictBalance);
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

    usePredictBalanceMock.mockReturnValue({
      data: 0,
    } as ReturnType<typeof usePredictBalance>);

    // Reactive wallet balance backing the default (deposit) flow.
    usePayTokenAccountBalanceMock.mockReturnValue({
      balanceUsd: '25',
      balanceRaw: '12500000',
    });
  });

  it('returns the pay token balance by default', () => {
    const { result } = runHook();

    expect(result.current).toStrictEqual({
      balanceRaw: '12500000',
      balanceUsd: 25,
    });
  });

  it('returns zero when the pay token is unset', () => {
    usePayTokenAccountBalanceMock.mockReturnValue({
      balanceUsd: '0',
      balanceRaw: '0',
    });

    const { result } = runHook();

    expect(result.current).toStrictEqual({
      balanceRaw: '0',
      balanceUsd: 0,
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
        balanceRaw: '500500000',
        balanceUsd: 500.5,
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
        balanceRaw: '0',
        balanceUsd: 0,
      });
    });
  });

  describe('money account withdraw', () => {
    beforeEach(() => {
      mockTransaction({ type: TransactionType.moneyAccountWithdraw });
    });

    it('returns the exact cached money-account redeemable raw as 1:1 USD', () => {
      const { result } = runHook(getMoneyAccountState('10000000'));

      expect(result.current).toStrictEqual({
        balanceRaw: '10000000',
        balanceUsd: 10,
      });
    });

    it('returns zero when the cached money-account redeemable raw is unavailable', () => {
      const { result } = runHook();

      expect(result.current).toStrictEqual({
        balanceRaw: '0',
        balanceUsd: 0,
      });
    });
  });

  describe('predict withdraw', () => {
    beforeEach(() => {
      mockTransaction({ type: TransactionType.predictWithdraw });
    });

    it('returns the predict balance with USD 1:1', () => {
      usePredictBalanceMock.mockReturnValue({
        data: 4,
      } as ReturnType<typeof usePredictBalance>);

      const { result } = runHook();

      expect(result.current).toStrictEqual({
        balanceRaw: '4000000',
        balanceUsd: 4,
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

    it('returns the cached money-account redeemable raw as 1:1 USD', () => {
      const { result } = renderHookWithProvider(
        () => useTransactionPayBalance(),
        {
          state: merge(
            {},
            otherControllersMock,
            overrideState,
            getMoneyAccountState('3129000'),
          ),
        },
      );

      expect(result.current).toStrictEqual({
        balanceUsd: 3.129,
        balanceRaw: '3129000',
      });
    });

    it('returns zero when the cached money-account redeemable raw is unavailable', () => {
      const { result } = renderHookWithProvider(
        () => useTransactionPayBalance(),
        { state: merge({}, otherControllersMock, overrideState) },
      );

      expect(result.current).toStrictEqual({
        balanceRaw: '0',
        balanceUsd: 0,
      });
    });
  });
});
