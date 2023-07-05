import TestHelpers from '../../helpers';
import {
  CANCEL_BUTTON_ID,
  CELL_SELECT_TEST_ID,
  CONNECT_BUTTON_ID,
} from '../../../app/constants/test-ids';
import {
  CONNECTED_ACCOUNTS_MODAL_CONTAINER,
  CONNECTED_ACCOUNTS_MODAL_NETWORK_PICKER_ID,
} from '../../../wdio/screen-objects/testIDs/Components/ConnectedAccountsModal.testIds';

import messages from '../../../locales/languages/en.json';

const CONNECTED_ACCOUNTS_PERMISSION_LINK_TEXT = messages.accounts.permissions;
const CONNECTED_ACCOUNTS_DISCONNECT_ALL_TEXT =
  messages.accounts.disconnect_all_accounts;

export default class ConnectedAccountsModal {
  static async tapCancelButton() {
    await TestHelpers.tap(CANCEL_BUTTON_ID);
  }

  static async tapConnectButton() {
    await TestHelpers.tap(CONNECT_BUTTON_ID);
  }

  static async tapPermissionsButton() {
    await TestHelpers.tapByText(CONNECTED_ACCOUNTS_PERMISSION_LINK_TEXT);
  }

  static async tapNetworksPicker() {
    await TestHelpers.waitAndTap(CONNECTED_ACCOUNTS_MODAL_NETWORK_PICKER_ID);
  }

  static async tapDisconnectAllButton() {
    await TestHelpers.tapByText(CONNECTED_ACCOUNTS_DISCONNECT_ALL_TEXT);
  }

  static async tapToSetAsPrimaryAccount() {
    await TestHelpers.tapItemAtIndex(CELL_SELECT_TEST_ID, 1); // selecting the second account on the list
  }

  static async isVisible() {
    await TestHelpers.checkIfVisible(CONNECTED_ACCOUNTS_MODAL_CONTAINER);
  }

  static async isNotVisible() {
    await TestHelpers.checkIfNotVisible(CONNECTED_ACCOUNTS_MODAL_CONTAINER);
  }
}
