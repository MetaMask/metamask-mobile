import TestHelpers from '../../helpers';
import {
  ConnectAccountModalSelectorsIDs,
  ConnectAccountModalSelectorsText,
} from '../../selectors/Modals/ConnectAccountModal.selectors';
import { CommonSelectorsIDs } from '../../selectors/Common.selectors';

export default class ConnectModal {
  static async tapCancelButton() {
    await TestHelpers.tap(CommonSelectorsIDs.CANCEL_BUTTON);
  }

  static async tapConnectButton() {
    await TestHelpers.tap(CommonSelectorsIDs.CONNECT_BUTTON);
  }

  static async tapConnectMultipleAccountsButton() {
    await TestHelpers.tapByText(
      ConnectAccountModalSelectorsText.CONNECT_ACCOUNTS,
    );
  }

  static async tapImportAccountButton() {
    await TestHelpers.tapByText(
      ConnectAccountModalSelectorsText.IMPORT_ACCOUNT,
    );
  }

  static async tapImportAccountOrHWButton() {
    await TestHelpers.tapByText(
      ConnectAccountModalSelectorsText.IMPORT_ACCOUNT,
    );
  }

  static async tapSelectAllButton() {
    await TestHelpers.tapByText(ConnectAccountModalSelectorsText.SELECT_ALL);
  }

  static async tapAccountConnectMultiSelectButton() {
    await TestHelpers.tap(ConnectAccountModalSelectorsIDs.SELECT_MULTI_BUTTON);
  }

  static async isVisible() {
    await TestHelpers.checkIfVisible(ConnectAccountModalSelectorsIDs.CONTAINER);
  }

  static async isNotVisible() {
    await TestHelpers.checkIfNotVisible(
      ConnectAccountModalSelectorsIDs.CONTAINER,
    );
  }

  static async scrollToBottomOfModal() {
    await TestHelpers.swipe(
      ConnectAccountModalSelectorsIDs.CONTAINER,
      'down',
      'slow',
    );
    await TestHelpers.delay(1000);
  }
}
