import {
  ConnectedAccountModalSelectorsText,
  ConnectedAccountsSelectorsIDs,
} from '../../../app/components/Views/MultichainAccounts/shared/ConnectedAccountModal.testIds';
import { WalletViewSelectorsText } from '../../../app/components/Views/Wallet/WalletView.testIds';
import Matchers from '../../framework/Matchers';
import { waitFor } from 'detox';
import type {
  IndexableNativeElement,
  NativeElement,
  IndexableSystemElement,
} from 'detox/detox';
import {
  encapsulated,
  EncapsulatedElementType,
  asPlaywrightElement,
} from '../../framework/EncapsulatedElement';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import UnifiedGestures from '../../framework/UnifiedGestures';
import { FrameworkDetector } from '../../framework/FrameworkDetector';
type DetoxElement = Promise<
  IndexableNativeElement | NativeElement | IndexableSystemElement
>;

class ConnectedAccountsModal {
  get container(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(ConnectedAccountsSelectorsIDs.CONTAINER),
      appium: () =>
        PlaywrightMatchers.getElementById(
          ConnectedAccountsSelectorsIDs.CONTAINER,
        ),
    });
  }

  get permissionsButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByText(
          ConnectedAccountModalSelectorsText.PERMISSION_LINK,
        ),
      appium: () =>
        PlaywrightMatchers.getElementByText(
          ConnectedAccountModalSelectorsText.PERMISSION_LINK,
        ),
    });
  }

  get networkPicker(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(ConnectedAccountsSelectorsIDs.NETWORK_PICKER),
      appium: () =>
        PlaywrightMatchers.getElementById(
          ConnectedAccountsSelectorsIDs.NETWORK_PICKER,
        ),
    });
  }

  get disconnectAllButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByText(
          ConnectedAccountModalSelectorsText.DISCONNECT_ALL,
        ),
      appium: () =>
        PlaywrightMatchers.getElementByText(
          ConnectedAccountModalSelectorsText.DISCONNECT_ALL,
        ),
    });
  }

  get disconnectButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(ConnectedAccountsSelectorsIDs.DISCONNECT),
      appium: () =>
        PlaywrightMatchers.getElementById(
          ConnectedAccountsSelectorsIDs.DISCONNECT,
        ),
    });
  }

  get disconnectAllAccountsAndNetworksButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          ConnectedAccountsSelectorsIDs.DISCONNECT_ALL_ACCOUNTS_NETWORKS,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          ConnectedAccountsSelectorsIDs.DISCONNECT_ALL_ACCOUNTS_NETWORKS,
        ),
    });
  }

  get navigateToEditAccountsPermissionsButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          ConnectedAccountsSelectorsIDs.NAVIGATE_TO_EDIT_ACCOUNTS_PERMISSIONS_BUTTON,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          ConnectedAccountsSelectorsIDs.NAVIGATE_TO_EDIT_ACCOUNTS_PERMISSIONS_BUTTON,
        ),
    });
  }

  get navigateToEditNetworksPermissionsButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          ConnectedAccountsSelectorsIDs.NAVIGATE_TO_EDIT_NETWORKS_PERMISSIONS_BUTTON,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          ConnectedAccountsSelectorsIDs.NAVIGATE_TO_EDIT_NETWORKS_PERMISSIONS_BUTTON,
        ),
    });
  }

  get connectAccountsButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          ConnectedAccountsSelectorsIDs.CONNECT_ACCOUNTS_BUTTON,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          ConnectedAccountsSelectorsIDs.CONNECT_ACCOUNTS_BUTTON,
        ),
    });
  }

  get managePermissionsButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          ConnectedAccountsSelectorsIDs.MANAGE_PERMISSIONS,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          ConnectedAccountsSelectorsIDs.MANAGE_PERMISSIONS,
        ),
    });
  }

  get permissionsSummaryTab(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByText(
          WalletViewSelectorsText.PERMISSIONS_SUMMARY_TAB,
        ),
      appium: () =>
        PlaywrightMatchers.getElementByText(
          WalletViewSelectorsText.PERMISSIONS_SUMMARY_TAB,
        ),
    });
  }

  get accountsSummaryTab(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByText(WalletViewSelectorsText.ACCOUNTS_SUMMARY_TAB),
      appium: () =>
        PlaywrightMatchers.getElementByText(
          WalletViewSelectorsText.ACCOUNTS_SUMMARY_TAB,
        ),
    });
  }

  get accountListBottomSheet(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          ConnectedAccountsSelectorsIDs.ACCOUNT_LIST_BOTTOM_SHEET,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          ConnectedAccountsSelectorsIDs.ACCOUNT_LIST_BOTTOM_SHEET,
        ),
    });
  }

  get title(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByText(ConnectedAccountModalSelectorsText.TITLE),
      appium: () =>
        PlaywrightMatchers.getElementByText(
          ConnectedAccountModalSelectorsText.TITLE,
        ),
    });
  }

  get selectAllNetworksButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByText(
          ConnectedAccountModalSelectorsText.SELECT_ALL,
        ),
      appium: () =>
        PlaywrightMatchers.getElementByText(
          ConnectedAccountModalSelectorsText.SELECT_ALL,
        ),
    });
  }

  get disconnectNetworksButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          ConnectedAccountsSelectorsIDs.DISCONNECT_NETWORKS_BUTTON,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          ConnectedAccountsSelectorsIDs.DISCONNECT_NETWORKS_BUTTON,
        ),
    });
  }

  get confirmDisconnectNetworksButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          ConnectedAccountsSelectorsIDs.CONFIRM_DISCONNECT_NETWORKS_BUTTON,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          ConnectedAccountsSelectorsIDs.CONFIRM_DISCONNECT_NETWORKS_BUTTON,
        ),
    });
  }

  async tapPermissionsButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.permissionsButton, {
      elemDescription: 'Permissions button',
    });
  }

  async tapNetworksPicker(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.networkPicker, {
      elemDescription: 'Network picker',
    });
  }

  async tapDisconnectAllButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.disconnectAllButton, {
      elemDescription: 'Disconnect all button',
    });
  }

  async tapManagePermissionsButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.managePermissionsButton, {
      elemDescription: 'Manage permissions button',
      waitForElementToDisappear: true,
    });
  }

  async tapPermissionsSummaryTab(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.permissionsSummaryTab, {
      elemDescription: 'Permissions summary tab',
    });
  }

  async tapAccountsSummaryTab(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.accountsSummaryTab, {
      elemDescription: 'Accounts summary tab',
    });
  }

  async tapAccountListBottomSheet(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.accountListBottomSheet, {
      elemDescription: 'Account list bottom sheet',
    });
  }

  async tapDisconnectButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.disconnectButton, {
      elemDescription: 'Disconnect button',
    });
  }

  async tapDisconnectAllAccountsAndNetworksButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(
      this.disconnectAllAccountsAndNetworksButton,
      {
        elemDescription: 'Disconnect all accounts and networks button',
      },
    );
  }

  async tapNavigateToEditAccountsPermissionsButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(
      this.navigateToEditAccountsPermissionsButton,
      {
        elemDescription: 'Navigate to edit accounts permissions button',
      },
    );
  }

  async tapNavigateToEditNetworksPermissionsButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(
      this.navigateToEditNetworksPermissionsButton,
      {
        elemDescription: 'Navigate to edit networks permissions button',
      },
    );
  }

  async tapSelectAllNetworksButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.selectAllNetworksButton, {
      elemDescription: 'Select all networks button',
    });
  }

  async tapDeselectAllNetworksButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.selectAllNetworksButton, {
      elemDescription: 'Deselect all networks button',
    });
  }

  async tapDisconnectNetworksButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.disconnectNetworksButton, {
      elemDescription: 'Disconnect networks button',
    });
  }

  async tapConfirmDisconnectNetworksButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.confirmDisconnectNetworksButton, {
      elemDescription: 'Confirm disconnect networks button',
    });
  }

  async scrollToBottomOfModal(): Promise<void> {
    await UnifiedGestures.swipe(
      this.title as Promise<IndexableNativeElement>,
      'down',
      {
        speed: 'fast',
        elemDescription: 'Scroll to bottom of modal',
      },
    );
  }

  async tapConnectMoreAccountsButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.connectAccountsButton, {
      elemDescription: 'Connect more accounts button',
    });
  }

  async getNetworkName(): Promise<string> {
    if (FrameworkDetector.isAppium()) {
      const el = await asPlaywrightElement(
        this.navigateToEditNetworksPermissionsButton,
      );
      return el.textContent();
    }
    const elem = await this.navigateToEditNetworksPermissionsButton;
    const attributes = await (elem as IndexableNativeElement).getAttributes();
    return (attributes as { label: string }).label;
  }

  async getDisplayedAccountNames(): Promise<string[]> {
    const possibleAccountNames = [
      'Account 1',
      'Account 2',
      'Account 3',
      'Account 4',
      'Account 5',
      'Solana Account 1',
      'Solana Account 2',
      'Solana Account 3',
    ];
    const displayedAccounts: string[] = [];

    for (const accountName of possibleAccountNames) {
      try {
        const textElement = await Matchers.getElementByText(accountName);
        await waitFor(textElement).toBeVisible().withTimeout(1000);
        displayedAccounts.push(accountName);
      } catch (e) {
        // Account not displayed, continue
      }
    }

    return displayedAccounts;
  }
}

export default new ConnectedAccountsModal();
