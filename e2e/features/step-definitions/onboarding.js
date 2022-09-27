import { Given, When, Then } from '@wdio/cucumber-framework';
import WelcomePage from '../screen-objects/WelcomeScreen.js';


Given(/^I just installed MetaMask on my (.*)/, async (device) => {
  console.log("🚀 ~ file: onboarding.js ~ line 6 ~ Given ~ device", device)
  /** This is automatically done by the automation framework **/
});

When(/^I tap to open MetaMask mobile app/, async () => {
  /** This is automatically done by the automation framework **/
});

Then(/^MetaMask animated loading logo is displayed/, async () => {
  await WelcomePage.verifySplashScreen();
});

Then(/^(.*) screen is displayed after logo/, async (title) => {
  await WelcomePage.verifyCarouselOneTitle(title);
  await WelcomePage.swipeNextSlide();
  await WelcomePage.verifyCarouselTwoTitle();
});
