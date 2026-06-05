import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import Assertions from '../../framework/Assertions';
import { HardwareWalletBottomSheetSelectorsIDs } from '../../selectors/Ledger/Ledger.selectors';

class HardwareWalletBottomSheet {
  get container() {
    return Matchers.getElementByID(
      HardwareWalletBottomSheetSelectorsIDs.CONTAINER,
    );
  }

  get deviceSelectionContent() {
    return Matchers.getElementByID(
      HardwareWalletBottomSheetSelectorsIDs.DEVICE_SELECTION_CONTENT,
    );
  }

  get scanningIndicator() {
    return Matchers.getElementByID(
      HardwareWalletBottomSheetSelectorsIDs.SCANNING,
    );
  }

  get virtualDeviceItem() {
    return Matchers.getElementByText('Ledger Nano X');
  }

  get connectButton() {
    return Matchers.getElementByText('Connect');
  }

  get connectingContent() {
    return Matchers.getElementByID(
      HardwareWalletBottomSheetSelectorsIDs.CONNECTING_CONTENT,
    );
  }

  get awaitingAppContent() {
    return Matchers.getElementByID(
      HardwareWalletBottomSheetSelectorsIDs.AWAITING_APP_CONTENT,
    );
  }

  get awaitingConfirmationContent() {
    return Matchers.getElementByID(
      HardwareWalletBottomSheetSelectorsIDs.AWAITING_CONFIRMATION_CONTENT,
    );
  }

  get successContent() {
    return Matchers.getElementByID(
      HardwareWalletBottomSheetSelectorsIDs.SUCCESS_CONTENT,
    );
  }

  get errorContent() {
    return Matchers.getElementByID(
      HardwareWalletBottomSheetSelectorsIDs.ERROR_CONTENT,
    );
  }

  async waitForVisible(timeout = 60000): Promise<void> {
    // Wait for the bottom sheet container to appear in any state
    // (scanning, connecting, awaiting-confirmation, etc.)
    await Assertions.expectElementToBeVisible(this.container, {
      timeout,
    });
  }

  async waitForDeviceSelection(timeout = 60000): Promise<void> {
    // Wait for the device-selection-content (Scanning state)
    await Assertions.expectElementToBeVisible(this.deviceSelectionContent, {
      timeout,
    });
  }

  async selectVirtualDevice(): Promise<void> {
    await Gestures.waitAndTap(this.virtualDeviceItem, {
      elemDescription: 'Virtual Ledger device',
      timeout: 15000,
    });
  }

  async tapConnect(): Promise<void> {
    await Gestures.waitAndTap(this.connectButton, {
      elemDescription: 'Connect button on device selection',
    });
  }
}

export default new HardwareWalletBottomSheet();
