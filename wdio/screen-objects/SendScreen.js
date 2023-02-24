import Gestures from '../helpers/Gestures';
import Selectors from '../helpers/Selectors';
import {
  SEND_ADDRESS_INPUT_FIELD,
  SEND_WARNING_MESSAGE,
  UNDERSTAND_WARNING_CONTINUE,
  AMOUNT_SCREEN,
  ADD_ADDRESS_BUTTON,
  SEND_CANCEL_BUTTON,
} from './testIDs/Screens/SendScreen.testIds';
import { TRANSACTION_AMOUNT_INPUT } from './testIDs/Screens/AmountScreen.testIds.js';

class SendScreen {
  get sendAddressInputField() {
    return Selectors.getElementByPlatform(SEND_ADDRESS_INPUT_FIELD);
  }

  get sendWarningMessage() {
    return Selectors.getElementByPlatform(SEND_WARNING_MESSAGE);
  }

  get sendCancelButton() {
    return Selectors.getElementByPlatform(SEND_CANCEL_BUTTON);
  }

  get amountInputField() {
    return Selectors.getElementByPlatform(TRANSACTION_AMOUNT_INPUT);
  }

  get understandWarningcontinue() {
    return Selectors.getElementByPlatform(UNDERSTAND_WARNING_CONTINUE);
  }

  get amountScreen() {
    return Selectors.getElementByPlatform(AMOUNT_SCREEN);
  }

  get confirmAmount() {
    // eslint-disable-next-line no-undef
    return Selectors.getElementByPlatform(COMFIRM_TXN_AMOUNT);
  }

  get addAddressButton() {
    return Selectors.getElementByPlatform(ADD_ADDRESS_BUTTON);
  }

  async typeAddressInSendAddressField(address) {
    await Gestures.typeText(this.sendAddressInputField, address);
  }

  async isSendWarningMessageVisible(message) {
    expect(await Selectors.getXpathElementByText(message)).toBeDisplayed();
  }

  async isTextVisible(message) {
    expect(await Selectors.getXpathElementByText(message)).toBeDisplayed();
  }

  async isContinueTextVisible() {
    await expect(this.understandWarningcontinue).toBeDisplayed();
  }

  async tapAddAddressButton() {
    await Gestures.tapTextByXpath(this.addAddressButton);
  }

  async tapCancelButton() {
    await Gestures.tap(this.sendCancelButton);
  }

  async isAmountScreenDisplayed() {
    expect(await this.amountScreen).toBeDisplayed();
  }

  async isChangedContactNameVisible(contactName) {
    expect(await Selectors.getXpathElementByText(contactName)).toBeDisplayed();
  }

  async isContactNameVisible(contact) {
    expect(await Selectors.getXpathElementByText(contact)).toBeDisplayed();
  }
  async isDeletedContactNameNotVisible(contact) {
    expect(await Selectors.getXpathElementByText(contact)).not.toBeDisplayed();
  }
}
export default new SendScreen();
