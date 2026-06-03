import Matchers from '../../framework/Matchers';
import {
  encapsulated,
  EncapsulatedElementType,
} from '../../framework/EncapsulatedElement';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import UnifiedGestures from '../../framework/UnifiedGestures';

class DeeplinkModal {
  get continueButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByText('Continue'),
      appium: () => PlaywrightMatchers.getElementByText('Continue'),
    });
  }

  get proceedWithCaution(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByText('Proceed with caution'),
      appium: () => PlaywrightMatchers.getElementByText('Proceed with caution'),
    });
  }

  async tapContinue(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.continueButton, {
      elemDescription: 'Deeplink Modal Continue Button',
    });
  }
}

export default new DeeplinkModal();
