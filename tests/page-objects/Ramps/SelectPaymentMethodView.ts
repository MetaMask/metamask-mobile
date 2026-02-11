import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import { SelectPaymentMethodSelectors } from '../../selectors/Ramps/SelectPaymentMethod.selectors';

class SelectPaymentMethodView {
  get continueButton(): DetoxElement {
    return Matchers.getElementByText(
      SelectPaymentMethodSelectors.CONTINUE_BUTTON,
    );
  }

  async tapPaymentMethodOption(paymentMethod: string): Promise<void> {
    const paymentMethodOption = Matchers.getElementByText(paymentMethod);
    await Gestures.waitAndTap(paymentMethodOption, {
      elemDescription: `Payment Method "${paymentMethod}" in Select Payment Method View`,
    });
  }

  async tapContinueButton(): Promise<void> {
    await Gestures.waitAndTap(this.continueButton, {
      elemDescription: 'Continue Button in Select Payment Method View',
    });
  }
}

export default new SelectPaymentMethodView();
