import { Then, When } from '@wdio/cucumber-framework';
import WelcomeScreen from '../screen-objects/Onboarding/OnboardingCarousel';

When(
  /^I attempt to dismiss Terms of Use without agreeing to terms$/,
  async () => {
    await WelcomeScreen.clickGetStartedButton();
  },
);

Then(/^the Welcome Screen is displayed$/, async () => {
  await WelcomeScreen.waitForScreenToDisplay();
});
