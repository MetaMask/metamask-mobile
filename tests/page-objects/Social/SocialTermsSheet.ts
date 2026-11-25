import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import type { AppiumElement } from '../../framework/AppiumElement';
import { SocialTermsSheetSelectorsIDs } from '../../../app/components/Views/SocialLeaderboard/terms/SocialTermsSheet/SocialTermsSheet.testIds';

class SocialTermsSheet {
  get sheet(): Promise<AppiumElement> {
    return Matchers.getElementByID(SocialTermsSheetSelectorsIDs.SHEET);
  }

  get scrollToBottomButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      SocialTermsSheetSelectorsIDs.SCROLL_TO_BOTTOM_BUTTON,
    );
  }

  get agreeButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(SocialTermsSheetSelectorsIDs.AGREE_BUTTON);
  }

  /**
   * Agree stays disabled until the terms WebView reports the end. The sheet's
   * arrow scrolls there. Bottom-sheet children report isDisplayed=false.
   */
  async acceptTerms(): Promise<void> {
    await Gestures.waitAndTap(this.scrollToBottomButton, {
      elemDescription: 'Social terms - scroll to bottom',
      checkForDisplayed: false,
    });
    await Gestures.waitAndTap(this.agreeButton, {
      elemDescription: 'Social terms - Agree',
      checkForDisplayed: false,
      waitForInteractive: true,
      timeout: 15_000,
    });
  }
}

export default new SocialTermsSheet();
