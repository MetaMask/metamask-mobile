import { ExperienceEnhancerBottomSheetSelectorsIDs } from '../../../app/components/Views/ExperienceEnhancerModal/ExperienceEnhancerModal.testIds';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import Assertions from '../../framework/Assertions';
import { EncapsulatedElementType } from '../../framework/EncapsulatedElement';

class ExperienceEnhancerBottomSheet {
  get container(): EncapsulatedElementType {
    return Matchers.getElementByID(
      ExperienceEnhancerBottomSheetSelectorsIDs.BOTTOM_SHEET,
    );
  }

  get noThanksButton(): EncapsulatedElementType {
    return Matchers.getElementByID(
      ExperienceEnhancerBottomSheetSelectorsIDs.CANCEL_BUTTON,
    );
  }

  get iAgreeButton(): EncapsulatedElementType {
    return Matchers.getElementByID(
      ExperienceEnhancerBottomSheetSelectorsIDs.ACCEPT_BUTTON,
    );
  }

  /**
   * Dismisses the marketing consent modal when shown (e.g. after login).
   * No-op when the modal is not visible.
   */
  async dismissIfPresent(): Promise<void> {
    try {
      await Assertions.expectElementToBeVisible(this.noThanksButton, {
        description: 'experience enhancer modal',
        timeout: 5_000,
      });
      await Gestures.waitAndTap(this.noThanksButton, {
        elemDescription: 'No Thanks Button in Experience Enhancer Bottom Sheet',
        checkForDisplayed: true,
        checkEnabled: true,
        timeout: 5_000,
      });
    } catch {
      // Modal not shown
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
