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

  get amountInputField() {
    return Selectors.getXpathElementByText('Enter a number here');
  }

  get nextButton() {
    return Selectors.getXpathElementByText('Next');
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

  async tapConfirmButtonByText() {
    await Gestures.tapTextByXpath('Confirm'); // needed for browser specific tests
  }

  async tapUseDefaultApproveByText() {
    await Gestures.tapTextByXpath('Use default'); // needed for browser specific tests
  }

  async setTokenAmount(amount) {
    await Gestures.typeText(this.amountInputField, amount);
  }

  async tapNextButtonByText() {
    await Gestures.waitAndTap(this.nextButton);
  }

  async tapApproveButtonByText() {
    await Gestures.tapTextByXpath('Approve'); // needed for browser specific tests
  }

  async isVisible() {
    const modalContainer = await this.modalContainer;
    await modalContainer.waitForDisplayed();
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
