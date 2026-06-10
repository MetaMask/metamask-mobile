import {
  type TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import type { Hex } from '@metamask/utils';

import Engine from '../../../../Engine';
import Logger from '../../../../../util/Logger';
import { hasTransactionType } from '../../../../../components/Views/confirmations/utils/transaction';

/**
 * Mobile-side extension of `MetamaskPayMetadata`.
 *
 * `originatingAddress` records which user account initiated a Money Account
 * transaction. This is needed because EIP-7702 delegated deposits set
 * `txParams.from` to the batch executor / smart account, not the user's
 * EOA. The ephemeral `accountOverride` in `TransactionPayController` is
 * deleted on transaction finalization, so we persist the address here on
 * `TransactionMeta.metamaskPay` (which survives finalization and app
 * restarts).
 *
 * Once `@metamask/transaction-controller` adds `originatingAddress` to the
 * core `MetamaskPayMetadata` type, this local extension can be removed.
 */
export type MetamaskPayWithOrigin = NonNullable<
  TransactionMeta['metamaskPay']
> & {
  originatingAddress?: Hex;
};

const MONEY_ACCOUNT_TRANSACTION_TYPES: readonly TransactionType[] = [
  TransactionType.moneyAccountDeposit,
  TransactionType.moneyAccountWithdraw,
];

/**
 * Writes `originatingAddress` onto `transactionMeta.metamaskPay` so the
 * originating user account is available after transaction finalization.
 *
 * Must be called AFTER `TransactionPayController.syncTransaction` has
 * finalized `metamaskPay` (e.g., on `transactionSubmitted`), because
 * quote syncing does a full replacement of `metamaskPay` and would wipe
 * any earlier writes.
 *
 * Reads `accountOverride` from `TransactionPayController` state (still
 * available before finalization deletes it on confirmed/dropped/failed).
 */
export function handleTransactionSubmittedForOriginatingAddress(
  transaction: TransactionMeta,
): void {
  if (!hasTransactionType(transaction, MONEY_ACCOUNT_TRANSACTION_TYPES)) {
    return;
  }

  const { TransactionController, TransactionPayController } = Engine.context;

  const accountOverride = TransactionPayController.state.transactionData[
    transaction.id
  ]?.accountOverride as Hex | undefined;

  if (!accountOverride) {
    return;
  }

  const txMeta = TransactionController.state.transactions.find(
    (tx) => tx.id === transaction.id,
  );

  if (!txMeta) {
    return;
  }

  try {
    TransactionController.updateTransaction(
      {
        ...txMeta,
        metamaskPay: {
          ...txMeta.metamaskPay,
          originatingAddress: accountOverride,
        } as TransactionMeta['metamaskPay'],
      },
      'Persist originating account for money transaction',
    );
  } catch (error) {
    Logger.error(
      error as Error,
      'Failed to persist originating address on transaction',
    );
  }
}
