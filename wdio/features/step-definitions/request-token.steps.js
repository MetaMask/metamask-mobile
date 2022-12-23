/* global driver */

import { When, Then } from '@wdio/cucumber-framework';
import RequestTokenScreen from '../../features/screen-objects/RequestTokenScreen.object';

When(/^I type "([^"]*)?" into the Request Amount field/, async (amount) => {
    RequestTokenScreen.typeAmountInRequest(amount);
});


Then(/^(.*) "([^"]*)?" is displayed on (.*) (.*) view/, async (elementType, textElement, type, screen) => {
    const timeout = 1000;
    await driver.pause(timeout);
    await RequestTokenScreen.isTextElementDisplayed(textElement);
    // eslint-disable-next-line no-console
    console.log('On screen ' + type + ' ' + screen);
});

Then(/^(.*) "([^"]*)?" is not displayed on (.*) (.*) view/, async (elementType, textElement, type, screen) => {
    const timeout = 1000;
    await driver.pause(timeout);
    await RequestTokenScreen.isTextElementNotDisplayed(textElement);
    // eslint-disable-next-line no-console
    console.log('On screen ' + elementType + '' + type + ' ' + screen);

});

Then(/^I tap on the close payment request icon/, async () => {
    const timeout = 1000;
    await driver.pause(timeout);
    await RequestTokenScreen.closePaymentRequest();

});

Then(/^I type "([^"]*)?" in the Search Assets field/, async (searchReq) => {
    const timeout = 1000;
    await driver.pause(timeout);
    await RequestTokenScreen.inputSearchRequestField(searchReq);
});

