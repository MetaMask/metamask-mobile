import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';
import { SelectPaymentMethodSelectors } from '../../selectors/Ramps/SelectPaymentMethod.selectors';

class SelectPaymentMethodView {
  get continueButton() {
    return Matchers.getElementByText(
      SelectPaymentMethodSelectors.CONTINUE_BUTTON,
    );
  }

  async tapPaymentMethodOption(paymentMethod) {
    const paymentMethodOption = Matchers.getElementByText(paymentMethod);
    await Gestures.waitAndTap(paymentMethodOption);
  }

  async tapContinueButton() {
    await Gestures.waitAndTap(this.continueButton);
  }
}

export default new SelectPaymentMethodView();
