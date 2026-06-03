import { WhatsNewModalSelectorsIDs } from '../../../app/components/UI/WhatsNewModal/WhatsNewModal.testIds';
import Matchers from '../../framework/Matchers';
import {
  encapsulated,
  EncapsulatedElementType,
} from '../../framework/EncapsulatedElement';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import UnifiedGestures from '../../framework/UnifiedGestures';

class WhatsNewModal {
  get container(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByID(WhatsNewModalSelectorsIDs.CONTAINER),
      appium: () =>
        PlaywrightMatchers.getElementById(WhatsNewModalSelectorsIDs.CONTAINER),
    });
  }

  get closeButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(WhatsNewModalSelectorsIDs.CLOSE_BUTTON),
      appium: () =>
        PlaywrightMatchers.getElementById(
          WhatsNewModalSelectorsIDs.CLOSE_BUTTON,
        ),
    });
  }

  async tapCloseButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.closeButton, {
      elemDescription: 'Close Button in Whats New Modal',
    });
  }
}

export default new WhatsNewModal();
