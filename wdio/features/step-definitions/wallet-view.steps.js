/* global driver */
import {When, Then } from '@wdio/cucumber-framework';
import WalletMainScreen from '../screen-objects/WalletMainScreen.js';
import SendScreen from '../screen-objects/SendScreen';

Then(/^On the Main Wallet view I tap "([^"]*)?"/, async (text) => {
    const timeout = 1500;
    await driver.pause(timeout);
    await SendScreen.tapOnText(text); // we need to rework this. Either have all test actions follow this pattern or not
});

When(/^I tap burger icon/, async () => {
    const setTimeout = 1500; //added to run on physical device
    await driver.pause(setTimeout);  //added to run on physical device
    await WalletMainScreen.tapBurgerIcon();
});

When(/^I tap Import Tokens/, async () => {
    const setTimeout = 1500; //added to run on physical device
    await driver.pause(setTimeout);  //added to run on physical device
    await WalletMainScreen.tapImportTokensButton();
});

When(/^I tap NFTs Tab/, async () => {
    const setTimeout = 1500; 
    await driver.pause(setTimeout);  
    await WalletMainScreen.tapNFTTab();
});

Then(/^I tap Import NFTs/, async () => {
    const setTimeout = 1500; 
    await driver.pause(setTimeout);  
    await WalletMainScreen.tapImportNFTButton();
});

Then(/^I tap on the navbar network title button/, async () => {
    await WalletMainScreen.tapNetworkNavBar();
});

Then(/^I am on the wallet screen/, async () => {
    await driver.pause(2000);  
    await WalletMainScreen.isVisible();
});
Then(/^I am on the wallet view/, async () => {
    await WalletMainScreen.isMainWalletViewVisible();
});
