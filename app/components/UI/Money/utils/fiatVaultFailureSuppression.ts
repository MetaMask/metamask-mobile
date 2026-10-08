import {
  TransactionStatus,
  type TransactionMeta,
} from '@metamask/transaction-controller';
import { isMoneyDepositTx } from './moneyTransactionGuards';

/**
 * Marker prepended by TransactionPayController when the Money Account vault
 * leg fails (`ma-vault-deposit.js#VAULT_ERROR_PREFIX`). Surfaces inside the
 * parent error chain as `Post-Ramp: Direct mUSD: Vault: <cause>`.
 */
const VAULT_ERROR_MARKER = 'Vault: ';

/**
 * Error stamped by TransactionController boot cleanup
 * (`#failIncompleteTransactions`) onto transactions stuck in
 * `approved`/`signed` across an app restart — e.g. a fiat deposit whose
 * headless-buy polling died with the app. The on-ramp order itself can still
 * settle afterwards, so unlike other failures this one needs an order-status
 * check before it may render as failed.
 */
const STARTUP_INCOMPLETE_MARKER = 'Transaction incomplete at startup';

/**
 * True when a fiat-funded Money deposit failed ONLY on the second (vault)
 * transaction while the on-ramp leg already settled.
 *
 * Direct-mUSD flow (`directMoneyMusdEnabled`): fiat buys mUSD straight into
 * the Money Account, then TPC submits a sponsored vault batch. If that batch
 * throws, the parent `moneyAccountDeposit` is marked `failed` even though the
 * user was funded — CHOMP auto-vaults idle mUSD, so the funds are safe and
 * the row must not render as a failure.
 *
 * Deliberately narrow: `failed` status + Money deposit + fiat marker +
 * `Vault:` in the error. Ramp/quote failures carry no `Vault:` marker and
 * still surface as failed.
 *
 * @param tx - The Money deposit transaction meta.
 * @returns True when the failure should not be shown as failed.
 */
export function isFiatVaultOnlyFailure(tx: TransactionMeta): boolean {
  if (tx.status !== TransactionStatus.failed) {
    return false;
  }

  if (!isMoneyDepositTx(tx)) {
    return false;
  }

  if (!tx.metamaskPay?.fiat) {
    return false;
  }

  const message = tx.error?.message;
  if (!message || !message.includes(VAULT_ERROR_MARKER)) {
    return false;
  }

  return true;
}

/**
 * Sync candidate check for a fiat deposit interrupted by an app restart:
 * failed Money deposit, fiat order attached, and the boot-cleanup error.
 * Unlike `isFiatVaultOnlyFailure` this alone proves nothing about the order
 * outcome — the caller must confirm settlement via `RampsController:getOrder`
 * (see `useEffectiveMoneyActivityStatus`) before suppressing the failure.
 *
 * @param tx - The Money deposit transaction meta.
 * @returns True when the tx qualifies for an order-settlement check.
 */
export function isRestartInterruptedFiatDeposit(tx: TransactionMeta): boolean {
  if (tx.status !== TransactionStatus.failed) {
    return false;
  }

  if (!isMoneyDepositTx(tx)) {
    return false;
  }

  if (!tx.metamaskPay?.fiat?.orderId) {
    return false;
  }

  const message = tx.error?.message;
  if (!message || !message.includes(STARTUP_INCOMPLETE_MARKER)) {
    return false;
  }

  return true;
}
