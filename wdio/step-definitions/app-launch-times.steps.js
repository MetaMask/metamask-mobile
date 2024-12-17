import cucumberJson from 'wdio-cucumberjs-json-reporter';
import { Given, When, Then } from '@wdio/cucumber-framework';
import WelcomeScreen from '../screen-objects/Onboarding/OnboardingCarousel';
import LoginScreen from '../screen-objects/LoginScreen';
import WalletMainScreen from '../screen-objects/WalletMainScreen.js';

let startTimer;
let stopTimer;
let loginViewTime;
let walletViewToAppearTime;
let total;
Then(/^the app start time should not exceed "([^"]*)?" milliseconds$/, async (time) => {
    await WelcomeScreen.isGetLaunchDurationDisplayed();

    const launchDurationElement = await WelcomeScreen.getLaunchDuration();
    const launchDurationString = await launchDurationElement.getText();

    const launchDuration = Number(launchDurationString);
    console.log(`MetaMask App Start Time is: ${launchDuration}`);
    cucumberJson.attach(`App Start Time - Milliseconds: ${launchDuration}`);

    await expect(launchDuration).toBeLessThan(Number(time));
});


Then(/^The Login screen should be visible in "([^"]*)?" seconds$/, async (time) => {
  await LoginScreen.isLoginScreenVisible();

  stopTimer = new Date().getTime();
  const launchTime = stopTimer - startTimer;
  console.log(`The time it takes the login view to appear is: ${loginViewTime}`);
  loginViewTime = launchTime
  await expect(loginViewTime).toBeLessThan(time * 1000);
  cucumberJson.attach(`The time it takes the login view to appear in Milliseconds is: ${loginViewTime}`);
});
Then(/^The timer starts running after I tap the login button$/, async () => {
  await LoginScreen.tapUnlockButton();
  startTimer = new Date().getTime();
});


Then(/^The wallet view appears in "([^"]*)?" seconds$/, async (time) => {
  await WalletMainScreen.isMainWalletViewVisible();

  stopTimer = new Date().getTime();
  walletViewToAppearTime = stopTimer - startTimer;
  console.log(`The time it takes the wallet view to appear is: ${walletViewToAppearTime}`);

  await expect(walletViewToAppearTime).toBeLessThan(time * 1000);
  cucumberJson.attach(`The time it takes the login view to appear in Milliseconds is: ${walletViewToAppearTime}`);
});

When(/^The total times are displayed$/, async () => {
  total = walletViewToAppearTime + loginViewTime
  cucumberJson.attach(`The total time: login view + wallet view in Milliseconds is: ${total}`);

});

Given(/^the app is launched$/, async () => {
  startTimer = new Date().getTime();
});

When(/^the timer starts running$/, async () => {
  startTimer = new Date().getTime();
});

When(/^I background the app for (\d+) seconds$/, async (time) => {
  await driver.background(time);
});

When(/^the app is move to the foreground$/, async () => {
  // Action performed automatically by Appium
  // Step added to enhance clarity and ease of understanding
});
