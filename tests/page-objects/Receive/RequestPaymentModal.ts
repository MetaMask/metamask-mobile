import { RequestPaymentModalSelectorsIDs } from '../../../app/components/UI/ReceiveRequest/RequestPaymentModal.testIds.ts';
import Matchers from '../../framework/Matchers.ts';
import Gestures from '../../framework/Gestures.ts';

class RequestPaymentModal {
  get requestPaymentButton(): DetoxElement {
    return device.getPlatform() === 'android'
      ? Matchers.getElementByLabel(
          RequestPaymentModalSelectorsIDs.REQUEST_BUTTON,
        )
      : Matchers.getElementByID(RequestPaymentModalSelectorsIDs.REQUEST_BUTTON);
  }

  async tapRequestPaymentButton(): Promise<void> {
    await Gestures.waitAndTap(this.requestPaymentButton, {
      elemDescription: 'Request Payment Button in Request Payment Modal',
    });
  }
}

export default new RequestPaymentModal();
