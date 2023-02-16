import Gestures from '../helpers/Gestures';
import Selectors from '../helpers/Selectors';
import {
  SEND_ADDRESS_INPUT_FIELD,
  SEND_WARNING_MESSAGE,
  UNDERSTAND_WARNING_CONTINUE,
  AMOUNT_SCREEN,
  ADD_ADDRESS_BUTTON,
  SEND_CANCEL_BUTTON,
  TRANSACTION_INPUT_ID,
  COMFIRM_TXN_AMOUNT,
} from './testIDs/Screens/SendScreen.testIds';

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
    return Selectors.getElementByPlatform(TRANSACTION_INPUT_ID);
  }

  get confirmAmount() {
    return Selectors.getElementByPlatform(COMFIRM_TXN_AMOUNT);
  }

  get understandWarningcontinue() {
    return Selectors.getElementByPlatform(UNDERSTAND_WARNING_CONTINUE);
  }

  get amountScreen() {
    return Selectors.getElementByPlatform(AMOUNT_SCREEN);
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
    await expect(this.amountScreen).toBeDisplayed();
  }

  async enterAmount(text) {
    await Gestures.tap(this.amountInputField);
    await Gestures.typeText(this.amountInputField, text);
  }

  async isConfirmScreenVisible() {
    await expect(this.confirmAmount).toBeDisplayed();
  }

  async isCorrectTokenConfirm(token) {
    const element = await this.confirmAmount;
    expect(await element.getText()).toContain(token);
  }

  async isCorrectTokenAmountDisplayed(amount) {
    const element = await this.confirmAmount;
    expect(await element.getText()).toContain(amount);
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
