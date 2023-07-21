import { Then, When } from '@wdio/cucumber-framework';

When(/^I background the app for (\d+) seconds$/, async (time) => {
  await driver.background(time);
});
