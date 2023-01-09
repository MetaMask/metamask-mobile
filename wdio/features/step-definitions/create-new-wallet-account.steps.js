import {Given,When, Then } from '@wdio/cucumber-framework';

import AccountListComponent from '../screen-objects/AccountListComponent';

import AddCustomImportTokensScreen from '../screen-objects/AddCustomImportTokensScreen.js';
import CreateNewWalletScreen from '../screen-objects/Onboarding/CreateNewWalletScreen.js';
import WalletMainScreen from '../screen-objects/WalletMainScreen.js';
import MetaMetricsScreen from "../screen-objects/Onboarding/MetaMetricsScreen";
import WelcomeScreen from "../screen-objects/Onboarding/OnboardingCarousel";
import OnboardingScreen from "../screen-objects/Onboarding/OnboardingScreen";

import SkipAccountSecurityModal from '../screen-objects/Modals/SkipAccountSecurityModal.js';
import WalletAccountModal from "../screen-objects/Modals/WalletAccountModal.js";

import Accounts from "../helpers/Accounts";


Given(/^I have created my wallet$/, async () => { // should be in a common step file
    const validAccount = Accounts.getValidAccount();
    await WelcomeScreen.isScreenTitleVisible();
    await driver.pause(12000); //TODO: Needs a smarter set timeout
    await WelcomeScreen.clickGetStartedButton();
    await OnboardingScreen.isScreenTitleVisible();
    await OnboardingScreen.tapCreateNewWalletButton();
    await MetaMetricsScreen.isScreenTitleVisible();
    await MetaMetricsScreen.tapNoThanksButton();
    await CreateNewWalletScreen.isNewAccountScreenFieldsVisible();
    await CreateNewWalletScreen.inputPasswordInFirstField(validAccount.password);
    await CreateNewWalletScreen.inputConfirmPasswordField(validAccount.password);
    await SkipAccountSecurityModal.isVisible();
    await SkipAccountSecurityModal.proceedWithoutWalletSecure();
    await CreateNewWalletScreen.selectRemindMeLater();
    await CreateNewWalletScreen.isAccountCreated();
    await CreateNewWalletScreen.isNotVisible();

  });

When(/^I tap on the Identicon/, async () => { // should be in a commons-step file
    await driver.pause(setTimeout);  
    await WalletMainScreen.tapIdenticon();
});

When(/^the account list should be visible/, async () => { // should be in a common-step file
    await driver.pause(3000);  
    await AccountListComponent.isVisible();
});

Then(/^I tap on Create a new account/, async () => {
    await AccountListComponent.tapCreateAccountButton();
});

When(/^A new account is created/, async () => {
    await driver.pause(2000);  
    await AddCustomImportTokensScreen.tapImportButton();
});

Then(/^I am on the new account/, async () => {
    await driver.pause(2500);  
    WalletAccountModal.isAccountNameLabelEqualTo("Account 3") // this can be better
});
Then(/^I dismiss the account list/, async () => {
    await driver.pause(2500);  
    await driver.touchPerform([{ action: 'tap', options: { x: 100, y: 200 } }]);
});