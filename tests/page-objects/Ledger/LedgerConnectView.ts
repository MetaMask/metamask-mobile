/* global by, element, waitFor */
import Assertions from '../../framework/Assertions';
import TestHelpers from '../../helpers';
import {
  HardwareWalletBottomSheetSelectorsIDs,
  LedgerSelectAccountSelectorsIDs,
} from '../../selectors/Ledger/Ledger.selectors';
import { AddAccountBottomSheetSelectorsIDs } from '../../../app/components/Views/AddAccountActions/AddAccountBottomSheet.testIds';
import { AddWalletTestIds } from '../../../app/components/Views/AddWallet/AddWallet.testIds';
import SelectHardwareTestIds from '../../../app/components/Views/ConnectHardware/SelectHardware/SelectHardware.testIds';
import { AccountSelectorSelectorsIDs } from '../../../app/components/UI/HardwareWallet/AccountSelector/AccountSelector.testIds';

class LedgerConnectView {
  get addHardwareWalletButton() {
    return element(by.id(AddWalletTestIds.CONNECT_HARDWARE_BUTTON));
  }

  get ledgerButton() {
    return element(by.id(SelectHardwareTestIds.LEDGER_BUTTON));
  }

  get hardwareWalletBottomSheet() {
    return element(by.id(HardwareWalletBottomSheetSelectorsIDs.CONTAINER));
  }

  get deviceSelectionContent() {
    return element(
      by.id(HardwareWalletBottomSheetSelectorsIDs.DEVICE_SELECTION_CONTENT),
    );
  }

  get virtualDeviceItem() {
    return element(by.text('Ledger Nano X'));
  }

  get connectButton() {
    return element(by.text('Connect'));
  }

  get scanningIndicator() {
    return element(by.id(HardwareWalletBottomSheetSelectorsIDs.SCANNING));
  }

  get ledgerSelectAccountContainer() {
    return element(by.id(LedgerSelectAccountSelectorsIDs.CONTAINER));
  }

  get nextAccountsButton() {
    return element(by.id(AccountSelectorSelectorsIDs.NEXT_BUTTON));
  }

  get previousAccountsButton() {
    return element(by.id(AccountSelectorSelectorsIDs.PREVIOUS_BUTTON));
  }

  get forgetButton() {
    return element(by.id(AccountSelectorSelectorsIDs.FORGET_BUTTON));
  }

  get unlockButton() {
    return element(by.id(AccountSelectorSelectorsIDs.UNLOCK_BUTTON));
  }

  firstAccountCheckbox() {
    return element(by.id(`${AccountSelectorSelectorsIDs.CHECKBOX}-0`));
  }

  async tapAddHardwareWallet(): Promise<void> {
    await TestHelpers.delay(3000);
    await this.addHardwareWalletButton.tap();
  }

  async tapLedgerButton(): Promise<void> {
    await TestHelpers.delay(2000);
    await this.ledgerButton.tap();
  }

  async waitForDeviceToAppear(timeout = 15000): Promise<void> {
    await waitFor(this.virtualDeviceItem).toBeVisible().withTimeout(timeout);
  }

  async selectVirtualDevice(): Promise<void> {
    await this.virtualDeviceItem.tap();
  }

  async tapConnect(): Promise<void> {
    await this.connectButton.tap();
  }

  async waitForConnectionAndAccountDiscovery(timeout = 30000): Promise<void> {
    await waitFor(this.deviceSelectionContent)
      .not.toBeVisible()
      .withTimeout(timeout);
  }

  async tapNextAccountsButton(): Promise<void> {
    await TestHelpers.delay(1000);
    await this.nextAccountsButton.tap();
  }

  async selectFirstAccount(): Promise<void> {
    await TestHelpers.delay(1000);
    await this.firstAccountCheckbox().tap();
  }

  async tapUnlockButton(): Promise<void> {
    await TestHelpers.delay(1000);
    await this.unlockButton.tap();
  }

  async assertDeviceSelectionVisible(): Promise<void> {
    await Assertions.expectElementToBeVisible(this.deviceSelectionContent, {
      description: 'Device selection content should be visible',
    });
  }

  async assertVirtualDeviceVisible(): Promise<void> {
    await Assertions.expectElementToBeVisible(this.virtualDeviceItem, {
      description: 'Virtual Ledger device should be visible',
    });
  }
}

export default new LedgerConnectView();
