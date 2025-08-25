import { NftDetectionModalSelectorsIDs } from '../../selectors/wallet/NftDetectionModal.selectors';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';

class NftDetectionModal {
  get container(): DetoxElement {
    return Matchers.getElementByID(NftDetectionModalSelectorsIDs.CONTAINER);
  }

  get cancelButton(): DetoxElement {
    return Matchers.getElementByID(NftDetectionModalSelectorsIDs.CANCEL_BUTTON);
  }

  get allowButton(): DetoxElement {
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
