import Matchers from '../../framework/Matchers';
import { SelectPaymentMethodSelectors } from '../../selectors/Ramps/SelectPaymentMethod.selectors';
import {
  encapsulated,
  EncapsulatedElementType,
} from '../../framework/EncapsulatedElement';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import UnifiedGestures from '../../framework/UnifiedGestures';

class SelectPaymentMethodView {
  get continueButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByText(SelectPaymentMethodSelectors.CONTINUE_BUTTON),
      appium: () =>
        PlaywrightMatchers.getElementByText(
          SelectPaymentMethodSelectors.CONTINUE_BUTTON,
        ),
    });
  }

  async tapPaymentMethodOption(paymentMethod: string): Promise<void> {
    const paymentMethodOption = Matchers.getElementByText(paymentMethod);
    await UnifiedGestures.waitAndTap(paymentMethodOption, {
      elemDescription: `Payment Method "${paymentMethod}" in Select Payment Method View`,
    });
  }

  async tapContinueButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.continueButton, {
      elemDescription: 'Continue Button in Select Payment Method View',
    });
  }
}

export default new SelectPaymentMethodView();
