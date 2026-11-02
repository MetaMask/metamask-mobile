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
import { retryPlusChargeAfterDeposit } from '../../../../../components/Views/ProHub/utils/retryPlusChargeAfterDeposit';

const LOG_OPTIONS = {
  tags: {
    feature: 'pro-subscription',
    operation: 'retry_plus_charge_on_deposit',
  },
} as const;

let isRetrying = false;

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
 * A stuck Plus plan can be funded from either deposit path.
 * Pro Hub add funds creates a `moneyAccountDeposit`. The checkout shortfall
 * top-up creates a `membershipSubscription`. Either confirmation can land
 * the balance the retry needs. Whether the charge is actually retried is
 * decided later by the subscription status gates.
 *
 * @param transactionMeta - Confirmed transaction from TransactionController.
 * @returns Whether this confirmation can fund a Plus charge retry.
 */
function isDepositEligibleForPlusRetry(
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
 * Retries a stuck Plus crypto charge after a Money deposit or membership
 * top-up confirms.
 *
 * Subscribed from Engine for the life of TransactionController. Locked or
 * signed-out sessions and a retry already in flight are ignored. Failures
 * are logged only; the membership banner keeps its Add funds action.
 * Every eligible deposit refreshes subscriptions afterwards, including when
 * the charge is skipped, so Pro Hub sees a server-side status change. The
 * refresh runs after the in-flight flag is cleared.
 *
 * @param transactionMeta - Confirmed transaction from TransactionController.
 */
export async function handleTransactionConfirmedForPlusChargeRetry(
  transactionMeta: TransactionMeta,
): Promise<void> {
  if (!isDepositEligibleForPlusRetry(transactionMeta)) {
    return;
  }

  const state = ReduxService.store.getState();
  if (!selectIsUnlocked(state) || !selectIsSignedIn(state)) {
    return;
  }

  if (isRetrying) {
    return;
  }

  isRetrying = true;

  try {
    const subscription = selectMoneyAccountPlusSubscription(state);
    const moneyAccountAddress = selectPrimaryMoneyAccount(state)?.address;

    if (subscription && moneyAccountAddress) {
      await retryPlusChargeAfterDeposit(
        subscription,
        moneyAccountAddress,
        toConfirmedMinBlock(transactionMeta.blockNumber),
      );
    }
  } catch (error) {
    Logger.error(
      ensureError(error, 'handleTransactionConfirmedForPlusChargeRetry'),
      LOG_OPTIONS,
    );
  } finally {
    isRetrying = false;
  }

  try {
    await Engine.context.SubscriptionController.getSubscriptions();
  } catch (error) {
    Logger.error(
      ensureError(error, 'handleTransactionConfirmedForPlusChargeRetry'),
      LOG_OPTIONS,
    );
  }
}
