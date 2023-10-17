import { Given, Then, When } from '@wdio/cucumber-framework';
import WalletMainScreen from '../screen-objects/WalletMainScreen.js';
import AccountListComponent from '../screen-objects/AccountListComponent';
import CommonScreen from '../screen-objects/CommonScreen';
import TabBarModal from '../screen-objects/Modals/TabBarModal';
import WalletActionModal from '../screen-objects/Modals/WalletActionModal';

Then(/^On the Main Wallet view I tap "([^"]*)?"/, async (text) => {
  const timeout = 1500;
  await driver.pause(timeout);
  await CommonScreen.tapOnText(text);
});

When(/^I tap Import Tokens/, async () => {
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
  const setTimeout = 1500;
  await driver.pause(setTimeout);
  await WalletMainScreen.tapIdenticon();
});

When(/^the account list should be visible/, async () => {
  // should be in a common-step file
  await driver.pause(3000);
  await AccountListComponent.isComponentDisplayed();
});

When(/^I long press to remove "([^"]*)"/, async (accountName) => {
  // should be in a common-step file
  await driver.pause(3000);
  await CommonScreen.longTapOnText(accountName);
  await driver.acceptAlert();
  await driver.pause(3000);
});

When(/^the account list should not be visible/, async () => {
  // should be in a common-step file
  await driver.pause(3000);
  await AccountListComponent.isComponentNotDisplayed();
});

When(/^I dismiss the account list/, async () => {
  await AccountListComponent.isComponentDisplayed();
  await WalletMainScreen.tapIdenticon();
  await AccountListComponent.isComponentNotDisplayed();
});
Then(/^Wallet view is displayed$/, async () => {
  await WalletMainScreen.isMainWalletViewVisible();
});

Given(/^On the Main Wallet view I tap on the Send Action$/, async () => {
  await CommonScreen.checkNoNotification();
  await TabBarModal.tapActionButton();
  await WalletActionModal.tapSendButton();
});

Then(/^I open the account actions$/, async () => {
  await WalletMainScreen.tapAccountActions();
});

Then(/^I press show private key$/, async () => {
  await WalletMainScreen.tapShowPrivateKey();
});

Then(/^I press share address$/, async () => {
  await WalletMainScreen.tapShareAddress();
});

Then(/^I press view on etherscan$/, async () => {
  await WalletMainScreen.tapViewOnEtherscan();
});
