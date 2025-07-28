import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import { ShareAddressIds } from '../../selectors/MultichainAccounts/ShareAddress.selectors';

class ShareAddress {
  get container(): DetoxElement {
    return Matchers.getElementByID(ShareAddressIds.SHARE_ADDRESS_CONTAINER);
  }

  get qrCode(): DetoxElement {
    return Matchers.getElementByID(ShareAddressIds.SHARE_ADDRESS_QR_CODE);
  }

  get accountAddress(): DetoxElement {
    return Matchers.getElementByID(
      ShareAddressIds.SHARE_ADDRESS_ACCOUNT_ADDRESS,
    );
  }

  get copyButton(): DetoxElement {
    return Matchers.getElementByID(ShareAddressIds.SHARE_ADDRESS_COPY_BUTTON);
  }

  get viewOnExplorerButton(): DetoxElement {
    return Matchers.getElementByID(
      ShareAddressIds.SHARE_ADDRESS_VIEW_ON_EXPLORER_BUTTON,
    );
  }

  async tapCopyButton(): Promise<void> {
    return await Gestures.waitAndTap(this.copyButton, {
      elemDescription: 'Copy Button in Share Address',
    });
  }

  async tapViewOnExplorerButton(): Promise<void> {
    await Gestures.waitAndTap(this.viewOnExplorerButton, {
      elemDescription: 'View on Explorer Button in Share Address',
    });
  }
}

export default new ShareAddress();
