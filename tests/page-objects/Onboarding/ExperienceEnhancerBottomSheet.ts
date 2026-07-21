import { ExperienceEnhancerBottomSheetSelectorsIDs } from '../../../app/components/Views/ExperienceEnhancerModal/ExperienceEnhancerModal.testIds';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import Assertions from '../../framework/Assertions';
import {
  asDetoxElement,
  asPlaywrightElement,
  encapsulated,
  EncapsulatedElementType,
} from '../../framework/EncapsulatedElement';
import { encapsulatedAction } from '../../framework/encapsulatedAction';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import PlaywrightGestures from '../../framework/PlaywrightGestures';
import { withImplicitWait } from '../../framework/PlaywrightUtilities';

class ExperienceEnhancerBottomSheet {
  get container(): EncapsulatedElementType {
    return Matchers.getElementByID(
      ExperienceEnhancerBottomSheetSelectorsIDs.BOTTOM_SHEET,
    );
  }

  get noThanksButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          ExperienceEnhancerBottomSheetSelectorsIDs.CANCEL_BUTTON,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          ExperienceEnhancerBottomSheetSelectorsIDs.CANCEL_BUTTON,
          { exact: true },
        ),
    });
  }

  get iAgreeButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          ExperienceEnhancerBottomSheetSelectorsIDs.ACCEPT_BUTTON,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          ExperienceEnhancerBottomSheetSelectorsIDs.ACCEPT_BUTTON,
          { exact: true },
        ),
    });
  }

  /**
   * Dismisses the marketing consent modal when shown (e.g. after login).
   * No-op when the modal is not visible.
   */
  async dismissIfPresent(): Promise<void> {
    await encapsulatedAction({
      detox: async () => {
        try {
          await Assertions.expectElementToBeVisible(this.container, {
            description: 'experience enhancer modal',
            timeout: 5_000,
          });
          await Gestures.waitAndTap(asDetoxElement(this.noThanksButton), {
            elemDescription:
              'No Thanks Button in Experience Enhancer Bottom Sheet',
          });
        } catch {
          // Modal not shown
        }
      },
      appium: async () => {
        try {
          await withImplicitWait(500, async () => {
            const noThanks = await asPlaywrightElement(this.noThanksButton);
            const exists = await noThanks.unwrap().isExisting();
            if (!exists) {
              return;
            }
            if (await noThanks.isVisible()) {
              await PlaywrightGestures.waitAndTap(noThanks, {
                checkForDisplayed: true,
                checkForEnabled: true,
                timeout: 5_000,
              });
            }
          });
        } catch {
          // Modal not shown
        }
      },
    });
  }

  async tapNoThanks(): Promise<void> {
    await encapsulatedAction({
      detox: async () => {
        await Gestures.waitAndTap(asDetoxElement(this.noThanksButton), {
          elemDescription:
            'No Thanks Button in Experience Enhancer Bottom Sheet',
        });
      },
      appium: async () => {
        await PlaywrightGestures.waitAndTap(
          await asPlaywrightElement(this.noThanksButton),
          {
            checkForDisplayed: true,
            checkForEnabled: true,
            timeout: 5_000,
          },
        );
      },
    });
  }

  async tapIAgree(): Promise<void> {
    await encapsulatedAction({
      detox: async () => {
        await Gestures.waitAndTap(asDetoxElement(this.iAgreeButton), {
          elemDescription: 'I Agree Button in Experience Enhancer Bottom Sheet',
        });
      },
      appium: async () => {
        await PlaywrightGestures.waitAndTap(
          await asPlaywrightElement(this.iAgreeButton),
          {
            checkForDisplayed: true,
            checkForEnabled: true,
            timeout: 5_000,
          },
        );
      },
    });
  }
}

export default new ExperienceEnhancerBottomSheet();
