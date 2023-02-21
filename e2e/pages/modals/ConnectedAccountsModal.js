import TestHelpers from '../../helpers';
import {
  CANCEL_BUTTON_ID,
  CONNECT_BUTTON_ID,
} from '../../../app/constants/test-ids';
import { strings } from '../../../locales/i18n';

const CONNECTED_ACCOUNTS_PERMISSION_LINK_TEXT = strings('accounts.permissions');
const CONNECTED_ACCOUNTS_REVOKE_LINK_TEXT = strings('accounts.revoke');

const CONNECTED_ACCOUNTS_REVOKE_ALL_TEXT = strings('accounts.revoke_all');

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

  static async tapRevokeAllButton() {
    await TestHelpers.tapByText(CONNECTED_ACCOUNTS_REVOKE_ALL_TEXT);
  }

  static async tapRevokeButton() {
    await TestHelpers.tapByText(CONNECTED_ACCOUNTS_REVOKE_LINK_TEXT);
  }

  static async tapToSetAsPrimaryAccount() {
    await TestHelpers.tapItemAtIndex('cell-account-select', 1); // selecting the second account on the list
  }

  static async swipeToDimssConnectedAccountsModal() {
    await TestHelpers.swipe(
      'accounts-connected-modal-container',
      'down',
      'slow',
      0.6,
    );
  }

  static async isVisible() {
    await TestHelpers.checkIfVisible('accounts-connected-modal-container');
  }

  static async isNotVisible() {
    await TestHelpers.checkIfNotVisible('accounts-connected-modal-container');
  }
}
