import { Given, When, Then } from '@wdio/cucumber-framework';
import WalletMainScreen from '../screen-objects/WalletMainScreen.js';

When(/^I tap burger icon/, async () => {
    await WalletMainScreen.tapBurgerIcon();
});

Then(/^I tap on the navbar network title button/, async () => {
    await WalletMainScreen.tapNetworkNavBar();
});
    