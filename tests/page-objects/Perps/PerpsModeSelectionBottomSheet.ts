import Assertions from '../../framework/Assertions';
import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';
import Utilities from '../../framework/Utilities';
import { withImplicitWait } from '../../framework/AppiumUtilities';
import { PerpsModeSelectionBottomSheetSelectorsIDs } from '../../../app/components/UI/Perps/Perps.testIds';
import { type AppiumElement } from '../../framework';

/**
 * The one-time "Choose how you trade" Lite/Pro chooser.
 * Shown on Trade → Perps when perpsProModeEnabled is on and no selection is
 * stored; app data is wiped per test, so smoke specs see it on every run.
 */
class PerpsModeSelectionBottomSheet {
  get container(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      PerpsModeSelectionBottomSheetSelectorsIDs.CONTAINER,
    );
  }

  get title(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      PerpsModeSelectionBottomSheetSelectorsIDs.TITLE,
    );
  }

  get liteOption(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      PerpsModeSelectionBottomSheetSelectorsIDs.LITE_OPTION,
    );
  }

  /**
   * True when the chooser is in the hierarchy. Existence, not visibility:
   * iOS XCUITest reports BottomSheet children isDisplayed=false while the
   * sheet is on screen, so a visibility probe would miss it. Uses
   * isExisting under a short implicit wait — WebdriverIO waitForExist
   * rejects (not false) when the element is absent, which would skip the
   * no-op path in callers.
   */
  async isChooserPresent(timeoutMs: number): Promise<boolean> {
    return withImplicitWait(timeoutMs, async () =>
      (await this.liteOption).unwrap().isExisting(),
    );
  }

  /**
   * Selects Lite on the chooser and waits for the sheet to dismiss.
   * Selecting Lite (entry 'trade') navigates to Perps home, so the dismiss
   * postcondition is what proves the tap landed — a no-op tap is retried.
   */
  async selectLiteMode(): Promise<void> {
    // Existence, not visibility: iOS XCUITest reports BottomSheet children
    // isDisplayed=false while the sheet is on screen.
    await Assertions.expectElementToExist(this.liteOption, {
      description: 'Lite mode selection option',
      timeout: 10000,
    });

    await Utilities.executeWithRetry(
      async () => {
        await Gestures.waitAndTap(this.liteOption, {
          elemDescription: 'Lite mode selection option',
          checkForDisplayed: false,
          checkEnabled: false,
          timeout: 10000,
        });

        // Sheet dismiss removes the Lite option from the hierarchy.
        await Assertions.expectElementToNotExist(this.liteOption, {
          description: 'Lite mode option should dismiss with sheet',
          timeout: 5000,
        });
      },
      {
        interval: 1000,
        timeout: 25000,
        description: 'select Lite on mode selection sheet',
      },
    );
  }
}

export default new PerpsModeSelectionBottomSheet();
