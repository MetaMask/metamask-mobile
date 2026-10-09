import { useQuery } from '@tanstack/react-query';
import { PRODUCT_TYPES } from '@metamask/subscription-controller';
import { useSelector } from 'react-redux';
import Engine from '../../../../../../core/Engine';
import {
  selectCanonicalProfileId,
  selectIsSignedIn,
} from '../../../../../../selectors/identity';
import { selectIsUnlocked } from '../../../../../../selectors/keyringController';
import { selectSeedlessOnboardingUserId } from '../../../../../../selectors/seedlessOnboardingController';

const MONEY_ACCOUNT_PLUS_TRIAL_ELIGIBILITY_QUERY_KEY = [
  'SubscriptionController:isUserEligibleForTrial',
  PRODUCT_TYPES.MONEY_ACCOUNT_PLUS,
] as const;

/**
 * Cache key for a Plus trial eligibility check.
 *
 * Profile id and social-login user id are part of the key so a social login
 * or account switch cannot read another user's cached result.
 *
 * @param canonicalProfileId - Profile for the live wallet, when known.
 * @param socialLoginUserId - Seedless onboarding user id, when the wallet is
 * socially authenticated.
 * @returns The React Query key for this user.
 */
export function getMoneyAccountPlusTrialEligibilityQueryKey(
  canonicalProfileId: string | undefined,
  socialLoginUserId: string | undefined,
) {
  return [
    ...MONEY_ACCOUNT_PLUS_TRIAL_ELIGIBILITY_QUERY_KEY,
    canonicalProfileId || null,
    socialLoginUserId || null,
  ] as const;
}

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
 * copy stays hidden until the controller returns true for this user. A
 * disabled query still exposes cached `data`, so eligibility also requires
 * the check to be enabled for the current profile.
 *
 * @returns Whether the user is eligible for a Money Account Plus trial.
 */
export function useMoneyAccountPlusTrialEligibility(): MoneyAccountPlusTrialEligibility {
  const isSignedIn = useSelector(selectIsSignedIn);
  const isUnlocked = Boolean(useSelector(selectIsUnlocked));
  const canonicalProfileId = useSelector(selectCanonicalProfileId);
  const socialLoginUserId = useSelector(selectSeedlessOnboardingUserId);
  const canRequestEligibility =
    isSignedIn && isUnlocked && Boolean(canonicalProfileId);

  const { data } = useQuery({
    queryKey: getMoneyAccountPlusTrialEligibilityQueryKey(
      canonicalProfileId,
      socialLoginUserId,
    ),
    queryFn: () =>
      Engine.context.SubscriptionController.isUserEligibleForTrial(
        PRODUCT_TYPES.MONEY_ACCOUNT_PLUS,
      ),
    enabled: canRequestEligibility,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  return {
    isEligibleForTrial: canRequestEligibility && data === true,
  };
}
