import {
  ConnectedAccountModalSelectorsText,
  ConnectedAccountsSelectorsIDs,
} from '../../selectors/Browser/ConnectedAccountModal.selectors';
import { WalletViewSelectorsText } from '../../selectors/wallet/WalletView.selectors';
import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';
import TestHelpers from '../../helpers';
import type { IndexableNativeElement, NativeElement, IndexableSystemElement } from 'detox/detox';
type DetoxElement = Promise<IndexableNativeElement | NativeElement | IndexableSystemElement>;


class ConnectedAccountsModal {
  get container(): DetoxElement {
    return Matchers.getElementByID(ConnectedAccountsSelectorsIDs.CONTAINER);
  }

  get permissionsButton(): DetoxElement {
    return Matchers.getElementByText(
      ConnectedAccountModalSelectorsText.PERMISSION_LINK,
    );
  }

  get networkPicker(): DetoxElement {
    return Matchers.getElementByID(
      ConnectedAccountsSelectorsIDs.NETWORK_PICKER,
    );
  }

  get disconnectAllButton(): DetoxElement {
    return Matchers.getElementByText(
      ConnectedAccountModalSelectorsText.DISCONNECT_ALL,
    );
  }

  get disconnectButton(): DetoxElement {
    return Matchers.getElementByID(ConnectedAccountsSelectorsIDs.DISCONNECT);
  }

  get disconnectAllAccountsAndNetworksButton(): DetoxElement {
    return Matchers.getElementByID(
      ConnectedAccountsSelectorsIDs.DISCONNECT_ALL_ACCOUNTS_NETWORKS,
    );
  }

  get navigateToEditNetworksPermissionsButton(): DetoxElement {
    return Matchers.getElementByID(
      ConnectedAccountsSelectorsIDs.NAVIGATE_TO_EDIT_NETWORKS_PERMISSIONS_BUTTON,
    );
  }

  get connectAccountsButton(): DetoxElement {
    return Matchers.getElementByID(
      ConnectedAccountsSelectorsIDs.CONNECT_ACCOUNTS_BUTTON,
    );
  }

  get managePermissionsButton(): DetoxElement {
    return Matchers.getElementByID(
      ConnectedAccountsSelectorsIDs.MANAGE_PERMISSIONS,
    );
  }

  get permissionsSummaryTab(): DetoxElement {
    return Matchers.getElementByText(
      WalletViewSelectorsText.PERMISSIONS_SUMMARY_TAB,
    );
  }

  get accountsSummaryTab(): DetoxElement {
    return Matchers.getElementByText(
      WalletViewSelectorsText.ACCOUNTS_SUMMARY_TAB,
    );
  }

  get accountListBottomSheet(): DetoxElement {
    return Matchers.getElementByID(
      ConnectedAccountsSelectorsIDs.ACCOUNT_LIST_BOTTOM_SHEET,
    );
  }

  get title(): DetoxElement {
    return Matchers.getElementByText(ConnectedAccountModalSelectorsText.TITLE);
  }

  get selectAllNetworksButton(): DetoxElement {
    return Matchers.getElementByText(
      ConnectedAccountModalSelectorsText.SELECT_ALL,
    );
  }

  get disconnectNetworksButton(): DetoxElement {
    return Matchers.getElementByID(
      ConnectedAccountsSelectorsIDs.DISCONNECT_NETWORKS_BUTTON,
    );
  }

  get confirmDisconnectNetworksButton(): DetoxElement {
    return Matchers.getElementByID(
      ConnectedAccountsSelectorsIDs.CONFIRM_DISCONNECT_NETWORKS_BUTTON,
    );
  }

  async tapPermissionsButton(): Promise<void> {
    await Gestures.waitAndTap(this.permissionsButton);
  }

  async tapNetworksPicker(): Promise<void> {
    await Gestures.waitAndTap(this.networkPicker);
  }

  async tapDisconnectAllButton(): Promise<void> {
    await Gestures.waitAndTap(this.disconnectAllButton);
  }

  async tapManagePermissionsButton(): Promise<void> {
    await TestHelpers.delay(4000);
    await Gestures.waitAndTap(this.managePermissionsButton);
  }

  async tapPermissionsSummaryTab(): Promise<void> {
    await Gestures.waitAndTap(this.permissionsSummaryTab);
  }

  async tapAccountsSummaryTab(): Promise<void> {
    await TestHelpers.delay(1000);
    await Gestures.waitAndTap(this.accountsSummaryTab);
  }

  async tapAccountListBottomSheet(): Promise<void> {
    await Gestures.waitAndTap(this.accountListBottomSheet);
  }

  async tapDisconnectButton(): Promise<void> {
    await Gestures.waitAndTap(this.disconnectButton);
  }

  async tapDisconnectAllAccountsAndNetworksButton(): Promise<void> {
    await Gestures.waitAndTap(this.disconnectAllAccountsAndNetworksButton);
  }

  async tapNavigateToEditNetworksPermissionsButton(): Promise<void> {
    await Gestures.waitAndTap(this.navigateToEditNetworksPermissionsButton);
  }

  async tapSelectAllNetworksButton(): Promise<void> {
    await Gestures.waitAndTap(this.selectAllNetworksButton);
  }

  async tapDeselectAllNetworksButton(): Promise<void> {
    await Gestures.waitAndTap(this.selectAllNetworksButton);
  }

  async tapDisconnectNetworksButton(): Promise<void> {
    await Gestures.waitAndTap(this.disconnectNetworksButton);
  }

  async tapConfirmDisconnectNetworksButton(): Promise<void> {
    await Gestures.waitAndTap(this.confirmDisconnectNetworksButton);
  }

  async scrollToBottomOfModal(): Promise<void> {
    await Gestures.swipe(this.title as Promise<IndexableNativeElement>, 'down', 'fast');
  }

  async tapConnectMoreAccountsButton(): Promise<void> {
    await Gestures.waitAndTap(this.connectAccountsButton);
  }

  async getNetworkName(): Promise<string> {
    const networkNameElement = this.navigateToEditNetworksPermissionsButton;
    const elem = await networkNameElement;
    // Type assertion to access label property which exists on Detox elements
    const attributes = await (elem as IndexableNativeElement).getAttributes();
    return (attributes as { label: string }).label;
  }
}

export default new ConnectedAccountsModal();
