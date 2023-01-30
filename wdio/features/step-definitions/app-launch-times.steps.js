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
});

Given(/^the app is launched$/, async () => {
  startTimer = new Date().getTime();
});

When(/^the timer starts running$/, async () => {
  startTimer = new Date().getTime();
});
