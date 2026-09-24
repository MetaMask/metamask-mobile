import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import { ShareAddressIds } from '../../../app/components/Views/MultichainAccounts/sheets/ShareAddress/ShareAddress.testIds';
import { type AppiumElement } from '../../framework';

class ShareAddress {
  get container(): Promise<AppiumElement> {
    return Matchers.getElementByID(ShareAddressIds.SHARE_ADDRESS_CONTAINER);
  }

  get qrCode(): Promise<AppiumElement> {
    return Matchers.getElementByID(ShareAddressIds.SHARE_ADDRESS_QR_CODE);
  }

  get accountAddress(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      ShareAddressIds.SHARE_ADDRESS_ACCOUNT_ADDRESS,
    );
  }

  get copyButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(ShareAddressIds.SHARE_ADDRESS_COPY_BUTTON);
  }

  get viewOnExplorerButton(): Promise<AppiumElement> {
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
