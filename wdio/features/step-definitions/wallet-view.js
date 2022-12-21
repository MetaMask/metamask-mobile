import { Given, When, Then } from '@wdio/cucumber-framework';
import Gestures from '../helpers/Gestures.js';
import WalletMainScreen from '../screen-objects/WalletMainScreen.js';

When(/^I tap burger icon/, async () => {
    const setTimeout = 1500; //added to run on physical device
    await driver.pause(setTimeout);  //added to run on physical device
    await WalletMainScreen.tapBurgerIcon();
});

When(/^I tap Import Tokens/, async () => {
    const setTimeout = 1500; //added to run on physical device
    await driver.pause(setTimeout);  //added to run on physical device
    await Gestures.tapTextByXpath("Import Tokens");
});

