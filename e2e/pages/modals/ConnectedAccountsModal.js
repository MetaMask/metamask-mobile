import TestHelpers from '../../helpers';
import {
  CONNECTED_ACCOUNTS_MODAL_CONTAINER,
  CONNECTED_ACCOUNTS_MODAL_NETWORK_PICKER_ID,
} from '../../../wdio/screen-objects/testIDs/Components/ConnectedAccountsModal.testIds';
import { ConnectedAccountModalSelectorsText } from '../../selectors/Modals/ConnectedAccountModal.selectors';
import { CommonSelectorsIDs } from '../../selectors/Common.selectors';
import { ConnectedAccountsSelectorsIDs } from '../../selectors/Modals/ConnectedAccounts.selectors';

export default class ConnectedAccountsModal {
  static async tapPermissionsButton() {
    await TestHelpers.tapByText(
      ConnectedAccountModalSelectorsText.PERMISSION_LINK,
    );
  }

  static async tapNetworksPicker() {
    await TestHelpers.waitAndTap(CONNECTED_ACCOUNTS_MODAL_NETWORK_PICKER_ID);
  }

  static async tapDisconnectAllButton() {
    await TestHelpers.tapByText(
      ConnectedAccountModalSelectorsText.DISCONNECT_ALL,
    );
  }

  static async tapToSetAsPrimaryAccount() {
    // await TestHelpers.delay(8000);
    if (device.getPlatform() === 'android') {
      await TestHelpers.tapByText(ConnectedAccountModalSelectorsText.IMPORTED); //does not work for iOS
    } else {
      await TestHelpers.typeTextAndHideKeyboard(
        CommonSelectorsIDs.CELLSELECT,
        1,
      ); //not working for android or iOS
    }
    await TestHelpers.delay(8000); //waiting for toast message to move out of the way
  }

  static async isVisible() {
    await TestHelpers.checkIfVisible(CONNECTED_ACCOUNTS_MODAL_CONTAINER);
  }

  static async isNotVisible() {
    await TestHelpers.checkIfNotVisible(CONNECTED_ACCOUNTS_MODAL_CONTAINER);
  }

  static async scrollToBottomOfModal() {
    await TestHelpers.swipe(CONNECTED_ACCOUNTS_MODAL_CONTAINER, 'down', 'slow');
    await TestHelpers.delay(1000);
  }

  static async tapConnectMoreAccountsButton() {
    await TestHelpers.waitAndTap(
      ConnectedAccountsSelectorsIDs.CONNECT_ACCOUNTS_BUTTON,
    );
  }
}
