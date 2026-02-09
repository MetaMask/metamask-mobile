import { WhatsNewModalSelectorsIDs } from '../../../app/components/UI/WhatsNewModal/WhatsNewModal.testIds.ts';
import Matchers from '../../framework/Matchers.ts';
import Gestures from '../../framework/Gestures.ts';

class WhatsNewModal {
  get container(): DetoxElement {
    return Matchers.getElementByID(WhatsNewModalSelectorsIDs.CONTAINER);
  }

  get closeButton(): DetoxElement {
    return Matchers.getElementByID(WhatsNewModalSelectorsIDs.CLOSE_BUTTON);
  }

  async tapCloseButton(): Promise<void> {
    await Gestures.waitAndTap(this.closeButton, {
      elemDescription: 'Close Button in Whats New Modal',
    });
  }
}

export default new WhatsNewModal();
