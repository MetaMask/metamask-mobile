import { AddDeviceToWalletTestIds } from '../../../app/components/Views/AddDeviceToWallet/AddDeviceToWallet.testIds';
import Matchers from '../../framework/Matchers';
import Assertions from '../../framework/Assertions';
import Gestures from '../../framework/Gestures';
import type { AppiumElement } from '../../framework/AppiumElement';

class AddDeviceToWalletView {
  get container(): Promise<AppiumElement> {
    return Matchers.getElementByID(AddDeviceToWalletTestIds.SCREEN);
  }

  get scanQrCodeButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      AddDeviceToWalletTestIds.SCAN_QR_CODE_BUTTON,
    );
  }

  async expectScreenVisible(timeout = 15_000): Promise<void> {
    await Assertions.expectElementToBeVisible(this.container, {
      description: 'Add Device to Wallet screen should be visible',
      timeout,
    });
  }

  async tapScanQrCode(): Promise<void> {
    await Gestures.waitAndTap(this.scanQrCodeButton, {
      elemDescription: 'Add Device Scan QR Code button',
      timeout: 15_000,
    });
  }
}

export default new AddDeviceToWalletView();
