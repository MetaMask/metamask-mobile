import {
  hasTransactionType,
  TransactionMeta,
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import { hexToNumber, isStrictHexString } from '@metamask/utils';
import ReduxService from '../../../../redux';
import { selectIsSignedIn } from '../../../../../selectors/identity';
import { selectIsUnlocked } from '../../../../../selectors/keyringController';
import { selectPrimaryMoneyAccount } from '../../../../../selectors/moneyAccountController';
import { selectMoneyAccountPlusSubscription } from '../../../../../selectors/subscriptionController';
import { ensureError } from '../../../../../util/errorUtils';
import Logger from '../../../../../util/Logger';
import Engine from '../../../../Engine';
import { retrySubscriptionChargeAfterDeposit } from '../retry-subscription-charge-after-deposit';

const LOG_OPTIONS = {
  tags: {
    feature: 'pro-subscription',
    operation: 'retry_subscription_charge_on_deposit',
  },
} as const;

let isRetrying = false;
let hasPendingDeposit = false;
let pendingDepositMinBlock: number | undefined;

/**
 * Confirmed receipts store `blockNumber` as a 0x-prefixed hex quantity. A
 * missing or non-hex value omits `minBlock` so the balance re-read still runs.
 *
 * @param blockNumber - Block number from the confirmed transaction meta.
 * @returns The block as a number, or undefined when it cannot be used.
 */
function toConfirmedMinBlock(
  blockNumber: string | undefined,
): number | undefined {
  if (!blockNumber || !isStrictHexString(blockNumber)) {
    return undefined;
  }
  return hexToNumber(blockNumber);
}

/**
 * A stuck crypto subscription can be funded from either deposit path.
 * Pro Hub add funds creates a `moneyAccountDeposit`. The checkout shortfall
 * top-up creates a `membershipSubscription`. Either confirmation can land
 * the balance the retry needs. Whether the charge is actually retried is
 * decided later by the subscription status gates.
 *
 * @param transactionMeta - Confirmed transaction from TransactionController.
 * @returns Whether this confirmation can fund a subscription charge retry.
 */
function isDepositEligibleForSubscriptionRetry(
  transactionMeta: TransactionMeta,
): boolean {
  return (
    transactionMeta.status === TransactionStatus.confirmed &&
    hasTransactionType(transactionMeta, [
      TransactionType.moneyAccountDeposit,
      TransactionType.membershipSubscription,
    ])
  );
}

/**
 * Keeps the newest confirmed block. A later deposit is the one the balance
 * read has to catch up to.
 *
 * @param minBlock - Confirmed deposit block, when the transaction has one.
 */
function rememberPendingDeposit(minBlock: number | undefined): void {
  if (
    !hasPendingDeposit ||
    (minBlock !== undefined &&
      (pendingDepositMinBlock === undefined ||
        minBlock > pendingDepositMinBlock))
  ) {
    pendingDepositMinBlock = minBlock;
  }
  hasPendingDeposit = true;
}

function clearPendingDeposit(): void {
  hasPendingDeposit = false;
  pendingDepositMinBlock = undefined;
}

/**
 * Runs the charge retry for the current subscription, then refreshes it.
 * A deposit that lands while a retry is in flight is queued and retried
 * once that call finishes, because the in-flight read may predate it. The
 * refresh runs after the flag is cleared, including when the charge is
 * skipped.
 *
 * @param minBlock - Confirmed deposit block, when the transaction has one.
 */
async function retryCurrentSubscriptionCharge(
  minBlock: number | undefined,
): Promise<void> {
  if (isRetrying) {
    rememberPendingDeposit(minBlock);
    return;
  }

  isRetrying = true;

  try {
    const state = ReduxService.store.getState();
    const subscription = selectMoneyAccountPlusSubscription(state);
    const moneyAccountAddress = selectPrimaryMoneyAccount(state)?.address;

    if (subscription && moneyAccountAddress) {
      await retrySubscriptionChargeAfterDeposit(
        subscription,
        moneyAccountAddress,
        minBlock,
      );
    }
  } catch (error) {
    Logger.error(
      ensureError(
        error,
        'handleTransactionConfirmedForSubscriptionChargeRetry',
      ),
      LOG_OPTIONS,
    );
  } finally {
    isRetrying = false;
  }

  try {
    await Engine.context.SubscriptionController.getSubscriptions();
  } catch (error) {
    Logger.error(
      ensureError(
        error,
        'handleTransactionConfirmedForSubscriptionChargeRetry',
      ),
      LOG_OPTIONS,
    );
  }

  if (!hasPendingDeposit) {
    return;
  }

  const latestState = ReduxService.store.getState();
  if (!selectIsUnlocked(latestState) || !selectIsSignedIn(latestState)) {
    return;
  }

  const nextMinBlock = pendingDepositMinBlock;
  clearPendingDeposit();
  await retryCurrentSubscriptionCharge(nextMinBlock);
}

/**
 * Retries a stuck crypto subscription charge after a Money deposit or membership
 * top-up confirms.
 *
 * Subscribed from Engine for the life of TransactionController. Signed-out
 * sessions are ignored. A deposit that confirms while the wallet is locked is
 * held until unlock, and one that confirms during an in-flight retry is held
 * until that retry finishes, because this event is not replayed. Failures are logged only; the membership banner keeps its Add
 * funds action. Every eligible unlocked deposit refreshes subscriptions
 * afterwards, including when the charge is skipped.
 *
 * @param transactionMeta - Confirmed transaction from TransactionController.
 */
export async function handleTransactionConfirmedForSubscriptionChargeRetry(
  transactionMeta: TransactionMeta,
): Promise<void> {
  if (!isDepositEligibleForSubscriptionRetry(transactionMeta)) {
    return;
  }

  const state = ReduxService.store.getState();
  const minBlock = toConfirmedMinBlock(transactionMeta.blockNumber);

  if (!selectIsUnlocked(state)) {
    if (selectIsSignedIn(state)) {
      rememberPendingDeposit(minBlock);
    }
    return;
  }

  if (!selectIsSignedIn(state)) {
    return;
  }

  await retryCurrentSubscriptionCharge(minBlock);
}

/**
 * Runs a deposit retry that was skipped because the wallet was locked.
 * A signed-out session drops the queued deposit so it cannot charge another
 * account. Subscribed from Engine on `KeyringController:unlock`.
 */
export async function handleUnlockForSubscriptionChargeRetry(): Promise<void> {
  if (!hasPendingDeposit || isRetrying) {
    return;
  }

  const state = ReduxService.store.getState();
  if (!selectIsUnlocked(state) || !selectIsSignedIn(state)) {
    if (!selectIsSignedIn(state)) {
      clearPendingDeposit();
    }
    return;
  }

  const minBlock = pendingDepositMinBlock;
  clearPendingDeposit();
  await retryCurrentSubscriptionCharge(minBlock);
}
