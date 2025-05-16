import { TermsOfUseModalSelectorsIDs } from '../../selectors/Onboarding/TermsOfUseModal.selectors';
import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';

class TermsOfUseModal {
  get container() {
    return Matchers.getElementByID(TermsOfUseModalSelectorsIDs.CONTAINER);
  }

  get checkbox() {
    return Matchers.getElementByID(TermsOfUseModalSelectorsIDs.CHECKBOX);
  }

  get scrollArrowButton() {
    return Matchers.getElementByID(
      TermsOfUseModalSelectorsIDs.SCROLL_ARROW_BUTTON,
    );
  }

  get acceptButton() {
    return Matchers.getElementByID(TermsOfUseModalSelectorsIDs.ACCEPT_BUTTON);
  }

  get closeButton() {
    return Matchers.getElementByID(TermsOfUseModalSelectorsIDs.CLOSE_BUTTON);
  }

  async tapAgreeCheckBox() {
    await Gestures.waitAndTap(this.checkbox);
  }

  async tapScrollEndButton() {
    await Gestures.waitAndTap(this.scrollArrowButton);
  }

  async tapAcceptButton() {
    await Gestures.waitAndTap(this.acceptButton);
  }

  async tapCloseButton() {
    await Gestures.waitAndTap(this.closeButton);
  }
}

export default new TermsOfUseModal();
