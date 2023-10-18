'use strict';

import CreatePasswordView from '../pages/Onboarding/CreatePasswordView';
import OnboardingView from '../pages/Onboarding/OnboardingView';
import OnboardingCarouselView from '../pages/Onboarding/OnboardingCarouselView';

import MetaMetricsOptIn from '../pages/Onboarding/MetaMetricsOptInView';

import { acceptTermOfUse } from '../viewHelper';
import Assertions from '../utils/Assertions';
const PASSWORD = '12345678';

describe('Example test using POM', () => {
  it('should be able to opt-in of the onboarding-wizard', async () => {
    await OnboardingCarouselView.tapOnGetStartedButton();
    await OnboardingView.tapCreateWallet();

    await MetaMetricsOptIn.isVisible();
    await MetaMetricsOptIn.tapAgreeButton();
    await acceptTermOfUse();

    await CreatePasswordView.isVisible();
  });
  it('should be able to create a new wallet', async () => {
    await CreatePasswordView.enterPassword(PASSWORD);
    await CreatePasswordView.reEnterPassword(PASSWORD);
    await CreatePasswordView.tapIUnderstandCheckBox();

    const createPasswordButton = await CreatePasswordView.createPasswordButton;
    await Assertions.checkIfVisible(createPasswordButton);

    await CreatePasswordView.tapCreatePasswordButton();
  });
});
