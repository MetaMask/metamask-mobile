import Gestures from '../../helpers/Gestures';
import Selectors from '../../helpers/Selectors';
import {
  CANCEL_BUTTON_ID,
  CONNECT_BUTTON_ID,
} from '../../../app/constants/test-ids';

class ConnectedAccountsModal {
  get connectedModalContainer() {
    return Selectors.getElementByPlatform('accounts-connected-modal-container');
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
}
export default new ConnectedAccountsModal();
