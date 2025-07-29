import { TermsOfUseModalSelectorsIDs } from '../../selectors/Onboarding/TermsOfUseModal.selectors';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';

class TermsOfUseModal {
  get container(): DetoxElement {
    return Matchers.getElementByID(TermsOfUseModalSelectorsIDs.CONTAINER);
  }

  get checkbox(): DetoxElement {
    return Matchers.getElementByID(TermsOfUseModalSelectorsIDs.CHECKBOX);
  }

  get scrollArrowButton(): DetoxElement {
    return Matchers.getElementByID(
      TermsOfUseModalSelectorsIDs.SCROLL_ARROW_BUTTON,
    );
  }

  get acceptButton(): DetoxElement {
    return Matchers.getElementByID(TermsOfUseModalSelectorsIDs.ACCEPT_BUTTON);
  }

  get closeButton(): DetoxElement {
    return Matchers.getElementByID(TermsOfUseModalSelectorsIDs.CLOSE_BUTTON);
  }

  async tapAgreeCheckBox(): Promise<void> {
    await Gestures.waitAndTap(this.checkbox, {
      elemDescription: 'Terms of Use Modal Agree Checkbox',
    });
  }

  async tapScrollEndButton(): Promise<void> {
    await Gestures.waitAndTap(this.scrollArrowButton, {
      elemDescription: 'Terms of Use Modal Scroll Arrow Button',
    });
  }

  async tapAcceptButton(): Promise<void> {
    await Gestures.waitAndTap(this.acceptButton, {
      elemDescription: 'Terms of Use Modal Accept Button',
    });
  }

  async tapCloseButton(): Promise<void> {
    await Gestures.waitAndTap(this.closeButton, {
      elemDescription: 'Terms of Use Modal Close Button',
    });
  }
}

export default new TermsOfUseModal();
