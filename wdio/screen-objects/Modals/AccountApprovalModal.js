import Selectors from '../../helpers/Selectors';
import {
  ACCOUNT_APPROVAL_CONNECT_BUTTON,
  ACCOUNT_APPROVAL_SELECT_ALL_BUTTON,
  ACCOUNT_APROVAL_MODAL_CONTAINER_ID,
} from '../testIDs/Components/AccountApprovalModal.testIds';
import Gestures from '../../helpers/Gestures';

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

  get selectAllButton() {
    return Selectors.getElementByPlatform(ACCOUNT_APPROVAL_SELECT_ALL_BUTTON);
  }

  async tapConnectButton() {
    await Gestures.waitAndTap(this.connectButton);
  }

  async tapConnectMultipleAccountsButton() {
    await Gestures.waitAndTap(this.connectMultipleAccountsButton);
    const element = await this.connectMultipleAccountsButton;
    await element.waitForExist({ reverse: true });
  }

  async tapConnectButtonByText() {
    await Gestures.tapTextByXpath('Connect'); // needed for browser specific tests
  }

  async isVisible() {
    await expect(this.modalContainer).toBeDisplayed();
  }

  async waitForDisappear() {
    const element = await this.modalContainer;
    await element.waitForExist({ reverse: true });
  }

  async tapSelectAllButton() {
    const selectAllButton = await this.selectAllButton;
    await selectAllButton.waitForDisplayed();
    let text = await selectAllButton.getText();
    while (text === 'Select all') {
      await selectAllButton.click();
      await driver.pause(2000);
      text = await selectAllButton.getText();
    }
  }
}

export default new AccountApprovalModal();
