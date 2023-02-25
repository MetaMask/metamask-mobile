import cucumberJson from 'wdio-cucumberjs-json-reporter';
import { Given, When, Then } from '@wdio/cucumber-framework';

let startTimer;
let stopTimer;

Then(/^the app should launch within x seconds$/, async () => {
  stopTimer = new Date().getTime();
  const result = stopTimer - startTimer;
  cucumberJson.attach(`Milliseconds: ${result}`);
});

Given(/^the app is launched$/, async () => {
  startTimer = new Date().getTime();
});

When(/^the timer starts running$/, async () => {
  startTimer = new Date().getTime();
});
