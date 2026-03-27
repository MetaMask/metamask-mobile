import { TermsOfUseModalSelectorsIDs } from '../../../app/util/termsOfUse/TermsOfUseModal.testIds';
import Matchers from '../../framework/Matchers';
import {
  encapsulated,
  EncapsulatedElementType,
} from '../../framework/EncapsulatedElement';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import UnifiedGestures from '../../framework/UnifiedGestures';

class TermsOfUseModal {
  get container(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(TermsOfUseModalSelectorsIDs.CONTAINER),
      appium: () =>
        PlaywrightMatchers.getElementById(
          TermsOfUseModalSelectorsIDs.CONTAINER,
          {
            exact: true,
          },
        ),
    });
  }

  get checkbox(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(TermsOfUseModalSelectorsIDs.CHECKBOX),
      appium: () =>
        PlaywrightMatchers.getElementById(
          TermsOfUseModalSelectorsIDs.CHECKBOX,
          {
            exact: true,
          },
        ),
    });
  }

  get scrollArrowButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          TermsOfUseModalSelectorsIDs.SCROLL_ARROW_BUTTON,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          TermsOfUseModalSelectorsIDs.SCROLL_ARROW_BUTTON,
          {
            exact: true,
          },
        ),
    });
  }

  get acceptButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(TermsOfUseModalSelectorsIDs.ACCEPT_BUTTON),
      appium: () =>
        PlaywrightMatchers.getElementById(
          TermsOfUseModalSelectorsIDs.ACCEPT_BUTTON,
          {
            exact: true,
          },
        ),
    });
  }

  get webview(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByID(TermsOfUseModalSelectorsIDs.WEBVIEW),
      appium: () =>
        PlaywrightMatchers.getElementById(TermsOfUseModalSelectorsIDs.WEBVIEW, {
          exact: true,
        }),
    });
  }

  get lastUpdatedText(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByTextContains('Last Updated'),
      appium: () => PlaywrightMatchers.getElementByCatchAll('Last Updated'),
    });
  }

  get closeButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(TermsOfUseModalSelectorsIDs.CLOSE_BUTTON),
      appium: () =>
        PlaywrightMatchers.getElementById(
          TermsOfUseModalSelectorsIDs.CLOSE_BUTTON,
          {
            exact: true,
          },
        ),
    });
  }

  async tapAgreeCheckBox(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.checkbox, {
      description: 'Terms of Use Modal Agree Checkbox',
    });
  }

  async tapScrollEndButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.scrollArrowButton, {
      description: 'Terms of Use Modal Scroll Arrow Button',
    });
  }

  async tapAcceptButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.acceptButton, {
      description: 'Terms of Use Modal Accept Button',
    });
  }

  async tapCloseButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.closeButton, {
      description: 'Terms of Use Modal Close Button',
    });
  }
}

export default new TermsOfUseModal();
