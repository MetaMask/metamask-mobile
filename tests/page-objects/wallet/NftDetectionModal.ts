import { NftDetectionModalSelectorsIDs } from '../../../app/components/Views/NFTAutoDetectionModal/NftDetectionModal.testIds';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import { EncapsulatedElementType } from '../../framework';

class NftDetectionModal {
  get container(): EncapsulatedElementType {
    return Matchers.getElementByID(NftDetectionModalSelectorsIDs.CONTAINER);
  }

  get cancelButton(): EncapsulatedElementType {
    return Matchers.getElementByID(NftDetectionModalSelectorsIDs.CANCEL_BUTTON);
  }

  get allowButton(): EncapsulatedElementType {
    return Matchers.getElementByID(NftDetectionModalSelectorsIDs.ALLOW_BUTTON);
  }

  async tapCancelButton(): Promise<void> {
    await Gestures.waitAndTap(this.cancelButton, {
      elemDescription: 'Cancel Button in NFT Detection Modal',
    });
  }

  async tapAllowButton(): Promise<void> {
    await Gestures.waitAndTap(this.allowButton, {
      elemDescription: 'Allow Button in NFT Detection Modal',
    });
  }
}

export default new NftDetectionModal();
