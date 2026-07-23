import { AddDeviceToWalletTestIds } from '../../../app/components/Views/AddDeviceToWallet/AddDeviceToWallet.testIds';
import Matchers from '../../framework/Matchers';
import Assertions from '../../framework/Assertions';
import {
  encapsulated,
  EncapsulatedElementType,
} from '../../framework/EncapsulatedElement';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import UnifiedGestures from '../../framework/UnifiedGestures';

class AddDeviceToWalletView {
  get container(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByID(AddDeviceToWalletTestIds.SCREEN),
      appium: () =>
        PlaywrightMatchers.getElementById(AddDeviceToWalletTestIds.SCREEN, {
          exact: true,
        }),
    });
  }

  get scanQrCodeButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(AddDeviceToWalletTestIds.SCAN_QR_CODE_BUTTON),
      appium: () =>
        PlaywrightMatchers.getElementById(
          AddDeviceToWalletTestIds.SCAN_QR_CODE_BUTTON,
          { exact: true },
        ),
    });
  }

  async expectScreenVisible(timeout = 15_000): Promise<void> {
    await Assertions.expectElementToBeVisible(this.container, {
      description: 'Add Device to Wallet screen should be visible',
      timeout,
    });
  }

  async tapScanQrCode(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.scanQrCodeButton, {
      description: 'Add Device Scan QR Code button',
      timeout: 15_000,
    });
  }
}

export default new AddDeviceToWalletView();
