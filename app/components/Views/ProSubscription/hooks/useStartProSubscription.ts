import { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  CRYPTO_AUTH_METHODS,
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
import { selectPrimaryMoneyAccount } from '../../../../selectors/moneyAccountController';
import { strings } from '../../../../../locales/i18n';
import type { SelectedPlusPlan } from '../screens/Benefits/utils/getSelectedPlusPlan';
import { getMoneyAccountPlusCryptoPayment } from '../screens/Benefits/utils/getMoneyAccountPlusCryptoPayment';

const PAYMENT_UNAVAILABLE_ERROR =
  'Money Account subscription payment is unavailable';
const SUBSCRIPTION_IN_PROGRESS_ERROR =
  'Money Account subscription is already starting';

function isHexAddress(value: string | undefined): value is Hex {
  return (
    value !== undefined && isStrictHexString(value) && isValidHexAddress(value)
  );
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

export interface UseStartProSubscriptionResult {
  startSubscription: (plan: SelectedPlusPlan) => Promise<void>;
  isSubmitting: boolean;
  errorMessage: string | undefined;
}

/**
 * Starts a Money Account Plus subscription using a periodic transfer
 * delegation prepared by SubscriptionDelegationService.
 *
 * @returns Subscription start callback and its request state.
 */
export function useStartProSubscription(): UseStartProSubscriptionResult {
  const moneyAccount = useSelector(selectPrimaryMoneyAccount);
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
        if (!isHexAddress(payerAddress)) {
          throw new Error(PAYMENT_UNAVAILABLE_ERROR);
        }

        await Engine.context.SubscriptionController.getSubscriptions();
        const { trialedProducts } = Engine.context.SubscriptionController.state;
        const isTrialRequested =
          (plan.trialPeriodDays ?? 0) > 0 &&
          !trialedProducts.includes(PRODUCT_TYPES.MONEY_ACCOUNT_PLUS);
        const { delegationHash } =
          await Engine.context.SubscriptionDelegationService.prepareDelegation({
            product: PRODUCT_TYPES.MONEY_ACCOUNT_PLUS,
            recurringInterval: plan.interval,
            payerAddress,
            isTrialRequested,
            checkBalance: true,
            skipChompInteractions: true,
          });

        const storedDelegations =
          await Engine.context.AuthenticatedUserStorageService.listDelegations();
        const preparedDelegation = storedDelegations.find(
          ({ metadata }) =>
            metadata.delegationHash.toLowerCase() ===
            delegationHash.toLowerCase(),
        );
        const chainId = preparedDelegation?.metadata.chainIdHex;
        const tokenSymbol = preparedDelegation?.metadata.tokenSymbol;
        const tokenAddress = preparedDelegation?.metadata.tokenAddress;
        const pricing = Engine.context.SubscriptionController.state.pricing;
        const payment = chainId
          ? getMoneyAccountPlusCryptoPayment(pricing, chainId)
          : undefined;
        if (
          !preparedDelegation ||
          !payment ||
          payment.tokenSymbol !== tokenSymbol ||
          payment.tokenAddress.toLowerCase() !== tokenAddress?.toLowerCase()
        ) {
          throw new Error(PAYMENT_UNAVAILABLE_ERROR);
        }

        await Engine.context.SubscriptionController.startSubscriptionWithCrypto(
          {
            products: [PRODUCT_TYPES.MONEY_ACCOUNT_PLUS],
            isTrialRequested,
            recurringInterval: plan.interval,
            billingCycles: 1,
            chainId: preparedDelegation.metadata.chainIdHex,
            payerAddress,
            tokenSymbol: preparedDelegation.metadata.tokenSymbol,
            cryptoAuthMethod: CRYPTO_AUTH_METHODS.DELEGATION,
            delegationHash,
          },
        );
      } catch (error) {
        const loggedError =
          error instanceof Error ? error : new Error(String(error));
        Logger.error(loggedError, SUBSCRIPTION_START_ERROR_LOG_OPTIONS);
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
    [moneyAccount?.address],
  );

  return { startSubscription, isSubmitting, errorMessage };
}
