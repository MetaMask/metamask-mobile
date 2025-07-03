import Matchers from '../../framework/Matchers.ts';
import Gestures from '../../framework/Gestures.ts';
import { SelectPaymentMethodSelectors } from '../../selectors/Ramps/SelectPaymentMethod.selectors';

class SelectPaymentMethodView {
  get continueButton() {
    return Matchers.getElementByText(
      SelectPaymentMethodSelectors.CONTINUE_BUTTON,
    );
  }

  async tapPaymentMethodOption(paymentMethod) {
    const paymentMethodOption = Matchers.getElementByText(paymentMethod);
    await Gestures.waitAndTap(paymentMethodOption, {
      elemDescription: `Payment method option: ${paymentMethod}`,
      checkEnabled: false,
    });
  }

  async tapContinueButton() {
    await Gestures.waitAndTap(this.continueButton);
  }
}

export default new SelectPaymentMethodView();
