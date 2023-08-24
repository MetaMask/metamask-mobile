import cucumberJson from 'wdio-cucumberjs-json-reporter';
import { Given, When, Then } from '@wdio/cucumber-framework';

let startTimer;
let stopTimer;

Then(/^the app should launch within "([^"]*)?" seconds$/, async (time) => {
  stopTimer = new Date().getTime();
  const launchTime = stopTimer - startTimer;
  console.log(`The Launch time is: ${launchTime}`);

  await expect(launchTime).toBeLessThan(time * 1000);
  cucumberJson.attach(`Milliseconds: ${launchTime}`);
  await driver.pause(100);
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
