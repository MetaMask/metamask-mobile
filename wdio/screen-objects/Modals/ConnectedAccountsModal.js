import Gestures from '../../helpers/Gestures';
import Selectors from '../../helpers/Selectors';
import { ConnectedAccountsSelectorsIDs } from '../../../e2e/selectors/Browser/ConnectedAccountModal.selectors';

class ConnectedAccountsModal {
  get connectedModalContainer() {
    return Selectors.getElementByPlatform(ConnectedAccountsSelectorsIDs.CONTAINER);
  }

  get disconnectAllButton() {
    return Selectors.getElementByPlatform(
      ConnectedAccountsSelectorsIDs.DISCONNECT_ALL_BUTTON,
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
