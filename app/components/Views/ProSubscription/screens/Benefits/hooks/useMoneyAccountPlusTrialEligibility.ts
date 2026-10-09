import { useQuery } from '@tanstack/react-query';
import { PRODUCT_TYPES } from '@metamask/subscription-controller';
import { useSelector } from 'react-redux';
import Engine from '../../../../../../core/Engine';
import { selectIsSignedIn } from '../../../../../../selectors/identity';
import { selectIsUnlocked } from '../../../../../../selectors/keyringController';

export const MONEY_ACCOUNT_PLUS_TRIAL_ELIGIBILITY_QUERY_KEY = [
  'SubscriptionController:isUserEligibleForTrial',
  PRODUCT_TYPES.MONEY_ACCOUNT_PLUS,
] as const;

export interface MoneyAccountPlusTrialEligibility {
  /** True only after the controller reports this user can start a Plus trial. */
  isEligibleForTrial: boolean;
}

/**
 * Asks SubscriptionController whether this user can start a Money Account
 * Plus trial. Shield and Plus use different rules, and Plus also requires
 * social login, so the screen must not infer eligibility from pricing
 * `trialPeriodDays` or `trialedProducts` alone.
 *
 * Fails closed while the check is in flight, disabled, or rejected, so trial
 * copy stays hidden until the controller returns true.
 *
 * @returns Whether the user is eligible for a Money Account Plus trial.
 */
export function useMoneyAccountPlusTrialEligibility(): MoneyAccountPlusTrialEligibility {
  const isSignedIn = useSelector(selectIsSignedIn);
  const isUnlocked = Boolean(useSelector(selectIsUnlocked));

  const { data } = useQuery({
    queryKey: MONEY_ACCOUNT_PLUS_TRIAL_ELIGIBILITY_QUERY_KEY,
    queryFn: () =>
      Engine.context.SubscriptionController.isUserEligibleForTrial(
        PRODUCT_TYPES.MONEY_ACCOUNT_PLUS,
      ),
    enabled: isSignedIn && isUnlocked,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  return {
    isEligibleForTrial: data === true,
  };
}
