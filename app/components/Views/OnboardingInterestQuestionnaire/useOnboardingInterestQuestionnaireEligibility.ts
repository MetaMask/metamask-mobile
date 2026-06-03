import { useCallback } from 'react';
import { generateDeterministicRandomNumber } from '@metamask/remote-feature-flag-controller';
import { useAnalytics } from '../../hooks/useAnalytics/useAnalytics';

const TREATMENT_ROLLOUT_THRESHOLD = 0.25;

/**
 * Returns a function that resolves whether the onboarding interest questionnaire
 * should be shown. Uses {@link generateDeterministicRandomNumber} from
 * `@metamask/remote-feature-flag-controller` so the same analytics id maps to a
 * stable value in [0, 1) (aligned with other app sampling, e.g. network RPC tracking).
 *
 * LaunchDarkly flag for this experiment: `tradeTMCU722AbtestOnboardingInterestQuestion`.
 *
 * Call once per onboarding flow after metrics are enabled and an analytics ID exists.
 */
export function useOnboardingInterestQuestionnaireEligibility(): () => Promise<boolean> {
  const { getAnalyticsId } = useAnalytics();

  return useCallback(async () => {
    const metaMetricsId = await getAnalyticsId();
    if (!metaMetricsId) {
      return false;
    }

    const threshold = generateDeterministicRandomNumber(metaMetricsId);

    return threshold < TREATMENT_ROLLOUT_THRESHOLD;
  }, [getAnalyticsId]);
}
