import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import Assertions from '../../framework/Assertions';
import { type AppiumElement } from '../../framework';

class DeeplinkModal {
  get continueButton(): Promise<AppiumElement> {
    return Matchers.getElementByText('Continue');
  }

  get proceedWithCaution(): Promise<AppiumElement> {
    return Matchers.getElementByText('Proceed with caution');
  }

  /**
   * Wait for the PUBLIC DeepLink interstitial, then tap Continue.
   * Prefer title readiness over tapping Continue alone — stacked destination
   * screens can leave Continue missing until the interstitial actually mounts.
   */
  async tapContinue(): Promise<void> {
    await Assertions.expectElementToBeVisible(this.proceedWithCaution, {
      timeout: 20000,
      description: 'DeepLink interstitial (Proceed with caution)',
    });
    await Gestures.waitAndTap(this.continueButton, {
      elemDescription: 'Deeplink Modal Continue Button',
      timeout: 15000,
    });
  }
}

export default new DeeplinkModal();
