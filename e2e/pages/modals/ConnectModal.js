import TestHelpers from '../../helpers';
import {
  ACCOUNT_APROVAL_MODAL_CONTAINER_ID,
  CANCEL_BUTTON_ID,
  CONNECT_BUTTON_ID,
} from '../../../app/constants/test-ids';
import messages from '../../../locales/languages/en.json';

const CONNECT_MULTIPLE_ACCOUNTS_STRING =
  messages.accounts.connect_multiple_accounts;

const SELECT_ALL_TEXT = messages.accounts.select_all;

export default class ConnectModal {
  static async tapCancelButton() {
    await TestHelpers.tap(CANCEL_BUTTON_ID);
  }

  static async tapConnectButton() {
    await TestHelpers.tap(CONNECT_BUTTON_ID);
  }

  static async tapConnectMultipleAccountsButton() {
    await TestHelpers.tapByText(CONNECT_MULTIPLE_ACCOUNTS_STRING);
  }

  static async tapSelectAllButton() {
    await TestHelpers.tapByText(SELECT_ALL_TEXT);
  }

  static async tapAccountConnectMultiSelectButton() {
    await TestHelpers.tap('multiconnect-connect-button');
  }

  static async isVisible() {
    await TestHelpers.checkIfVisible(ACCOUNT_APROVAL_MODAL_CONTAINER_ID);
  }

  static async isNotVisible() {
    await TestHelpers.checkIfNotVisible(ACCOUNT_APROVAL_MODAL_CONTAINER_ID);
  }
}
