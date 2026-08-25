import { TermsOfUseModalSelectorsIDs } from '../../../app/util/termsOfUse/TermsOfUseModal.testIds';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import type { AppiumElement } from '../../framework/AppiumElement';
import { PlatformDetector } from '../../framework/PlatformLocator';

class TermsOfUseModal {
  get container(): Promise<AppiumElement> {
    return Matchers.getElementByID(TermsOfUseModalSelectorsIDs.CONTAINER);
  }

  get checkbox(): Promise<AppiumElement> {
    return Matchers.getElementByID(TermsOfUseModalSelectorsIDs.CHECKBOX);
  }

  get scrollArrowButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      TermsOfUseModalSelectorsIDs.SCROLL_ARROW_BUTTON,
    );
  }

  get acceptButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(TermsOfUseModalSelectorsIDs.ACCEPT_BUTTON);
  }

  get webview(): Promise<AppiumElement> {
    return Matchers.getElementByID(TermsOfUseModalSelectorsIDs.WEBVIEW);
  }

  get lastUpdatedText(): Promise<AppiumElement> {
    return Matchers.getElementByNativeXPath(
      this.getCatchAllXPath('Last Updated'),
    );
  }

  get closeButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(TermsOfUseModalSelectorsIDs.CLOSE_BUTTON);
  }

  private getCatchAllXPath(identifier: string): string {
    if (PlatformDetector.isAndroid()) {
      return `//*[@resource-id='${identifier}' or contains(@text,'${identifier}') or contains(@content-desc,'${identifier}')]`;
    }
    return `//*[contains(@name,'${identifier}') or contains(@label,'${identifier}') or contains(@text,'${identifier}')]`;
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
