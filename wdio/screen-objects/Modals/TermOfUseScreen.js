import Selectors from '../../helpers/Selectors';
import Gestures from '../../helpers/Gestures';
import { TermsOfUseModalSelectorsIDs } from '../../../app/util/termsOfUse/TermsOfUseModal.testIds';
import AppwrightSelectors from '../../../tests/framework/AppwrightSelectors';
import AppwrightGestures from '../../../tests/framework/AppwrightGestures';
import { expect as appwrightExpect } from 'appwright';

class TermOfUseScreen {

  get device() {
    return this._device;
  }

  set device(device) {
    this._device = device;

  }

  get container() {
    if (!this._device) {
      return Selectors.getXpathElementByResourceId(TermsOfUseModalSelectorsIDs.CONTAINER);
    } else {
      return AppwrightSelectors.getElementByID(this._device, TermsOfUseModalSelectorsIDs.CONTAINER);
    }
  }

  get checkbox() {
    if (!this._device) {
      return Selectors.getXpathElementByResourceId(TermsOfUseModalSelectorsIDs.CHECKBOX);
    } else {
      return AppwrightSelectors.getElementByID(this._device, TermsOfUseModalSelectorsIDs.CHECKBOX);
    }
  }

  get scrollEndArrowButton() {
    if (!this._device) {
      return Selectors.getXpathElementByResourceId(TermsOfUseModalSelectorsIDs.SCROLL_ARROW_BUTTON);
    } else {
      return AppwrightSelectors.getElementByID(this._device, TermsOfUseModalSelectorsIDs.SCROLL_ARROW_BUTTON);
    }
  }

  get acceptButton() {
    if (!this._device) {
      return Selectors.getXpathElementByResourceId(TermsOfUseModalSelectorsIDs.ACCEPT_BUTTON);
    } else {
      return AppwrightSelectors.getElementByID(this._device, TermsOfUseModalSelectorsIDs.ACCEPT_BUTTON);
    }
  }

  get webview() {
    if (!this._device) {
      return Selectors.getXpathElementByResourceId(TermsOfUseModalSelectorsIDs.WEBVIEW);
    } else {
      return AppwrightSelectors.getElementByID(this._device, TermsOfUseModalSelectorsIDs.WEBVIEW);
    }
  }

  async isDisplayed() {
    if (!this._device) {
      const container = await this.container;
      await container.waitForDisplayed();
    } else {
      await appwrightExpect(await this.container).toBeVisible();
    }
  }

  async textIsDisplayed() {
    const termsText = await Selectors.getXpathElementByTextContains(
      'Last Updated',
    );
    await termsText.waitForDisplayed();
  }

  async isNotDisplayed() {
    const container = await this.container;
    await container.waitForExist({ reverse: true });
  }

  async tapAgreeCheckBox() {
    if (!this._device) {
      await Gestures.waitAndTap(this.checkbox);
    } else {
      const cb = await AppwrightSelectors.getElementByID(this._device, TermsOfUseModalSelectorsIDs.CHECKBOX);
      await AppwrightGestures.tap(cb); // Use static tap method with retry logic
    }
  }

  async tapScrollEndButton() {
    if (!this._device) {
      await Gestures.waitAndTap(this.scrollEndArrowButton);
    } else {
      const button = await AppwrightSelectors.getElementByID(this._device, TermsOfUseModalSelectorsIDs.SCROLL_ARROW_BUTTON);
      await AppwrightGestures.tap(button); // Use static tap method with retry logic
    }
  }

  async acceptIsEnabled() {
    const element = await this.acceptButton;
    return element.isEnabled();
  }

  async isCheckBoxChecked() {
    const element = await this.checkbox;
    return element.isEnabled();
  }

  async tapAcceptButton() {
    if (!this._device) {
      await Gestures.tap(this.acceptButton);
    } else {
      const button = await AppwrightSelectors.getElementByID(this._device, TermsOfUseModalSelectorsIDs.ACCEPT_BUTTON);
      await AppwrightGestures.tap(button); // Use static tap method with retry logic
    }
  }
}

export default new TermOfUseScreen();
