/* global driver */
import { When, Then } from '@wdio/cucumber-framework';
import WalletMainScreen from '../screen-objects/WalletMainScreen.js';
import AccountListComponent from '../screen-objects/AccountListComponent';
import CommonScreen from '../screen-objects/CommonScreen';

Then(/^On the Main Wallet view I tap "([^"]*)?"/, async (text) => {
  const timeout = 1500;
  await driver.pause(timeout);
  await CommonScreen.tapOnText(text);
});

When(/^I tap burger icon/, async () => {
  const setTimeout = 1500; //added to run on physical device
  await driver.pause(setTimeout); //added to run on physical device
  await WalletMainScreen.tapBurgerIcon();
});

When(/^I tap Import Tokens/, async () => {
  const setTimeout = 1500; //added to run on physical device
  await driver.pause(setTimeout); //added to run on physical device
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
  await WalletMainScreen.isVisible();
});
Then(/^I am on the wallet view/, async () => {
  await WalletMainScreen.isMainWalletViewVisible();
});
When(/^I tap on the Identicon/, async () => {
  // should be in a commons-step file
  await driver.pause(setTimeout);
  await WalletMainScreen.tapIdenticon();
});

When(/^the account list should be visible/, async () => {
  // should be in a common-step file
  await driver.pause(3000);
  await AccountListComponent.isComponentDisplayed();
});

When(/^the account list should not be visible/, async () => {
  // should be in a common-step file
  await driver.pause(3000);
  await AccountListComponent.isComponentNotDisplayed();
});

When(/^I dismiss the account list/, async () => {
  await driver.pause(2500);
  await driver.touchPerform([{ action: 'tap', options: { x: 100, y: 200 } }]);
});
