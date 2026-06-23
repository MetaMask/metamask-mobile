import {
  ONBOARDING_INTEREST_QUESTIONNAIRE_ENABLED_FLAG_NAME,
  selectOnboardingInterestQuestionnaireEnabled,
} from '.';
import {
  DEFAULT_FEATURE_FLAG_VALUES,
  FeatureFlagNames,
} from '../../../constants/featureFlags';

describe('Onboarding interest questionnaire feature flag selector', () => {
  it('exposes the LaunchDarkly flag key for registry alignment', () => {
    expect(ONBOARDING_INTEREST_QUESTIONNAIRE_ENABLED_FLAG_NAME).toBe(
      'onboarding_interest_questionnaire_enabled',
    );
    expect(FeatureFlagNames.onboardingInterestQuestionnaireEnabled).toBe(
      'onboarding_interest_questionnaire_enabled',
    );
  });

  const originalEnv = process.env.MM_ONBOARDING_INTEREST_QUESTIONNAIRE_ENABLED;

  beforeEach(() => {
    delete process.env.MM_ONBOARDING_INTEREST_QUESTIONNAIRE_ENABLED;
  });

  afterAll(() => {
    if (originalEnv === undefined) {
      delete process.env.MM_ONBOARDING_INTEREST_QUESTIONNAIRE_ENABLED;
      return;
    }

    process.env.MM_ONBOARDING_INTEREST_QUESTIONNAIRE_ENABLED = originalEnv;
  });

  it('returns the default value when the remote flag is missing', () => {
    const result = selectOnboardingInterestQuestionnaireEnabled.resultFunc({});

    expect(result).toBe(
      DEFAULT_FEATURE_FLAG_VALUES[
        FeatureFlagNames.onboardingInterestQuestionnaireEnabled
      ] === true ||
        DEFAULT_FEATURE_FLAG_VALUES[
          FeatureFlagNames.onboardingInterestQuestionnaireEnabled
        ] === 'treatment',
    );
  });

  it('returns true when the remote flag is treatment', () => {
    const result = selectOnboardingInterestQuestionnaireEnabled.resultFunc({
      [FeatureFlagNames.onboardingInterestQuestionnaireEnabled]: 'treatment',
    });

    expect(result).toBe(true);
  });

  it('returns false when the remote flag is control', () => {
    const result = selectOnboardingInterestQuestionnaireEnabled.resultFunc({
      [FeatureFlagNames.onboardingInterestQuestionnaireEnabled]: 'control',
    });

    expect(result).toBe(false);
  });

  it('returns the remote boolean flag value when present', () => {
    const result = selectOnboardingInterestQuestionnaireEnabled.resultFunc({
      [FeatureFlagNames.onboardingInterestQuestionnaireEnabled]: true,
    });

    expect(result).toBe(true);
  });

  it('allows the local env var to force enable', () => {
    process.env.MM_ONBOARDING_INTEREST_QUESTIONNAIRE_ENABLED = 'true';

    const result = selectOnboardingInterestQuestionnaireEnabled.resultFunc({
      [FeatureFlagNames.onboardingInterestQuestionnaireEnabled]: 'control',
    });

    expect(result).toBe(true);
  });

  it('allows the local env var to force disable', () => {
    process.env.MM_ONBOARDING_INTEREST_QUESTIONNAIRE_ENABLED = 'false';

    const result = selectOnboardingInterestQuestionnaireEnabled.resultFunc({
      [FeatureFlagNames.onboardingInterestQuestionnaireEnabled]: 'treatment',
    });

    expect(result).toBe(false);
  });
});
