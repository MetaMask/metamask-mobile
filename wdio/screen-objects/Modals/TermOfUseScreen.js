import Selectors from '../../helpers/Selectors';
import Gestures from '../../helpers/Gestures';
import { TermsOfUseModalSelectorsIDs } from '../../../e2e/selectors/Onboarding/TermsOfUseModal.selectors';

class TermOfUseScreen {
  get container() {
    return Selectors.getXpathElementByResourceId(TermsOfUseModalSelectorsIDs.CONTAINER);
  }

  get checkbox() {
    return Selectors.getXpathElementByResourceId(TermsOfUseModalSelectorsIDs.CHECKBOX);
  }

  get scrollEndArrowButton() {
    return Selectors.getXpathElementByResourceId(
      TermsOfUseModalSelectorsIDs.SCROLL_ARROW_BUTTON,
    );
  }

  get acceptButton() {
    return Selectors.getXpathElementByResourceId(TermsOfUseModalSelectorsIDs.ACCEPT_BUTTON);
  }

  get webview() {
    return Selectors.getXpathElementByResourceId(TermsOfUseModalSelectorsIDs.WEBVIEW);
  }

  async isDisplayed() {
    const container = await this.container;
    await container.waitForDisplayed();
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
    await Gestures.waitAndTap(this.checkbox);
  }

  async tapScrollEndButton() {
    await Gestures.swipeUp(0.5);
    await Gestures.swipeUp(0.5);
    await Gestures.swipeUp(0.5);
    await Gestures.waitAndTap(this.scrollEndArrowButton);
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
    await Gestures.tap(this.acceptButton);
  }
}

export default new TermOfUseScreen();
