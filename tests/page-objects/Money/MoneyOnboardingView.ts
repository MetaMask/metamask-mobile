import { MoneyOnboardingViewTestIds } from '../../../app/components/UI/Money/Views/MoneyOnboardingView/MoneyOnboardingView.testIds';
import {
  Assertions,
  Gestures,
  Matchers,
  Utilities,
  type AppiumElement,
} from '../../framework';

class MoneyOnboardingView {
  get screen(): Promise<AppiumElement> {
    return Matchers.getElementByID(MoneyOnboardingViewTestIds.SCREEN);
  }

  get closeButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(MoneyOnboardingViewTestIds.CLOSE_BUTTON);
  }

  /**
   * Taps the close button of the Money intro screen, then waits for the screen
   * to disappear. Safe to call when the screen is not shown (returns false
   * immediately after the timeout).
   *
   * In performance builds, MoneyOnboardingViewE2E renders null (no screen
   * element), so the visibility check returns false and this is a cheap no-op.
   *
   * @returns true when the screen was found and dismissed, false otherwise
   */
  async dismissIfPresent(
    options: { timeoutMs?: number } = {},
  ): Promise<boolean> {
    const { timeoutMs = 1_000 } = options;

    if (!(await Utilities.isElementVisible(this.screen, timeoutMs))) {
      return false;
    }

    await Gestures.waitAndTap(this.closeButton, {
      elemDescription: 'Money onboarding close button',
    });

    await Assertions.expectElementToNotBeVisible(this.screen, {
      timeout: 5_000,
    });
    return true;
  }
}

export default new MoneyOnboardingView();
