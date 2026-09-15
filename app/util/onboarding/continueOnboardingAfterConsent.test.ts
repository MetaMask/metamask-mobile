import Routes from '../../constants/navigation/Routes';
import { continueOnboardingAfterConsent } from './continueOnboardingAfterConsent';
import { markMetricsOptInUISeen } from '../metrics/metricsOptInUIUtils';
import { finalizeOnboardingCompletion } from './finalizeOnboardingCompletion';

jest.mock('../metrics/metricsOptInUIUtils', () => ({
  markMetricsOptInUISeen: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('./finalizeOnboardingCompletion', () => ({
  finalizeOnboardingCompletion: jest.fn(),
}));

describe('continueOnboardingAfterConsent', () => {
  const navigation = {
    navigate: jest.fn(),
    reset: jest.fn(),
  };
  const dispatch = jest.fn();
  const onContinue = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('navigates to the interest questionnaire when metrics are on and the questionnaire is eligible', async () => {
    await continueOnboardingAfterConsent({
      navigation,
      consentParams: { onContinue },
      accountType: 'metamask',
      shouldShowQuestionnaire: true,
      isMetricsOptedIn: true,
      isBasicFunctionalityEnabled: true,
      walletSetupAttributionProps: {},
      dispatch,
      needsQrProvisioning: false,
    });

    expect(navigation.navigate).toHaveBeenCalledWith(
      Routes.ONBOARDING.INTEREST_QUESTIONNAIRE,
      expect.objectContaining({
        onComplete: expect.any(Function),
        accountType: 'metamask',
      }),
    );
    expect(markMetricsOptInUISeen).not.toHaveBeenCalled();
  });

  it('resets to home when metrics are off even if the questionnaire is eligible', async () => {
    await continueOnboardingAfterConsent({
      navigation,
      consentParams: {},
      accountType: undefined,
      shouldShowQuestionnaire: true,
      isMetricsOptedIn: false,
      isBasicFunctionalityEnabled: true,
      walletSetupAttributionProps: {},
      dispatch,
      needsQrProvisioning: false,
    });

    expect(navigation.navigate).not.toHaveBeenCalled();
    expect(markMetricsOptInUISeen).toHaveBeenCalledTimes(1);
    expect(navigation.reset).toHaveBeenCalledWith({
      routes: [{ name: Routes.ONBOARDING.HOME_NAV }],
    });
  });

  it('calls onContinue after questionnaire onComplete', async () => {
    await continueOnboardingAfterConsent({
      navigation,
      consentParams: { onContinue },
      accountType: 'imported',
      shouldShowQuestionnaire: true,
      isMetricsOptedIn: true,
      isBasicFunctionalityEnabled: true,
      walletSetupAttributionProps: {},
      dispatch,
      needsQrProvisioning: false,
    });

    const onComplete = navigation.navigate.mock.calls[0][1]
      .onComplete as () => Promise<void>;
    await onComplete();

    expect(finalizeOnboardingCompletion).toHaveBeenCalled();
    expect(onContinue).toHaveBeenCalledTimes(1);
  });
});
