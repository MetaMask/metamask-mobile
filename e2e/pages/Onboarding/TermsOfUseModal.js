import { TermsOfUseModalSelectorsIDs } from '../../selectors/Onboarding/TermsOfUseModal.selectors';
import Matchers from '../../framework/Matchers.ts';
import Gestures from '../../framework/Gestures.ts';

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
    await Gestures.waitAndTap(this.checkbox, {
      elemDescription: 'Terms Agree Checkbox',
    });
  }

  async tapScrollEndButton() {
    await Gestures.waitAndTap(this.scrollArrowButton, {
      elemDescription: 'Terms Scroll Arrow Button',
    });
  }

  async tapAcceptButton() {
    await Gestures.waitAndTap(this.acceptButton, {
      elemDescription: 'Terms Accept Button',
    });
  }

  async tapCloseButton() {
    await Gestures.waitAndTap(this.closeButton, {
      elemDescription: 'Terms Close Button',
    });
  }
}

export default new TermsOfUseModal();
