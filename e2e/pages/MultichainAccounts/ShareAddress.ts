import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';
import { ShareAddressIds } from '../../selectors/MultichainAccounts/ShareAddress.selectors';

class ShareAddress {
  get container() {
    return Matchers.getElementByID(ShareAddressIds.SHARE_ADDRESS_CONTAINER);
  }

  get qrCode() {
    return Matchers.getElementByID(ShareAddressIds.SHARE_ADDRESS_QR_CODE);
  }

  get accountAddress() {
    return Matchers.getElementByID(
      ShareAddressIds.SHARE_ADDRESS_ACCOUNT_ADDRESS,
    );
  }

  get copyButton() {
    return Matchers.getElementByID(ShareAddressIds.SHARE_ADDRESS_COPY_BUTTON);
  }

  get viewOnExplorerButton() {
    return Matchers.getElementByID(
      ShareAddressIds.SHARE_ADDRESS_VIEW_ON_EXPLORER_BUTTON,
    );
  }

  async tapCopyButton() {
    return await Gestures.waitAndTap(this.copyButton);
  }

  async tapViewOnExplorerButton() {
    await Gestures.waitAndTap(this.viewOnExplorerButton);
  }
}

export default new ShareAddress();
