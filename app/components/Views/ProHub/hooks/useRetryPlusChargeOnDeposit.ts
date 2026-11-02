import { useEffect, useRef } from 'react';
import {
  hasTransactionType,
  TransactionMeta,
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import Engine from '../../../../core/Engine';
import ReactQueryService from '../../../../core/ReactQueryService';
import { store } from '../../../../store';
import { selectIsSignedIn } from '../../../../selectors/identity';
import { selectIsUnlocked } from '../../../../selectors/keyringController';
import { selectPrimaryMoneyAccount } from '../../../../selectors/moneyAccountController';
import { selectMoneyAccountPlusSubscription } from '../../../../selectors/subscriptionController';
import { ensureError } from '../../../../util/errorUtils';
import Logger from '../../../../util/Logger';
import { SUBSCRIPTIONS_QUERY_KEY } from '../../../hooks/useSubscriptions';
import { retryPlusChargeAfterDeposit } from '../utils/retryPlusChargeAfterDeposit';

const LOG_OPTIONS = {
  tags: {
    feature: 'pro-subscription',
    operation: 'retry_plus_charge_on_deposit',
  },
} as const;

/**
 * A stuck Plus plan can be funded from either deposit path.
 * Pro Hub add funds creates a `moneyAccountDeposit`. The checkout shortfall
 * top-up creates a `membershipSubscription`. Either confirmation can land
 * the balance the retry needs. Whether the charge is actually retried is
 * decided later by the subscription status gates.
 */
function isDepositEligibleForPlusRetry(tx: TransactionMeta): boolean {
  return (
    tx.status === TransactionStatus.confirmed &&
    hasTransactionType(tx, [
      TransactionType.moneyAccountDeposit,
      TransactionType.membershipSubscription,
    ])
  );
}

/**
 * After a Money deposit or membership top-up confirms on-chain, retries a
 * stuck Plus crypto charge when the subscription API allows it, then
 * refreshes subscriptions so Pro Hub banners update.
 *
 * Locked or signed-out sessions and concurrent deposits are ignored (one
 * in-flight retry at a time). Failures are logged only; the membership
 * banner keeps its Add funds CTA.
 */
export function useRetryPlusChargeOnDeposit(): void {
  const isRetryingRef = useRef(false);

  useEffect(() => {
    const handleTransactionConfirmed = async (tx: TransactionMeta) => {
      if (!isDepositEligibleForPlusRetry(tx)) {
        return;
      }

      const state = store.getState();
      if (!selectIsUnlocked(state) || !selectIsSignedIn(state)) {
        return;
      }

      if (isRetryingRef.current) {
        return;
      }

      isRetryingRef.current = true;

      try {
        const subscription = selectMoneyAccountPlusSubscription(state);
        const moneyAccountAddress = selectPrimaryMoneyAccount(state)?.address;

        if (subscription && moneyAccountAddress) {
          await retryPlusChargeAfterDeposit(subscription, moneyAccountAddress);
        }
      } catch (error) {
        Logger.error(
          ensureError(error, 'useRetryPlusChargeOnDeposit'),
          LOG_OPTIONS,
        );
      } finally {
        await ReactQueryService.queryClient.invalidateQueries({
          queryKey: SUBSCRIPTIONS_QUERY_KEY,
        });
        isRetryingRef.current = false;
      }
    };

    Engine.controllerMessenger.subscribe(
      'TransactionController:transactionConfirmed',
      handleTransactionConfirmed,
    );

    return () => {
      Engine.controllerMessenger.unsubscribe(
        'TransactionController:transactionConfirmed',
        handleTransactionConfirmed,
      );
    };
  }, []);
}
