import { Given, When, Then } from '@wdio/cucumber-framework';
import NetworkListModal from '../screen-objects/Modals/NetworkListModal';

When(/^I tap the Test Network toggle$/, async () => {
  await NetworkListModal.tapTestNetworkSwitch();
});
Given(/^the Network List Modal is Displayed$/, async () => {
  await NetworkListModal.waitForDisplayed();
});

Then(/^the Test Network toggle value should be "([^"]*)"$/, async (value) => {
  await NetworkListModal.isTestNetworkToggle(value);
});

Then(
  /^Ethereum Main Network should be the only Network displayed$/,
  async () => {
    await NetworkListModal.isNetworksDisplayed(1);
  },
);
