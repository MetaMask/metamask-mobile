/**
 * Integration tests — Money balance refresh on transaction confirmation.
 *
 * Exercises the app-to-controller seam `useRefreshMoneyBalanceOnTxConfirm`
 * sits on: a real `TransactionController:transactionConfirmed` event on a real
 * messenger, the real transaction guards, the real `moneyBalance` reducer, and
 * the real query-cache invalidation / refetch chain through
 * `invalidateMoneyAccountBalanceCaches`. Only the balance fetch behind the
 * messenger and the Sentry transport are mocked.
 *
 * Setup is delegated to the Money integration harness — see
 * `tests/integration/harnesses/money.ts` (rules + factory) and
 * `tests/integration/AGENTS.md` (framework overview).
 */

// Side-effect import: triggers the standard jest.mock(...) declarations for
// the Money I/O boundary. Must come before any import of the code under test.
import {
  buildMoneyIntegrationHarness,
  MONEY_ACCOUNT_ADDRESS,
} from '../../../../../tests/integration/harnesses/money';
import { waitFor } from '@testing-library/react-native';
import {
  CHAIN_IDS,
  TransactionMeta,
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import { MUSD_TOKEN_ADDRESS } from '../../Earn/constants/musd';
import { selectHasPendingMoneyBalanceUserOp } from '../../../../core/redux/slices/moneyBalance';
import { useRefreshMoneyBalanceOnTxConfirm } from './useRefreshMoneyBalanceOnTxConfirm';

const BASELINE_BALANCE = '3000000';
const SETTLED_BALANCE = '3200000';

const MUSD_ON_MONAD = {
  tokenAddress: MUSD_TOKEN_ADDRESS,
  chainId: CHAIN_IDS.MONAD,
};

const makeTx = (
  type: TransactionType,
  overrides: Partial<TransactionMeta> = {},
): TransactionMeta =>
  ({
    id: 'tx-1',
    time: 0,
    txParams: { from: MONEY_ACCOUNT_ADDRESS },
    status: TransactionStatus.confirmed,
    type,
    ...overrides,
  }) as unknown as TransactionMeta;

describe('Money balance refresh on tx confirm — integration', () => {
  describe('transactions that move the Money balance', () => {
    it('refreshes the balance and flags the change as user-caused for a confirmed deposit', async () => {
      // Arrange
      const money = buildMoneyIntegrationHarness({
        totalBalance: BASELINE_BALANCE,
      });
      await money.primeBalanceQuery();
      money.renderMoneyHook(() => useRefreshMoneyBalanceOnTxConfirm());
      money.setTotalBalance(SETTLED_BALANCE);

      // Act
      money.confirmTransaction(makeTx(TransactionType.moneyAccountDeposit));

      // Assert
      await waitFor(() =>
        expect(money.readBalance()?.totalBalance).toBe(SETTLED_BALANCE),
      );
      expect(selectHasPendingMoneyBalanceUserOp(money.getState())).toBe(true);
      expect(money.mocks.invalidateBalanceServiceQueries).toHaveBeenCalled();
      expect(money.mocks.invalidateApiDataServiceQueries).toHaveBeenCalled();
    });

    it('refreshes the balance for a confirmed withdrawal', async () => {
      // Arrange
      const money = buildMoneyIntegrationHarness({
        totalBalance: BASELINE_BALANCE,
      });
      await money.primeBalanceQuery();
      money.renderMoneyHook(() => useRefreshMoneyBalanceOnTxConfirm());
      money.setTotalBalance(SETTLED_BALANCE);

      // Act
      money.confirmTransaction(makeTx(TransactionType.moneyAccountWithdraw));

      // Assert
      await waitFor(() =>
        expect(money.readBalance()?.totalBalance).toBe(SETTLED_BALANCE),
      );
      expect(selectHasPendingMoneyBalanceUserOp(money.getState())).toBe(true);
    });

    it('refreshes the balance for a Perps deposit funded with mUSD via MetaMask Pay', async () => {
      // Arrange
      const money = buildMoneyIntegrationHarness({
        totalBalance: BASELINE_BALANCE,
      });
      await money.primeBalanceQuery();
      money.renderMoneyHook(() => useRefreshMoneyBalanceOnTxConfirm());
      money.setTotalBalance(SETTLED_BALANCE);

      // Act
      money.confirmTransaction(
        makeTx(TransactionType.perpsDeposit, { metamaskPay: MUSD_ON_MONAD }),
      );

      // Assert
      await waitFor(() =>
        expect(money.readBalance()?.totalBalance).toBe(SETTLED_BALANCE),
      );
      expect(selectHasPendingMoneyBalanceUserOp(money.getState())).toBe(true);
    });
  });

  describe('transactions the hook ignores', () => {
    it('leaves the balance and the signal untouched for an unrelated transaction', async () => {
      // Arrange
      const money = buildMoneyIntegrationHarness({
        totalBalance: BASELINE_BALANCE,
      });
      await money.primeBalanceQuery();
      money.renderMoneyHook(() => useRefreshMoneyBalanceOnTxConfirm());
      money.setTotalBalance(SETTLED_BALANCE);

      // Act
      money.confirmTransaction(makeTx(TransactionType.contractInteraction));

      // Assert
      expect(selectHasPendingMoneyBalanceUserOp(money.getState())).toBe(false);
      expect(
        money.mocks.invalidateBalanceServiceQueries,
      ).not.toHaveBeenCalled();
      expect(money.readBalance()?.totalBalance).toBe(BASELINE_BALANCE);
    });

    it('leaves the balance and the signal untouched for a Money deposit that is not confirmed', async () => {
      // Arrange
      const money = buildMoneyIntegrationHarness({
        totalBalance: BASELINE_BALANCE,
      });
      await money.primeBalanceQuery();
      money.renderMoneyHook(() => useRefreshMoneyBalanceOnTxConfirm());
      money.setTotalBalance(SETTLED_BALANCE);

      // Act
      money.confirmTransaction(
        makeTx(TransactionType.moneyAccountDeposit, {
          status: TransactionStatus.failed,
        }),
      );

      // Assert
      expect(selectHasPendingMoneyBalanceUserOp(money.getState())).toBe(false);
      expect(
        money.mocks.invalidateBalanceServiceQueries,
      ).not.toHaveBeenCalled();
      expect(money.readBalance()?.totalBalance).toBe(BASELINE_BALANCE);
    });

    it('leaves the signal untouched when the wallet has no Money account', async () => {
      // Arrange
      const money = buildMoneyIntegrationHarness({
        hasMoneyAccount: false,
        totalBalance: BASELINE_BALANCE,
      });
      money.renderMoneyHook(() => useRefreshMoneyBalanceOnTxConfirm());

      // Act
      money.confirmTransaction(makeTx(TransactionType.moneyAccountDeposit));

      // Assert
      expect(selectHasPendingMoneyBalanceUserOp(money.getState())).toBe(false);
      expect(
        money.mocks.invalidateBalanceServiceQueries,
      ).not.toHaveBeenCalled();
    });

    it('stops refreshing once the hook unmounts', async () => {
      // Arrange
      const money = buildMoneyIntegrationHarness({
        totalBalance: BASELINE_BALANCE,
      });
      await money.primeBalanceQuery();
      const { unmount } = money.renderMoneyHook(() =>
        useRefreshMoneyBalanceOnTxConfirm(),
      );
      money.setTotalBalance(SETTLED_BALANCE);

      // Act
      unmount();
      money.confirmTransaction(makeTx(TransactionType.moneyAccountDeposit));

      // Assert
      expect(selectHasPendingMoneyBalanceUserOp(money.getState())).toBe(false);
      expect(
        money.mocks.invalidateBalanceServiceQueries,
      ).not.toHaveBeenCalled();
      expect(money.readBalance()?.totalBalance).toBe(BASELINE_BALANCE);
    });
  });

  describe('resolving the Money account', () => {
    it('resolves the Money account when the transaction confirms, not when the hook mounts', async () => {
      // Arrange
      const money = buildMoneyIntegrationHarness({
        hasMoneyAccount: false,
        totalBalance: BASELINE_BALANCE,
      });
      await money.primeBalanceQuery();
      money.renderMoneyHook(() => useRefreshMoneyBalanceOnTxConfirm());

      // Act
      money.setHasMoneyAccount(true);
      money.setTotalBalance(SETTLED_BALANCE);
      money.confirmTransaction(makeTx(TransactionType.moneyAccountDeposit));

      // Assert
      await waitFor(() =>
        expect(money.readBalance()?.totalBalance).toBe(SETTLED_BALANCE),
      );
      expect(selectHasPendingMoneyBalanceUserOp(money.getState())).toBe(true);
    });
  });

  describe('stale reads after confirmation', () => {
    it('keeps the signal armed when the balance moves on a later retry', async () => {
      // Arrange
      const money = buildMoneyIntegrationHarness({
        totalBalance: BASELINE_BALANCE,
      });
      await money.primeBalanceQuery();
      money.renderMoneyHook(() => useRefreshMoneyBalanceOnTxConfirm());

      // Act
      money.confirmTransaction(makeTx(TransactionType.moneyAccountDeposit));
      await waitFor(() =>
        expect(money.mocks.fetchBalanceWithFallback).toHaveBeenCalledTimes(2),
      );
      money.setTotalBalance(SETTLED_BALANCE);

      // Assert
      await waitFor(() =>
        expect(money.readBalance()?.totalBalance).toBe(SETTLED_BALANCE),
      );
      expect(selectHasPendingMoneyBalanceUserOp(money.getState())).toBe(true);
      expect(money.mocks.logger.error).not.toHaveBeenCalled();
    });

    it('clears the signal and reports when the balance never moves', async () => {
      // Arrange
      const money = buildMoneyIntegrationHarness({
        totalBalance: BASELINE_BALANCE,
      });
      await money.primeBalanceQuery();
      money.renderMoneyHook(() => useRefreshMoneyBalanceOnTxConfirm());

      // Act
      money.confirmTransaction(makeTx(TransactionType.moneyAccountDeposit));

      // Assert
      await waitFor(
        () =>
          expect(selectHasPendingMoneyBalanceUserOp(money.getState())).toBe(
            false,
          ),
        { timeout: 15000 },
      );
      expect(money.mocks.logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Balance unchanged after 4 retries'),
        }),
      );
    });
  });

  describe('failed refresh', () => {
    it('clears the signal when the refresh rejects, so a later poll cannot animate it', async () => {
      // Arrange
      const money = buildMoneyIntegrationHarness({
        totalBalance: BASELINE_BALANCE,
      });
      await money.primeBalanceQuery();
      money.renderMoneyHook(() => useRefreshMoneyBalanceOnTxConfirm());
      money.mocks.invalidateBalanceServiceQueries.mockRejectedValueOnce(
        new Error('balance service unavailable'),
      );

      // Act
      money.confirmTransaction(makeTx(TransactionType.moneyAccountDeposit));

      // Assert
      expect(selectHasPendingMoneyBalanceUserOp(money.getState())).toBe(true);
      await waitFor(() =>
        expect(selectHasPendingMoneyBalanceUserOp(money.getState())).toBe(
          false,
        ),
      );
      expect(money.mocks.logger.error).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'balance service unavailable' }),
        '[Money Balance Refresh] Balance refresh failed',
      );
    });
  });
});
