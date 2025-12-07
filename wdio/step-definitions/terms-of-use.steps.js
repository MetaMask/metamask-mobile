import { When } from '@wdio/cucumber-framework';
import WelcomeScreen from '../screen-objects/Onboarding/OnboardingCarousel';

When(
  /^I attempt to dismiss Terms of Use without agreeing to terms$/,
  async () => {
    await WelcomeScreen.clickGetStartedButton();
  },
);
