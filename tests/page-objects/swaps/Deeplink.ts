import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import { EncapsulatedElementType } from '../../framework';

class DeeplinkModal {
  get continueButton(): EncapsulatedElementType {
    return Matchers.getElementByText('Continue');
  }

  get proceedWithCaution(): EncapsulatedElementType {
    return Matchers.getElementByText('Proceed with caution');
  }

  async tapContinue(): Promise<void> {
    await Gestures.waitAndTap(this.continueButton, {
      elemDescription: 'Deeplink Modal Continue Button',
    });
  }
}

export default new DeeplinkModal();
