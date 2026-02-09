import Matchers from '../../framework/Matchers.ts';
import Gestures from '../../framework/Gestures.ts';
import { SendLinkViewSelectorsIDs } from '../../../app/components/UI/ReceiveRequest/SendLinkView.testIds.ts';

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
