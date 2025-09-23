import Gestures from '../helpers/Gestures';
import Selectors from '../helpers/Selectors';
import {
  ADD_ADDRESS_BUTTON,
  AMOUNT_SCREEN,
  SEND_ADDRESS_INPUT_FIELD,
  SEND_CANCEL_BUTTON,
  SEND_SCREEN_ID,
  SEND_WARNING_MESSAGE,
  UNDERSTAND_WARNING_CONTINUE,
} from './testIDs/Screens/SendScreen.testIds';
import { TRANSACTION_AMOUNT_INPUT } from './testIDs/Screens/AmountScreen.testIds.js';
import AppwrightSelectors from '../helpers/AppwrightSelectors';
import { SendViewSelectorsIDs } from '../../e2e/selectors/SendFlow/SendView.selectors.js';
import { expect as appwrightExpect } from 'appwright';

class SendScreen {
  get device() {
    return this._device;
  }

  set device(device) {
    this._device = device;
  }

  get container() {
    if (!this._device) {
      return Selectors.getElementByPlatform(SEND_SCREEN_ID);
    } else {
      return AppwrightSelectors.getElementByID(this._device, SEND_SCREEN_ID);
    }
  }

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
    return Selectors.getElementByPlatform(CONFIRM_TXN_AMOUNT);
  }

  get addAddressButton() {
    return Selectors.getElementByPlatform(ADD_ADDRESS_BUTTON);
  }

  async typeAddressInSendAddressField(address) {
    if (!this._device) {
      await Gestures.typeText(this.sendAddressInputField, address);
    } else {
      const element = await AppwrightSelectors.getElementByID(this._device, SEND_ADDRESS_INPUT_FIELD);
      await element.fill(address);
    }
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

  async isVisible() {
    const element = await this.container;
    await appwrightExpect(element).toBeVisible();
  }

  async tapAddAddressButton() {
    await Gestures.tapTextByXpath(this.addAddressButton);
  }

  async tapCancelButton() {
    await Gestures.waitAndTap(this.sendCancelButton);
  }

  async isAmountScreenDisplayed() {
    if (!this._device) {
      const amountScreen = await this.amountScreen;
      await amountScreen.waitForDisplayed();
    } else {
      const element = await AppwrightSelectors.getElementByID(this._device, AMOUNT_SCREEN);
      await appwrightExpect(element).toBeVisible();
    }
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

  async waitForDisplayed() {
    const screen = await this.container;
    await screen.waitForDisplayed();
  }

  async tapOnContactAddress(contactName) {
    if (!this._device) {
      await Gestures.tapTextByXpath(contactName);
    } else {
      const element = await AppwrightSelectors.getElementByText(this._device, contactName);
      await element.tap();
    }
  }

  async tapOnNextButton() {
    if (!this._device) {
      await Gestures.tapTextByXpath(NEXT_BUTTON);
    } else {
      const element = await AppwrightSelectors.getElementByID(this._device, SendViewSelectorsIDs.ADDRESS_BOOK_NEXT_BUTTON);
      await element.tap();
    }
  }
}

export default new SendScreen();
