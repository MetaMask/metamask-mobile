import Gestures from '../../helpers/Gestures';
import Selectors from '../../helpers/Selectors';

import {
  CONNECTED_ACCOUNTS_MODAL_CONTAINER,
  CONNECTED_ACCOUNTS_MODAL_DISCONNECT_ALL_BUTTON_ID,
} from '../testIDs/Components/ConnectedAccountsModal.testIds';
class ConnectedAccountsModal {
  get connectedModalContainer() {
    return Selectors.getElementByPlatform(CONNECTED_ACCOUNTS_MODAL_CONTAINER);
  }

  get disconnectAllButton() {
    return Selectors.getElementByPlatform(
      CONNECTED_ACCOUNTS_MODAL_DISCONNECT_ALL_BUTTON_ID,
    );
  }

  async isVisible() {
    await expect(this.connectedModalContainer).toBeDisplayed();
  }

  async isNotVisible() {
    await expect(this.connectedModalContainer).not.toBeDisplayed();
  }

  async tapDisconnectAllButton() {
    await Gestures.waitAndTap(this.disconnectAllButton);
    const element = await this.disconnectAllButton;
    await element.waitForExist({ reverse: true });
  }
}
export default new ConnectedAccountsModal();
