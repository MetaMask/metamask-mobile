import { Given, When, Then } from '@wdio/cucumber-framework';
import WelcomePage from '../page-objects/WelcomePage.js';


Given(/^I have installed MetaMask mobile app on my device/, async () => {
  /** This is automatically done by the automation framework **/
});

When(/^I tap to open MetaMask mobile app/, async () => {
  /** This is automatically done by the automation framework **/
});

Then(/^MetaMask animated loading logo is displayed/, async () => {
  /** This is automatically done by the automation framework **/
});

Then(/^(.*) screen is displayed after logo/, async (title) => {
  await WelcomePage.verifyCarouselOneTitle(title);
  await WelcomePage.swipeCarouselRight();
});
