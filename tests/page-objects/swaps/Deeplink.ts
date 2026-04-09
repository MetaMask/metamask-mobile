import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';

class DeeplinkModal {
  get continueButton(): DetoxElement {
    return Matchers.getElementByText('Continue');
  }

  get proceedWithCaution(): DetoxElement {
    return Matchers.getElementByText('Proceed with caution');
  }

  async tapContinue(): Promise<void> {
    await Gestures.waitAndTap(this.continueButton, {
      elemDescription: 'Deeplink Modal Continue Button',
    });
  }
}

export default new DeeplinkModal();
