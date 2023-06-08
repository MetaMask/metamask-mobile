import { Then, When } from '@wdio/cucumber-framework';
import AccountListComponent from '../screen-objects/AccountListComponent';
import ImportAccountScreen from '../screen-objects/ImportAccountScreen';
import ImportSuccessScreen from '../screen-objects/ImportSuccessScreen';
import AddAccountModal from '../screen-objects/Modals/AddAccountModal';

When(/^I tap import account/, async () => {
  await AccountListComponent.tapAddAccountButton();
  await AddAccountModal.tapImportAccountButton();
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
