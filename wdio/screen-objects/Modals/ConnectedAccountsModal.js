import Gestures from '../../helpers/Gestures';
import Selectors from '../../helpers/Selectors';
import {
  CANCEL_BUTTON_ID,
  CONNECT_BUTTON_ID,
} from '../../../app/constants/test-ids';

import {
  CONNECTED_ACCOUNTS_MODAL_CONTAINER,
  CONNECTED_ACCOUNTS_MODAL_REVOKE_BUTTON_ID,
} from '../testIDs/Components/ConnectedAccountsModal.testIds';
class ConnectedAccountsModal {
  get connectedModalContainer() {
    return Selectors.getElementByPlatform(CONNECTED_ACCOUNTS_MODAL_CONTAINER);
  }

  get revokeButton() {
    return Selectors.getElementByPlatform(
      CONNECTED_ACCOUNTS_MODAL_REVOKE_BUTTON_ID,
    );
  }

  static async tapCancelButton() {
    await Gestures.tap(CANCEL_BUTTON_ID);
  }

  static async tapConnectButton() {
    await Gestures.tap(CONNECT_BUTTON_ID);
  }

  async isVisible() {
    await expect(this.connectedModalContainer).toBeDisplayed();
  }
  async isNotVisible() {
    await expect(this.connectedModalContainer).not.toBeDisplayed();
  }

  async tapRevokeButton() {
    await Gestures.waitAndTap(this.revokeButton);
    const element = await this.revokeButton;
    await element.waitForExist({ reverse: true });
  }
}
export default new ConnectedAccountsModal();
