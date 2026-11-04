import { MoneyAccountApiDataService } from '@metamask/money-account-api-data-service';
import { MoneyAccountBalanceService } from '@metamask/money-account-balance-service';
import {
  INVOICE_PAYMENT_STATUSES,
  PAYMENT_TYPES,
  PRODUCT_TYPES,
  SUBSCRIPTION_STATUSES,
  type Subscription,
  type SubscriptionCryptoPaymentMethod,
  type SubscriptionPaymentMethod,
} from '@metamask/subscription-controller';
import type { Hex } from '@metamask/utils';
import Engine from '../../Engine';
import { ensureError } from '../../../../util/errorUtils';
import { calculateExponentialRetryDelay } from '../../../../util/exponential-retry';
import Logger from '../../../../util/Logger';

// shortcut: suffixes must match app/components/UI/Money/queryKeys.ts, move those constants out of UI if they change.
const MONEY_ACCOUNT_BALANCE_QUERY_KEY = `${MoneyAccountBalanceService.name}:getMoneyAccountBalance`;
const MONEY_ACCOUNT_POSITIONS_QUERY_KEY = `${MoneyAccountApiDataService.name}:fetchPositions`;

/**
 * Same budget as the post-confirm Money balance refresh. The first read can
 * still be the pre-deposit balance: the RPC query is cached for a minute, and
 * `checkMoneyAccountBalance` does not ask for a fresh read.
 */
const MAX_BALANCE_READ_ATTEMPTS = 4;
const BALANCE_RETRY_BASE_DELAY_MS = 500;
const BALANCE_RETRY_MAX_DELAY_MS = 4000;

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

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
 * Drops the cached Money balance so the next read hits the chain or API.
 * `fetchBalanceWithFallback` without options can serve the RPC query for up
 * to a minute after it was filled.
 *
 * @param address - Money Account address, in the casing the balance query uses.
 */
async function bustMoneyBalanceSourceCaches(address: string): Promise<void> {
  await Promise.all([
    Engine.controllerMessenger.call(
      'MoneyAccountBalanceService:invalidateQueries',
      {
        queryKey: [MONEY_ACCOUNT_BALANCE_QUERY_KEY, address],
      },
    ),
    Engine.controllerMessenger.call(
      'MoneyAccountApiDataService:invalidateQueries',
      {
        queryKey: [MONEY_ACCOUNT_POSITIONS_QUERY_KEY, address.toLowerCase()],
      },
    ),
  ]);
}

/**
 * Reads the Money Account total in mUSD base units, bypassing the cached
 * balance. `minBlock` makes an API result that is still behind the confirmed
 * deposit fall back to RPC.
 *
 * @param payerAddress - Money Account that pays the Plus charge.
 * @param minBlock - Confirmed deposit block, when the transaction has one.
 * @returns Total balance in mUSD base units.
 */
async function readFreshMoneyAccountTotalBalance(
  payerAddress: Hex,
  minBlock: number | undefined,
): Promise<bigint> {
  await bustMoneyBalanceSourceCaches(payerAddress);
  const balance = await Engine.controllerMessenger.call(
    'MoneyAccountBalanceService:fetchBalanceWithFallback',
    payerAddress,
    {
      fresh: true,
      ...(minBlock !== undefined && { minBlock }),
    },
  );
  return BigInt(balance.totalBalance);
}

/**
 * Whether the Money Account can cover the Plus charge.
 *
 * Trusts `checkMoneyAccountBalance` when it already reports enough funds.
 * An insufficient result is not final: the confirm event can beat the
 * balance cache, so this re-reads with cache bypass until the deposit shows
 * up or the retry budget runs out. A balance that is still short after that
 * is a real shortfall and returns false. A read that keeps failing throws.
 *
 * @param balanceRequest - Product, interval, and payer for the balance check.
 * @param balanceRequest.product - Plus product the charge is for.
 * @param balanceRequest.recurringInterval - Billing interval of the subscription.
 * @param balanceRequest.payerAddress - Money Account that pays the charge.
 * @param minBlock - Confirmed deposit block, when the transaction has one.
 * @returns Whether the fresh balance covers the charge.
 */
async function waitForSufficientPlusBalance(
  balanceRequest: {
    product: typeof PRODUCT_TYPES.MONEY_ACCOUNT_PLUS;
    recurringInterval: Subscription['interval'];
    payerAddress: Hex;
  },
  minBlock: number | undefined,
): Promise<boolean> {
  let requiredBalance: bigint | undefined;
  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_BALANCE_READ_ATTEMPTS; attempt++) {
    if (attempt > 0) {
      await sleep(
        calculateExponentialRetryDelay(
          attempt - 1,
          BALANCE_RETRY_BASE_DELAY_MS,
          BALANCE_RETRY_MAX_DELAY_MS,
        ),
      );
    }

    try {
      if (requiredBalance === undefined) {
        const snapshot =
          await Engine.context.SubscriptionDelegationService.checkMoneyAccountBalance(
            balanceRequest,
          );
        requiredBalance = BigInt(snapshot.requiredBalance);
        if (snapshot.hasSufficientBalance) {
          return true;
        }
      }

      const totalBalance = await readFreshMoneyAccountTotalBalance(
        balanceRequest.payerAddress,
        minBlock,
      );
      lastError = undefined;
      if (totalBalance >= requiredBalance) {
        return true;
      }
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError) {
    throw lastError;
  }

  return false;
}

/**
 * Retries the Plus crypto charge after a Money deposit confirms.
 *
 * Sends a credential-less `updatePaymentMethod` so the API reuses the stored
 * delegation. Does nothing when the subscription is not retryable, billing
 * cycles are missing, or the Money Account balance is still insufficient
 * after the post-confirm balance reads. Logs API failures and does not throw.
 *
 * @param subscription - Current Money Account Plus subscription.
 * @param moneyAccountAddress - Primary Money Account address.
 * @param minBlock - Confirmed deposit block, when the transaction has one.
 */
export async function retryPlusChargeAfterDeposit(
  subscription: Subscription,
  moneyAccountAddress: string,
  minBlock?: number,
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
    const hasSufficientBalance = await waitForSufficientPlusBalance(
      {
        product: PRODUCT_TYPES.MONEY_ACCOUNT_PLUS,
        recurringInterval: subscription.interval,
        payerAddress,
      },
      minBlock,
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
