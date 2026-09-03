import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import { type AppiumElement } from '../../framework';

class DeeplinkModal {
  get continueButton(): Promise<AppiumElement> {
    return Matchers.getElementByText('Continue');
  }

  get proceedWithCaution(): Promise<AppiumElement> {
    return Matchers.getElementByText('Proceed with caution');
  }

  async tapContinue(): Promise<void> {
    await Gestures.waitAndTap(this.continueButton, {
      elemDescription: 'Deeplink Modal Continue Button',
    });
  }
}

export default new DeeplinkModal();
