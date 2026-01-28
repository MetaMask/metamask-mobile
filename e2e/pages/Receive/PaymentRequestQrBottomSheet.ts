import Matchers from '../../../tests/framework/Matchers';
import Gestures from '../../../tests/framework/Gestures';
import { SendLinkViewSelectorsIDs } from '../../../app/components/UI/ReceiveRequest/SendLinkView.testIds';

class PaymentRequestQrBottomSheet {
  get container(): DetoxElement {
    return Matchers.getElementByID(SendLinkViewSelectorsIDs.QR_MODAL);
  }

  get closeButton(): DetoxElement {
    return Matchers.getElementByID(
      SendLinkViewSelectorsIDs.CLOSE_QR_MODAL_BUTTON,
    );
  }

  async tapCloseButton(): Promise<void> {
    await Gestures.waitAndTap(this.closeButton, {
      elemDescription: 'Close Button in Payment Request QR Bottom Sheet',
    });
  }
}

export default new PaymentRequestQrBottomSheet();
