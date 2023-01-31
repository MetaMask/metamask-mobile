/* global driver */
import { Then, When } from '@wdio/cucumber-framework';
import RequestTokenScreen from '../screen-objects/RequestTokenScreen';

Then(/^I tap on the close payment request icon/, async () => {
  const timeout = 1000;
  await driver.pause(timeout);
  await RequestTokenScreen.closePaymentRequest();
});

When(/^I type "([^"]*)?" into the Request Amount field/, async (amount) => {
  await RequestTokenScreen.typeAmountInRequest(amount);
});

Then(
  /^I type "([^"]*)?" in the Search Assets field/,
  async (seaarchRequest) => {
    const timeout = 1000;
    await driver.pause(timeout);
    await RequestTokenScreen.inputSearchRequestField(seaarchRequest);
  },
);

Then(/^I tap to navigate back from request view/, async () => {
  const timeout = 1000;
  await driver.pause(timeout);
  await RequestTokenScreen.tapBackButtonOnSearch();
});

Then(/^I am taken back to the Request Search view/, async () => {
  await RequestTokenScreen.searchResultsIsVisible();
});

Then(/^I close the request screen/, async () => {
  await RequestTokenScreen.closeQRPayment();
  await RequestTokenScreen.closePaymentRequest();
});
