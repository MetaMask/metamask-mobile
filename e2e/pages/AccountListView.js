import TestHelpers from '../helpers';

import {
  ACCOUNT_LIST_ID,
  CREATE_ACCOUNT_BUTTON_ID,
  IMPORT_ACCOUNT_BUTTON_ID,
} from '../../wdio/screen-objects/testIDs/Components/AccountListComponent.testIds';
export default class AccountListView {
  static async tapCreateAccountButton() {
    await TestHelpers.waitAndTap(CREATE_ACCOUNT_BUTTON_ID);
  }

  static async tapImportAccountButton() {
    await TestHelpers.waitAndTap(IMPORT_ACCOUNT_BUTTON_ID);
  }

  static async tapAccountByName(accountName) {
    await TestHelpers.tapByText(accountName);
  }

  static async isVisible() {
    await TestHelpers.checkIfVisible(ACCOUNT_LIST_ID);
  }

  static async isNotVisible() {
    await TestHelpers.checkIfNotVisible(ACCOUNT_LIST_ID);
  }

  static async isNewAccountNameVisible() {
    if (device.getPlatform() === 'android') {
      await TestHelpers.checkIfElementWithTextIsVisible('Account 2');
    }
  }
}
