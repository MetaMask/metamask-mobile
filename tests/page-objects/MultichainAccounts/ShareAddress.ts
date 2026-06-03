import Matchers from '../../framework/Matchers';
import { ShareAddressIds } from '../../../app/components/Views/MultichainAccounts/sheets/ShareAddress/ShareAddress.testIds';
import {
  encapsulated,
  EncapsulatedElementType,
} from '../../framework/EncapsulatedElement';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import UnifiedGestures from '../../framework/UnifiedGestures';

class ShareAddress {
  get container(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(ShareAddressIds.SHARE_ADDRESS_CONTAINER),
      appium: () =>
        PlaywrightMatchers.getElementById(
          ShareAddressIds.SHARE_ADDRESS_CONTAINER,
        ),
    });
  }

  get qrCode(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(ShareAddressIds.SHARE_ADDRESS_QR_CODE),
      appium: () =>
        PlaywrightMatchers.getElementById(
          ShareAddressIds.SHARE_ADDRESS_QR_CODE,
        ),
    });
  }

  get accountAddress(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(ShareAddressIds.SHARE_ADDRESS_ACCOUNT_ADDRESS),
      appium: () =>
        PlaywrightMatchers.getElementById(
          ShareAddressIds.SHARE_ADDRESS_ACCOUNT_ADDRESS,
        ),
    });
  }

  get copyButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(ShareAddressIds.SHARE_ADDRESS_COPY_BUTTON),
      appium: () =>
        PlaywrightMatchers.getElementById(
          ShareAddressIds.SHARE_ADDRESS_COPY_BUTTON,
        ),
    });
  }

  get viewOnExplorerButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          ShareAddressIds.SHARE_ADDRESS_VIEW_ON_EXPLORER_BUTTON,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          ShareAddressIds.SHARE_ADDRESS_VIEW_ON_EXPLORER_BUTTON,
        ),
    });
  }

  async tapCopyButton(): Promise<void> {
    return await UnifiedGestures.waitAndTap(this.copyButton, {
      elemDescription: 'Copy Button in Share Address',
    });
  }

  async tapViewOnExplorerButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.viewOnExplorerButton, {
      elemDescription: 'View on Explorer Button in Share Address',
    });
  }
}

export default new ShareAddress();
