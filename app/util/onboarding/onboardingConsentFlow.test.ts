import Routes from '../../constants/navigation/Routes';
import {
  navigateOnboardingConsentFlow,
  navigateToNextOnboardingConsentStep,
  navigateToOnboardingMarketingConsent,
} from './onboardingConsentFlow';

describe('onboardingConsentFlow', () => {
  const navigation = {
    navigate: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('starts the consent sequence on the push notifications screen', () => {
    navigateOnboardingConsentFlow(navigation, {
      kind: 'srp',
      accountType: 'metamask',
    });

    expect(navigation.navigate).toHaveBeenCalledWith(
      Routes.ONBOARDING.PUSH_NOTIFICATIONS,
      {
        kind: 'srp',
        accountType: 'metamask',
      },
    );
  });

  it('continues SRP users to usage data after push', () => {
    navigateToNextOnboardingConsentStep(navigation, { kind: 'srp' });

    expect(navigation.navigate).toHaveBeenCalledWith(
      Routes.ONBOARDING.OPTIN_METRICS,
      { kind: 'srp' },
    );
  });

  it('continues social users to marketing after push', () => {
    navigateToNextOnboardingConsentStep(navigation, { kind: 'social' });

    expect(navigation.navigate).toHaveBeenCalledWith(
      Routes.ONBOARDING.MARKETING_CONSENT,
      { kind: 'social' },
    );
  });

  it('navigates SRP users to marketing after usage data opt-in', () => {
    navigateToOnboardingMarketingConsent(navigation, {
      kind: 'srp',
      accountType: 'imported',
    });

    expect(navigation.navigate).toHaveBeenCalledWith(
      Routes.ONBOARDING.MARKETING_CONSENT,
      {
        kind: 'srp',
        accountType: 'imported',
      },
    );
  });
});
