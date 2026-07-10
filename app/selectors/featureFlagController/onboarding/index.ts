import { createSelector } from 'reselect';
import {
  DEFAULT_FEATURE_FLAG_VALUES,
  FeatureFlagNames,
} from '../../../constants/featureFlags';
import { getFeatureFlagValue } from '../env';
import { selectRemoteFeatureFlags } from '..';

/**
 * LaunchDarkly key string for CI / static analysis (see `known-feature-flag-constants.ts`).
 */
export const ONBOARDING_INTEREST_QUESTIONNAIRE_ENABLED_FLAG_NAME =
  FeatureFlagNames.onboardingInterestQuestionnaireEnabled;

export const DEFAULT_ONBOARDING_INTEREST_QUESTIONNAIRE_ENABLED = Boolean(
  DEFAULT_FEATURE_FLAG_VALUES[
    FeatureFlagNames.onboardingInterestQuestionnaireEnabled
  ] === true ||
    DEFAULT_FEATURE_FLAG_VALUES[
      FeatureFlagNames.onboardingInterestQuestionnaireEnabled
    ] === 'treatment',
);

const isOnboardingInterestQuestionnaireRemoteEnabled = (
  rawFlag: unknown,
): boolean => rawFlag === true || rawFlag === 'treatment';

export const selectOnboardingInterestQuestionnaireEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const rawFlag =
      remoteFeatureFlags[
        FeatureFlagNames.onboardingInterestQuestionnaireEnabled
      ] ??
      DEFAULT_FEATURE_FLAG_VALUES[
        FeatureFlagNames.onboardingInterestQuestionnaireEnabled
      ];

    const remoteValue = isOnboardingInterestQuestionnaireRemoteEnabled(rawFlag);

    return getFeatureFlagValue(
      process.env.MM_ONBOARDING_INTEREST_QUESTIONNAIRE_ENABLED,
      remoteValue,
    );
  },
);
