import { NftDetectionModalSelectorsIDs } from '../../../app/components/Views/NFTAutoDetectionModal/NftDetectionModal.testIds';
import Matchers from '../../framework/Matchers';
import {
  encapsulated,
  EncapsulatedElementType,
} from '../../framework/EncapsulatedElement';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import UnifiedGestures from '../../framework/UnifiedGestures';

class NftDetectionModal {
  get container(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(NftDetectionModalSelectorsIDs.CONTAINER),
      appium: () =>
        PlaywrightMatchers.getElementById(
          NftDetectionModalSelectorsIDs.CONTAINER,
        ),
    });
  }

  get cancelButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(NftDetectionModalSelectorsIDs.CANCEL_BUTTON),
      appium: () =>
        PlaywrightMatchers.getElementById(
          NftDetectionModalSelectorsIDs.CANCEL_BUTTON,
        ),
    });
  }

  get allowButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(NftDetectionModalSelectorsIDs.ALLOW_BUTTON),
      appium: () =>
        PlaywrightMatchers.getElementById(
          NftDetectionModalSelectorsIDs.ALLOW_BUTTON,
        ),
    });
  }

  async tapCancelButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.cancelButton, {
      elemDescription: 'Cancel Button in NFT Detection Modal',
    });
  }

  async tapAllowButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.allowButton, {
      elemDescription: 'Allow Button in NFT Detection Modal',
    });
  }
}

export default new NftDetectionModal();
