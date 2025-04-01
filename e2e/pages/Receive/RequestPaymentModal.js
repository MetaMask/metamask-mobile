import { RequestPaymentModalSelectorsIDs } from '../../selectors/Receive/RequestPaymentModal.selectors';
import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';

class RequestPaymentModal {
  get requestPaymentButton() {
    return device.getPlatform() === 'android'
      ? Matchers.getElementByLabel(
          RequestPaymentModalSelectorsIDs.REQUEST_BUTTON,
        )
      : Matchers.getElementByID(RequestPaymentModalSelectorsIDs.REQUEST_BUTTON);
  }

  async tapRequestPaymentButton() {
    await Gestures.waitAndTap(this.requestPaymentButton);
  }
}

export default new RequestPaymentModal();
