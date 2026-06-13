import { WhatsNewModalSelectorsIDs } from '../../../app/components/UI/WhatsNewModal/WhatsNewModal.testIds';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import { EncapsulatedElementType } from '../../framework';

class WhatsNewModal {
  get container(): EncapsulatedElementType {
    return Matchers.getElementByID(WhatsNewModalSelectorsIDs.CONTAINER);
  }

  get closeButton(): EncapsulatedElementType {
    return Matchers.getElementByID(WhatsNewModalSelectorsIDs.CLOSE_BUTTON);
  }

  async tapCloseButton(): Promise<void> {
    await Gestures.waitAndTap(this.closeButton, {
      elemDescription: 'Close Button in Whats New Modal',
    });
  }
}

export default new WhatsNewModal();
