/* global driver */
import { Given, When, Then } from '@wdio/cucumber-framework';
import SendScreen from '../screen-objects/SendScreen';
import WalletMainScreen from '../../features/screen-objects/WalletMainScreen';


Then(/^I enter a contract address (.*) in the sender's input box/, async (address) => {
    await SendScreen.typeAddressInSendAddressField(address);
});

Then(/^I tap on button with text "([^"]*)?"/, async (address) => {
    await WalletMainScreen.tapSendIcon(address);
});


