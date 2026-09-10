/* global by, element, waitFor */
import Assertions from '../../framework/Assertions';
import TestHelpers from '../../helpers';
import {
  QRScannerSelectorsIDs,
  QRConnectSelectorsIDs,
} from '../../selectors/QRHardware/QRHardware.selectors';
import { AccountSelectorSelectorsIDs } from '../../../app/components/UI/HardwareWallet/AccountSelector/AccountSelector.testIds';

class QRHardwareConnectView {
  get scannerModal() {
    return element(by.id(QRScannerSelectorsIDs.MODAL));
  }

  get scannerContainer() {
    return element(by.id(QRScannerSelectorsIDs.CONTAINER));
  }

  get keystoneButton() {
    return element(by.id(QRConnectSelectorsIDs.KEYSTONE_BUTTON));
  }

  get continueButton() {
    return element(by.id(QRConnectSelectorsIDs.CONTINUE_BUTTON));
  }

  get nextAccountsButton() {
    return element(by.id(AccountSelectorSelectorsIDs.NEXT_BUTTON));
  }

  async tapKeystoneButton(): Promise<void> {
    await TestHelpers.delay(3000);
    await waitFor(this.keystoneButton).toExist().withTimeout(30000);
    await this.keystoneButton.tap();
  }

  async tapContinue(): Promise<void> {
    await TestHelpers.delay(3000);
    await waitFor(this.continueButton).toBeVisible().withTimeout(30000);
    await this.continueButton.tap();
  }

  async waitForScanner(timeout = 60000): Promise<void> {
    // Try the modal first, fall back to the container.
    try {
      await waitFor(this.scannerModal).toBeVisible().withTimeout(timeout);
    } catch {
      await waitFor(this.scannerContainer).toBeVisible().withTimeout(10000);
    }
  }

  async assertScannerVisible(): Promise<void> {
    await Assertions.expectElementToBeVisible(this.scannerContainer, {
      timeout: 60000,
      description: 'Animated QR scanner should be visible',
    });
  }

  async waitForAccountSelector(timeout = 120000): Promise<void> {
    await waitFor(this.nextAccountsButton).toExist().withTimeout(timeout);
  }

  async assertAccountImported(): Promise<void> {
    await Assertions.expectElementToBeVisible(this.nextAccountsButton, {
      timeout: 120000,
      description:
        'Account selector should appear — camera decoded the injected QR',
    });
  }
}

export default new QRHardwareConnectView();
