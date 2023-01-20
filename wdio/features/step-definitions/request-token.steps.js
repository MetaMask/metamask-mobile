/* global driver */

import { Given, Then, When } from '@wdio/cucumber-framework';
import RequestTokenScreen from '../../features/screen-objects/RequestTokenScreen';
import WalletMainScreen from '../screen-objects/WalletMainScreen';

Then(/^I tap on the close payment request icon/, async () => {
    const timeout = 1000;
    await driver.pause(timeout);
    await RequestTokenScreen.closePaymentRequest();
});

When(/^I type "([^"]*)?" into the Request Amount field/, async (amount) => {
   await RequestTokenScreen.typeAmountInRequest(amount);
});

Then(/^I type "([^"]*)?" in the Search Assets field/, async (searchReq) => {
    const timeout = 1000;
    await driver.pause(timeout);
    await RequestTokenScreen.inputSearchRequestField(searchReq);
});

Then(/^I tap on the back button on the request view/, async () => {
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
