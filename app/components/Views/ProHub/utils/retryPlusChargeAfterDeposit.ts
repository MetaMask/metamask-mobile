import {
  INVOICE_PAYMENT_STATUSES,
  PAYMENT_TYPES,
  PRODUCT_TYPES,
  SUBSCRIPTION_STATUSES,
  type Subscription,
  type SubscriptionCryptoPaymentMethod,
  type SubscriptionPaymentMethod,
} from '@metamask/subscription-controller';
import Engine from '../../../../core/Engine';
import { ensureError } from '../../../../util/errorUtils';
import Logger from '../../../../util/Logger';

const LOG_OPTIONS = {
  tags: {
    feature: 'pro-subscription',
    operation: 'retry_plus_charge_after_deposit',
  },
} as const;

function isCryptoPaymentMethod(
  paymentMethod: SubscriptionPaymentMethod,
): paymentMethod is SubscriptionCryptoPaymentMethod {
  return paymentMethod.type === PAYMENT_TYPES.byCrypto;
}

function hasFailedLastInvoice(subscription: Subscription): boolean {
  return subscription.lastInvoice?.status === INVOICE_PAYMENT_STATUSES.FAILED;
}

/**
 * Whether a Money Account Plus subscription can be retried after a deposit,
 * matching the subscription API retry gates.
 *
 * Requires crypto payment from the primary Money Account and no period-end
 * cancellation. Paused subscriptions can retry immediately. Past-due
 * subscriptions, and active ones with a crypto payment error, can retry only
 * when the latest invoice is FAILED.
 *
 * @param subscription - Current Plus subscription, when one exists.
 * @param moneyAccountAddress - Primary Money Account address.
 * @returns Whether a credential-less payment-method retry is allowed.
 */
export function isPlusChargeRetryable(
  subscription: Subscription | undefined,
  moneyAccountAddress: string | undefined,
): boolean {
  if (!subscription || !moneyAccountAddress) {
    return false;
  }

  if (subscription.cancelAtPeriodEnd === true) {
    return false;
  }

  const { paymentMethod } = subscription;
  if (!isCryptoPaymentMethod(paymentMethod)) {
    return false;
  }

  if (
    paymentMethod.crypto.payerAddress.toLowerCase() !==
    moneyAccountAddress.toLowerCase()
  ) {
    return false;
  }

  if (subscription.status === SUBSCRIPTION_STATUSES.paused) {
    return true;
  }

  if (!hasFailedLastInvoice(subscription)) {
    return false;
  }

  if (subscription.status === SUBSCRIPTION_STATUSES.pastDue) {
    return true;
  }

  return (
    subscription.status === SUBSCRIPTION_STATUSES.active &&
    paymentMethod.crypto.error !== undefined
  );
}

/**
 * Retries the Plus crypto charge after a Money deposit confirms.
 *
 * Sends a credential-less `updatePaymentMethod` so the API reuses the stored
 * delegation. Does nothing when the subscription is not retryable, billing
 * cycles are missing, or the Money Account balance is still insufficient.
 * Logs API failures and does not throw.
 *
 * @param subscription - Current Money Account Plus subscription.
 * @param moneyAccountAddress - Primary Money Account address.
 */
export async function retryPlusChargeAfterDeposit(
  subscription: Subscription,
  moneyAccountAddress: string,
): Promise<void> {
  if (!isPlusChargeRetryable(subscription, moneyAccountAddress)) {
    return;
  }

  const { paymentMethod, billingCycles } = subscription;
  if (!isCryptoPaymentMethod(paymentMethod) || billingCycles === undefined) {
    return;
  }

  const { payerAddress, chainId, tokenSymbol } = paymentMethod.crypto;

  try {
    const { hasSufficientBalance } =
      await Engine.context.SubscriptionDelegationService.checkMoneyAccountBalance(
        {
          product: PRODUCT_TYPES.MONEY_ACCOUNT_PLUS,
          recurringInterval: subscription.interval,
          payerAddress,
        },
      );

    if (!hasSufficientBalance) {
      return;
    }

    await Engine.context.SubscriptionController.updatePaymentMethod({
      paymentType: PAYMENT_TYPES.byCrypto,
      subscriptionId: subscription.id,
      chainId,
      payerAddress,
      tokenSymbol,
      recurringInterval: subscription.interval,
      billingCycles,
    });
  } catch (error) {
    Logger.error(
      ensureError(error, 'retryPlusChargeAfterDeposit'),
      LOG_OPTIONS,
    );
  }
}
