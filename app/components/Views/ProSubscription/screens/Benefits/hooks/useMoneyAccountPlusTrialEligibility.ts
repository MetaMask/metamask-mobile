import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PRODUCT_TYPES } from '@metamask/subscription-controller';
import { useSelector } from 'react-redux';
import Engine from '../../../../../../core/Engine';
import { SUBSCRIPTIONS_QUERY_KEY } from '../../../../../../components/hooks/useSubscriptions';
import { selectCanonicalProfileId } from '../../../../../../selectors/identity';
import { selectIsUnlocked } from '../../../../../../selectors/keyringController';
import { selectSeedlessOnboardingUserId } from '../../../../../../selectors/seedlessOnboardingController';
import { MONEY_ACCOUNT_PLUS_TRIAL_ELIGIBILITY_QUERY_KEY } from '../../../../../../components/hooks/moneyAccountPlusTrialEligibility';

/**
 * Cache key for a Plus trial eligibility check.
 *
 * The id is the social-login user when one exists, otherwise the profile id.
 * Plus eligibility follows social auth, and the profile id often arrives after
 * that login. Keeping it out of the key stops the plan cards from loading
 * again for the same user. A different social user, or a different profile
 * when there is no social user, still gets its own entry.
 *
 * @param identityId - Social-login user id, or the profile id when the wallet
 * is not socially authenticated.
 * @returns The React Query key for this user.
 */
export function getMoneyAccountPlusTrialEligibilityQueryKey(
  identityId: string | undefined,
) {
  return [
    ...MONEY_ACCOUNT_PLUS_TRIAL_ELIGIBILITY_QUERY_KEY,
    identityId || null,
  ] as const;
}

export interface MoneyAccountPlusTrialEligibility {
  /** True only after the controller reports this user can start a Plus trial. */
  isEligibleForTrial: boolean;
  /**
   * True while the trial check has no answer yet. This stays true when the
   * device is offline and the fetch is paused, so cached pricing cannot show
   * a paid plan before the trial answer arrives.
   */
  isLoading: boolean;
}

/**
 * Asks SubscriptionController whether this user can start a Money Account
 * Plus trial. Shield and Plus use different rules, and Plus also requires
 * social login, so the screen must not infer eligibility from pricing
 * `trialPeriodDays` or `trialedProducts` alone.
 *
 * Subscription history is loaded inside the query, before the eligibility
 * check. On a restored wallet `trialedProducts` is empty until that load
 * finishes, so asking earlier would answer "eligible" and the screen would
 * have to correct itself. The screen waits while the check is pending,
 * including when the device is offline and the fetch is paused, and then
 * shows the answer from this one check.
 *
 * The check runs when the wallet is unlocked and either the canonical profile
 * id or the social-login user id is present. Profile sync can lag behind
 * social login, and the controller decides Plus eligibility from social auth,
 * not from the profile id. A disabled query still exposes cached `data`, so
 * eligibility also requires the check to be enabled for the current identity.
 *
 * @returns Whether the user is eligible for a Money Account Plus trial, and
 * whether that answer is still loading.
 */
export function useMoneyAccountPlusTrialEligibility(): MoneyAccountPlusTrialEligibility {
  const isUnlocked = Boolean(useSelector(selectIsUnlocked));
  const canonicalProfileId = useSelector(selectCanonicalProfileId);
  const socialLoginUserId = useSelector(selectSeedlessOnboardingUserId);
  // Social auth decides Plus eligibility. Prefer that id so a profile id that
  // arrives later does not change the key and reload the plan cards.
  const trialIdentityId = socialLoginUserId || canonicalProfileId;
  const canRequestEligibility = isUnlocked && Boolean(trialIdentityId);
  const queryClient = useQueryClient();

  const { data, isPending } = useQuery({
    queryKey: getMoneyAccountPlusTrialEligibilityQueryKey(trialIdentityId),
    queryFn: async () => {
      // Join a subscriptions load already in flight, but never reuse a cached
      // one: the shared key has no user identity, so a fresh-looking entry
      // could hold another session's history.
      await queryClient.fetchQuery({
        queryKey: SUBSCRIPTIONS_QUERY_KEY,
        queryFn: () => Engine.context.SubscriptionController.getSubscriptions(),
        staleTime: 0,
      });
      return Engine.context.SubscriptionController.isUserEligibleForTrial(
        PRODUCT_TYPES.MONEY_ACCOUNT_PLUS,
      );
    },
    enabled: canRequestEligibility,
    // Keep the app default (retry: 2). retry: false treats one network blip
    // as "not eligible" and hides the trial.
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  return {
    isEligibleForTrial: canRequestEligibility && data === true,
    // isLoading is false while a fetch is paused offline. isPending stays
    // true until there is an answer, so the paid plan stays hidden.
    isLoading: canRequestEligibility && isPending,
  };
}
