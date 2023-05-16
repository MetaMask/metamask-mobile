/* eslint-disable no-undef */
import { Then, When } from '@wdio/cucumber-framework';
import AccountListComponent from '../screen-objects/AccountListComponent';
import ImportAccountScreen from '../screen-objects/ImportAccountScreen';
import ImportSuccessScreen from '../screen-objects/ImportSuccessScreen';
import WalletMainScreen from "../screen-objects/WalletMainScreen";

When(/^I tap on Import an account/, async () => {
  await driver.pause(setTimeout);
  await AccountListComponent.tapImportAccountButton();
});

Then(/^I am taken to the Import Account screen/, async () => {
  await driver.pause(3000);
  await ImportAccountScreen.isVisible();
});

When(/^I type (.*) into the private key input field/, async (privateKey) => {
  await ImportAccountScreen.typePrivateKeyAndDismissKeyboard(privateKey);
});

When(/^I tap on the private key import button/, async () => {
  await driver.pause(2000);
  await ImportAccountScreen.tapImportButton();
});

Then(/^The account is imported/, async () => {
  await driver.pause(2500);
  await ImportSuccessScreen.isVisible();
  await ImportSuccessScreen.tapCloseButton();
});

Then(/^I should see an error (.*)/, async (errorMessage) => {
  await driver.pause(1000);
  await ImportAccountScreen.isAlertTextVisible(errorMessage);
  await driver.acceptAlert();
});
Then(/^I close the import account screen/, async () => {
  await driver.pause(2500);
  await ImportAccountScreen.tapCloseButton();
});
