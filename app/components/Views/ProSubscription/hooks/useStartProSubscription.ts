import { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { BigNumber } from 'bignumber.js';
import {
  PRODUCT_TYPES,
  SubscriptionDelegationServiceErrorMessage,
} from '@metamask/subscription-controller';
import { TransactionType } from '@metamask/transaction-controller';
import {
  bytesToHex,
  isStrictHexString,
  isValidHexAddress,
  type Hex,
} from '@metamask/utils';
import { v4 as uuidv4, parse as uuidParse } from 'uuid';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import { isUserRejectedError } from '../../../../util/errorHandling/isUserRejectedError';
import { selectPrimaryMoneyAccount } from '../../../../selectors/moneyAccountController';
import { selectMoneyAccountVaultConfig } from '../../../../selectors/featureFlagController/moneyAccount';
import { MUSD_DECIMALS } from '../../../UI/Earn/constants/musd';
import { useMoneyAccountDeposit } from '../../../UI/Money/hooks/useMoneyAccount';
import { strings } from '../../../../../locales/i18n';
import type { SelectedPlusPlan } from '../screens/Benefits/utils/getSelectedPlusPlan';
import { waitForMembershipTopUp } from '../utils/waitForMembershipTopUp';

const PAYMENT_UNAVAILABLE_ERROR =
  'Money Account subscription payment is unavailable';
const SUBSCRIPTION_IN_PROGRESS_ERROR =
  'Money Account subscription is already starting';

function isHexAddress(value: string | undefined): value is Hex {
  return isStrictHexString(value) && isValidHexAddress(value);
}

/**
 * Converts an mUSD base-unit shortfall into a USD amount string for MM Pay.
 * Rounds up to cents so the funded balance is never below the required amount.
 *
 * @param balance - Current mUSD balance in base units (6 decimals).
 * @param requiredBalance - Required mUSD balance in base units (6 decimals).
 * @returns Shortfall in USD as a decimal string with up to 2 fractional digits.
 */
function getTopUpAmountUsd(balance: string, requiredBalance: string): string {
  return new BigNumber(requiredBalance)
    .minus(balance)
    .shiftedBy(-MUSD_DECIMALS)
    .decimalPlaces(2, BigNumber.ROUND_UP)
    .toFixed();
}

type InitiateDeposit = ReturnType<
  typeof useMoneyAccountDeposit
>['initiateDeposit'];

/**
 * Opens a membership-subscription top-up for the mUSD shortfall and waits
 * until that batch confirms. Subscribes before the deposit is submitted, and
 * cancels the waiter if deposit setup fails.
 *
 * @param initiateDeposit - Money Account deposit starter.
 * @param balance - Current mUSD balance in base units.
 * @param requiredBalance - Required mUSD balance in base units.
 */
async function topUpMembershipShortfall(
  initiateDeposit: InitiateDeposit,
  balance: string,
  requiredBalance: string,
): Promise<void> {
  const batchId = bytesToHex(new Uint8Array(uuidParse(uuidv4())));
  const { promise, cancel } = waitForMembershipTopUp(batchId);

  try {
    await initiateDeposit({
      batchId,
      amount: getTopUpAmountUsd(balance, requiredBalance),
      transactionType: TransactionType.membershipSubscription,
      forceBottomSheet: true,
    });
  } catch (error) {
    cancel();
    throw error;
  }

  await promise;
}

const SUBSCRIPTION_START_ERROR_LOG_OPTIONS = {
  tags: {
    feature: 'pro-subscription',
  },
  context: {
    name: 'start_pro_subscription',
    data: {
      paymentType: 'crypto',
      cryptoAuthMethod: 'delegation',
    },
  },
} as const;

const MAX_ERROR_CAUSE_DEPTH = 4;

/**
 * Dev logging prints `error.message` and drops `error.cause`.
 * `SubscriptionServiceError` keeps the API status and body on `cause`.
 *
 * @param cause - Nested error from the failed subscription request.
 * @param depth - How many cause levels have already been walked.
 * @returns A single-line description of the underlying error.
 */
function describeErrorCause(cause: unknown, depth = 0): string | undefined {
  if (depth >= MAX_ERROR_CAUSE_DEPTH || cause == null) {
    return undefined;
  }

  if (!(cause instanceof Error)) {
    return typeof cause === 'string' ? cause : undefined;
  }

  const httpStatus =
    'httpStatus' in cause &&
    (typeof cause.httpStatus === 'number' ||
      typeof cause.httpStatus === 'string')
      ? `, httpStatus: ${cause.httpStatus}`
      : '';
  const summary = `${cause.name}: ${cause.message}${httpStatus}`;
  const nestedCause = describeErrorCause(cause.cause, depth + 1);
  return nestedCause ? `${summary} | cause: ${nestedCause}` : summary;
}

/**
 * Builds the error passed to the logger so the Metro warning includes the
 * underlying request failure.
 *
 * @param error - Error caught while starting the subscription.
 * @returns The original error, or a copy whose message includes the cause.
 */
function formatErrorForLog(error: Error): Error {
  const causeDetails = describeErrorCause(error.cause);
  if (!causeDetails) {
    return error;
  }

  const errorWithCause = new Error(`${error.message} | cause: ${causeDetails}`);
  errorWithCause.name = error.name;
  return errorWithCause;
}

interface SubscriptionPayment {
  payerAddress: Hex;
  chainId: Hex;
}

/**
 * Requires a Money Account payer and vault chain id before checkout starts.
 *
 * @param payerAddress - Primary Money Account address.
 * @param chainId - Vault chain id from the Money Account feature flag.
 * @returns Validated payer address and chain id.
 */
function requireSubscriptionPayment(
  payerAddress: string | undefined,
  chainId: string | undefined,
): SubscriptionPayment {
  if (!isHexAddress(payerAddress) || !isStrictHexString(chainId)) {
    throw new Error(PAYMENT_UNAVAILABLE_ERROR);
  }

  return { payerAddress, chainId };
}

/**
 * Maps a failed subscription start to the message shown on the join screen.
 *
 * @param error - Error caught while starting the subscription.
 * @returns Localized join or insufficient-balance copy.
 */
function getStartSubscriptionErrorMessage(error: Error): string {
  const isInsufficientBalanceError =
    error.message ===
    SubscriptionDelegationServiceErrorMessage.InsufficientBalance;

  return strings(
    isInsufficientBalanceError
      ? 'pro_subscription.insufficient_balance'
      : 'pro_subscription.join_error',
  );
}

/**
 * Logs a failed subscription start, updates the join error when the hook is
 * still mounted, and rethrows so the caller can stop the flow. User
 * rejections are not logged; they clear any previous join error.
 *
 * @param error - Failure from balance check, top-up, or delegation start.
 * @param isMounted - Whether the hook is still mounted.
 * @param setMessage - Join-screen error setter.
 */
function reportStartSubscriptionError(
  error: unknown,
  isMounted: boolean,
  setMessage: (message: string | undefined) => void,
): never {
  const loggedError = error instanceof Error ? error : new Error(String(error));

  if (isUserRejectedError(loggedError, loggedError.message)) {
    if (isMounted) {
      setMessage(undefined);
    }
    throw loggedError;
  }

  const causeDetails = describeErrorCause(loggedError.cause);
  Logger.error(formatErrorForLog(loggedError), {
    ...SUBSCRIPTION_START_ERROR_LOG_OPTIONS,
    ...(causeDetails ? { extras: { cause: causeDetails } } : {}),
  });
  if (isMounted) {
    setMessage(getStartSubscriptionErrorMessage(loggedError));
  }
  throw loggedError;
}

export interface UseStartProSubscriptionResult {
  startSubscription: (plan: SelectedPlusPlan) => Promise<void>;
  isSubmitting: boolean;
  errorMessage: string | undefined;
}

/**
 * Starts a Money Account Plus subscription using the client-owned checkout
 * flow from MetaMask/core#10666:
 * 1. `checkMoneyAccountBalance`
 * 2. If short, open a `membershipSubscription` MetaMask Pay top-up for the
 * shortfall and wait for confirmation
 * 3. Call `SubscriptionDelegationService:startSubscriptionWithDelegation`
 *
 * When the balance is already sufficient, consent UI is skipped for now
 * (still WIP). `skipApproval: true` remains until
 * `@metamask/subscription-controller` is bumped past the core PR that removed
 * the nested approval contract.
 *
 * On success, returns to the caller. Benefits shows the confirmation screen,
 * and that screen opens Pro Hub. The delegation start refreshes subscriptions
 * before it resolves, so later screens see the subscriber.
 *
 * @returns Subscription start callback and its request state.
 */
export function useStartProSubscription(): UseStartProSubscriptionResult {
  const moneyAccount = useSelector(selectPrimaryMoneyAccount);
  const vaultConfig = useSelector(selectMoneyAccountVaultConfig);
  const { initiateDeposit } = useMoneyAccountDeposit();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();
  const isMountedRef = useRef(true);
  const isSubmittingRef = useRef(false);

  useEffect(
    () => () => {
      isMountedRef.current = false;
    },
    [],
  );

  const startSubscription = useCallback(
    async (plan: SelectedPlusPlan): Promise<void> => {
      if (isSubmittingRef.current) {
        throw new Error(SUBSCRIPTION_IN_PROGRESS_ERROR);
      }

      isSubmittingRef.current = true;
      setIsSubmitting(true);
      setErrorMessage(undefined);

      try {
        const { payerAddress, chainId } = requireSubscriptionPayment(
          moneyAccount?.address,
          vaultConfig?.chainId,
        );

        const { SubscriptionDelegationService } = Engine.context;
        const subscriptionParams = {
          product: PRODUCT_TYPES.MONEY_ACCOUNT_PLUS,
          recurringInterval: plan.interval,
          payerAddress,
        };
        const { hasSufficientBalance, balance, requiredBalance } =
          await SubscriptionDelegationService.checkMoneyAccountBalance(
            subscriptionParams,
          );

        if (!hasSufficientBalance) {
          await topUpMembershipShortfall(
            initiateDeposit,
            balance,
            requiredBalance,
          );
        }

        await SubscriptionDelegationService.startSubscriptionWithDelegation({
          ...subscriptionParams,
          chainId,
          // Removed once @metamask/subscription-controller is bumped past
          // MetaMask/core#10666 (approval moved fully to the client).
          skipApproval: true,
        });
      } catch (error) {
        reportStartSubscriptionError(
          error,
          isMountedRef.current,
          setErrorMessage,
        );
      } finally {
        isSubmittingRef.current = false;
        if (isMountedRef.current) {
          setIsSubmitting(false);
        }
      }
    },
    [initiateDeposit, moneyAccount?.address, vaultConfig?.chainId],
  );

  return { startSubscription, isSubmitting, errorMessage };
}
