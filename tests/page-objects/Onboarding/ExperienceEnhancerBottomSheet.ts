import { ExperienceEnhancerBottomSheetSelectorsIDs } from '../../../app/components/Views/ExperienceEnhancerModal/ExperienceEnhancerModal.testIds';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import Utilities from '../../framework/Utilities';
import type { AppiumElement } from '../../framework/AppiumElement';

class ExperienceEnhancerBottomSheet {
  get container(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      ExperienceEnhancerBottomSheetSelectorsIDs.BOTTOM_SHEET,
    );
  }

  get noThanksButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      ExperienceEnhancerBottomSheetSelectorsIDs.CANCEL_BUTTON,
    );
  }

  get iAgreeButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      ExperienceEnhancerBottomSheetSelectorsIDs.ACCEPT_BUTTON,
    );
  }

  /**
   * Dismisses the marketing consent modal when shown (e.g. after login).
   * No-op when the modal is not visible.
   */
  async dismissIfPresent(): Promise<void> {
    // Short probe: often a no-op after login. Rely on fast poll (timeout ≤ 2s
    // uses the full budget — see AppiumAssertions.pollUntilVisible).
    if (!(await Utilities.isElementVisible(this.noThanksButton, 500))) {
      return;
    }

    try {
      await Gestures.waitAndTap(this.noThanksButton, {
        elemDescription: 'No Thanks Button in Experience Enhancer Bottom Sheet',
        checkForDisplayed: true,
        checkEnabled: true,
        timeout: 5_000,
      });
    } catch {
      // Modal shown but dismiss failed — leave for caller / next attempt.
    }
  }

  async tapNoThanks(): Promise<void> {
    await Gestures.waitAndTap(this.noThanksButton, {
      elemDescription: 'No Thanks Button in Experience Enhancer Bottom Sheet',
      checkForDisplayed: true,
      checkEnabled: true,
      timeout: 5_000,
    });
  }

  async tapIAgree(): Promise<void> {
    await Gestures.waitAndTap(this.iAgreeButton, {
      elemDescription: 'I Agree Button in Experience Enhancer Bottom Sheet',
      checkForDisplayed: true,
      checkEnabled: true,
      timeout: 5_000,
    });
  }
}

export default new ExperienceEnhancerBottomSheet();
