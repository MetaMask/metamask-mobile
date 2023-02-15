/* global driver */
import cucumberJson from 'wdio-cucumberjs-json-reporter';
import { Given, When, Then } from '@wdio/cucumber-framework';

let startTimer;
let stopTimer;

When(/^I kill then app$/, async () => {
  await driver.closeApp();
});

When(/^I relaunch the app$/, async () => {
  await driver.startActivity('io.metamask.qa', 'io.metamask.MainActivity');
  startTimer = new Date().getTime();
});

Then(/^the app should launch within x seconds$/, async () => {
  stopTimer = new Date().getTime();
  const result = stopTimer - startTimer;
  cucumberJson.attach(`Milliseconds: ${result}`);
});

Given(/^the app is launched$/, async () => {
  startTimer = new Date().getTime();
});
