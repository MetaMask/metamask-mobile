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
import AppwrightSelectors from '../../e2e/framework/AppwrightSelectors';
import AppwrightGestures from '../../e2e/framework/AppwrightGestures';
import { SendViewSelectorsIDs } from '../../app/components/Views/confirmations/legacy/SendFlow/SendView.testIds';
import { expect as appwrightExpect } from 'appwright';
import { NETWORK_SELECTOR_TEST_IDS } from '../../app/constants/networkSelector.js';

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

  get networkPicker() {
    if (!this._device) {
      return Selectors.getElementByPlatform(NETWORK_SELECTOR_TEST_IDS.CONTEXTUAL_NETWORK_PICKER);
    } else {
      return AppwrightSelectors.getElementByID(this._device, NETWORK_SELECTOR_TEST_IDS.CONTEXTUAL_NETWORK_PICKER);
    }
  }

  get reviewButton() {
    return AppwrightSelectors.getElementByID(this._device, 'review-button');
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

  get searchTokenField() {
    if (AppwrightSelectors.isIOS(this._device)) {
      return AppwrightSelectors.getElementByCatchAll(this._device, 'Search tokens and NFTs');
    } else {
      return AppwrightSelectors.getElementByID(this._device, 'textfieldsearch');
    }
  }
  

  async openNetworkPicker() {
    if (!this._device) {
      await Gestures.waitAndTap(await this.networkPicker);
    } else {
      const element = await this.networkPicker;
      await element.tap();
    }
  }

  async typeAddressInSendAddressField(address) {
    if (!this._device) {
      await Gestures.typeText(this.sendAddressInputField, address);
    } else {
      console.log('Typing address in send address field');
      const element = await AppwrightSelectors.getElementByCatchAll(this._device, 'Enter address to send to');
      await AppwrightGestures.typeText(element, address);
    }
  }

  async clickOnReviewButton() {
    const reviewButton = await AppwrightSelectors.getElementByID(this._device, 'review-button');
    await appwrightExpect(reviewButton).toBeVisible({timeout: 30000});

    console.log('Review button visible, tapping');
    await reviewButton.tap();
  }

  async clickOnAccountByName(accountName) {
    const account = await AppwrightSelectors.getElementByCatchAll(this._device, accountName);
    await AppwrightGestures.tap(account);
  }

  async clickOnAccountByAddress(accountAddress) {
    const accountId = `recipient-name-${accountAddress}`;
    const account = await AppwrightSelectors.getElementByID(this._device, accountId);
    await account.tap();
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
    const networkButton = await AppwrightSelectors.getElementByCatchAll(this._device, 'Tokens');
    await appwrightExpect(networkButton).toBeVisible();
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
      await AppwrightGestures.tap(element); // Use static tap method with retry logic
    }
  }

  async tapOnNextButton() {
    if (!this._device) {
      await Gestures.tapTextByXpath(NEXT_BUTTON);
    } else {
      const element = await AppwrightSelectors.getElementByID(this._device, SendViewSelectorsIDs.ADDRESS_BOOK_NEXT_BUTTON);
      await AppwrightGestures.tap(element); // Use static tap method with retry logic
    }
  }

  async typeTokenName(tokenName) {
    if (!this._device) {
      await Gestures.typeText(this.searchTokenField, tokenName);
    } else {
      const element = await this.searchTokenField;
      await element.fill(tokenName);
    }
  }

  async clickOnFirstTokenBadge() {
    const firstTokenBadge = AppwrightSelectors.isIOS(this._device) ? await AppwrightSelectors.getElementByXpath(this._device, `//XCUIElementTypeOther[@name="badge-wrapper-badge"]`) : await AppwrightSelectors.getElementByID(this._device, 'badge-wrapper-badge');
    appwrightExpect(firstTokenBadge).toBeVisible();
    await AppwrightGestures.tap(firstTokenBadge);
  }

  async selectNetwork(network) {
    if (!this._device) {
      await Gestures.tapTextByXpath(network);
    } else {
      if (AppwrightSelectors.isAndroid(this._device)) {
        const networkButton = await AppwrightSelectors.getElementByXpath(this._device, `//*[@content-desc="${network}"]`);
        await AppwrightGestures.tap(networkButton);
      } else {
        const networkButton = await AppwrightSelectors.getElementByXpath(this._device, `//XCUIElementTypeOther[@name="${network}"]`);
        await AppwrightGestures.tap(networkButton);
      }
    }
  }

  async selectToken(networkName = 'Ethereum', tokenSymbol) {

    if (!this._device) {
      await Gestures.tapTextByXpath(tokenName);
    } else {
      if (AppwrightSelectors.isAndroid(this._device)) {
        const networkButton = await AppwrightSelectors.getElementByID(this._device, `asset-${networkName}`);
        await AppwrightGestures.tap(networkButton);
        const tokenButton = await AppwrightSelectors.getElementByID(this._device, `asset-${tokenSymbol}`);
        await AppwrightGestures.tap(tokenButton);
      } else {
        const networkButton = await AppwrightSelectors.getElementByXpath(this._device, `//XCUIElementTypeOther[@name="${networkName}"]`);
        await AppwrightGestures.tap(networkButton);
        const tokenButton = await AppwrightSelectors.getElementByNameiOS(this._device, tokenSymbol);
        await AppwrightGestures.tap(tokenButton);
      }

    }
  }

  async assetsListIsDisplayed() {
    const searchTokenField = await this.searchTokenField
    await appwrightExpect(searchTokenField).toBeVisible();
  }

  async isSelectAddressScreenDisplayed() {
    console.log('Checking if select address screen is displayed');
    const selectAddressScreen = await AppwrightSelectors.getElementByCatchAll(this._device, 'Enter address to send to');
    appwrightExpect(await selectAddressScreen).toBeVisible({timeout: 10000});
  }
}

export default new SendScreen();