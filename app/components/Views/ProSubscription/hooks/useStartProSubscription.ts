import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import {
  PRODUCT_TYPES,
  SubscriptionDelegationServiceErrorMessage,
} from '@metamask/subscription-controller';
import {
  isStrictHexString,
  isValidHexAddress,
  type Hex,
} from '@metamask/utils';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import Routes from '../../../../constants/navigation/Routes';
import type { AppStackNavigationProp } from '../../../../core/NavigationService/types';
import { selectPrimaryMoneyAccount } from '../../../../selectors/moneyAccountController';
import { selectMoneyAccountVaultConfig } from '../../../../selectors/featureFlagController/moneyAccount';
import { strings } from '../../../../../locales/i18n';
import type { SelectedPlusPlan } from '../screens/Benefits/utils/getSelectedPlusPlan';

const PAYMENT_UNAVAILABLE_ERROR =
  'Money Account subscription payment is unavailable';
const SUBSCRIPTION_IN_PROGRESS_ERROR =
  'Money Account subscription is already starting';

function isHexAddress(value: string | undefined): value is Hex {
  return isStrictHexString(value) && isValidHexAddress(value);
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

export interface UseStartProSubscriptionResult {
  startSubscription: (plan: SelectedPlusPlan) => Promise<void>;
  isSubmitting: boolean;
  errorMessage: string | undefined;
}

/**
 * Starts a Money Account Plus subscription using
 * `SubscriptionDelegationService:startSubscriptionWithDelegation`.
 *
 * Passes `skipApproval: true` because mobile does not yet host the
 * `subscription_delegation` confirmation / MM Pay funding UI. The caller is
 * responsible for consent; this hook still balance-checks first so the
 * insufficient-balance error mapping stays intact.
 *
 * On success, replaces the current screen with Pro Hub. The delegation start
 * refreshes subscriptions before it resolves, so the hub sees the subscriber.
 *
 * @returns Subscription start callback and its request state.
 */
export function useStartProSubscription(): UseStartProSubscriptionResult {
  const navigation = useNavigation<AppStackNavigationProp>();
  const moneyAccount = useSelector(selectPrimaryMoneyAccount);
  const vaultConfig = useSelector(selectMoneyAccountVaultConfig);
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
        const payerAddress = moneyAccount?.address;
        const chainId = vaultConfig?.chainId;
        if (!isHexAddress(payerAddress) || !isStrictHexString(chainId)) {
          throw new Error(PAYMENT_UNAVAILABLE_ERROR);
        }

        const { SubscriptionDelegationService } = Engine.context;
        const subscriptionParams = {
          product: PRODUCT_TYPES.MONEY_ACCOUNT_PLUS,
          recurringInterval: plan.interval,
          payerAddress,
        };
        const { hasSufficientBalance } =
          await SubscriptionDelegationService.checkMoneyAccountBalance(
            subscriptionParams,
          );
        if (!hasSufficientBalance) {
          throw new Error(
            SubscriptionDelegationServiceErrorMessage.InsufficientBalance,
          );
        }

        await SubscriptionDelegationService.startSubscriptionWithDelegation({
          ...subscriptionParams,
          chainId,
          // Mobile does not host the subscription_delegation confirmation UI yet.
          skipApproval: true,
        });

        if (isMountedRef.current) {
          navigation.replace(Routes.PRO_HUB.ROOT);
        }
      } catch (error) {
        const loggedError =
          error instanceof Error ? error : new Error(String(error));
        const causeDetails = describeErrorCause(loggedError.cause);
        Logger.error(formatErrorForLog(loggedError), {
          ...SUBSCRIPTION_START_ERROR_LOG_OPTIONS,
          ...(causeDetails ? { extras: { cause: causeDetails } } : {}),
        });
        if (isMountedRef.current) {
          const isInsufficientBalanceError =
            loggedError.message ===
            SubscriptionDelegationServiceErrorMessage.InsufficientBalance;
          setErrorMessage(
            strings(
              isInsufficientBalanceError
                ? 'pro_subscription.insufficient_balance'
                : 'pro_subscription.join_error',
            ),
          );
        }
        throw loggedError;
      } finally {
        isSubmittingRef.current = false;
        if (isMountedRef.current) {
          setIsSubmitting(false);
        }
      }
    },
    [moneyAccount?.address, navigation, vaultConfig?.chainId],
  );

  return { startSubscription, isSubmitting, errorMessage };
}
