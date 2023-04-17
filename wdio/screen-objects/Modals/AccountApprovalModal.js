import Selectors from '../../helpers/Selectors';
import {
  ACCOUNT_APPROVAL_CONNECT_BUTTON,
  ACCOUNT_APROVAL_MODAL_CONTAINER_ID,
} from '../testIDs/Components/AccountApprovalModal.testIds';
import Gestures from '../../helpers/Gestures';
import {reverse} from "lodash";

class AccountApprovalModal {
  get modalContainer() {
    return Selectors.getElementByPlatform(ACCOUNT_APROVAL_MODAL_CONTAINER_ID);
  }
  get connectButton() {
    return Selectors.getElementByPlatform(ACCOUNT_APPROVAL_CONNECT_BUTTON);
  }
  get connectMultipleAccountsButton() {
    return Selectors.getElementByPlatform('multiconnect-connect-button');
  }
  get connectButtonText() {
    return Selectors.getXpathElementByText('Connect');
  }

  async tapConnectButton() {
    await Gestures.waitAndTap(this.connectButton);
  }
  async tapConnectMultipleAccountsButton() {
    await Gestures.waitAndTap(this.connectMultipleAccountsButton);
    const element = await this.connectMultipleAccountsButton;
    await element.waitForExist( { reverse: true });
  }

  async tapConnectButtonByText() {
    await Gestures.tapTextByXpath('Connect'); // needed for browser specific tests
  }
  async isVisible() {
    await expect(this.modalContainer).toBeDisplayed();
  }

  async waitForDisappear() {
    const element = await this.modalContainer;
    await element.waitForExist( { reverse: true })
  }
}

export default new AccountApprovalModal();
