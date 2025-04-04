import {
  ConnectedAccountModalSelectorsText,
  ConnectedAccountsSelectorsIDs,
} from '../../selectors/Browser/ConnectedAccountModal.selectors';
import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';
import TestHelpers from '../../helpers';

class ConnectedAccountsModal {
  get container() {
    return Matchers.getElementByID(ConnectedAccountsSelectorsIDs.CONTAINER);
  }

  get permissionsButton() {
    return Matchers.getElementByText(
      ConnectedAccountModalSelectorsText.PERMISSION_LINK,
    );
  }

  get networkPicker() {
    return Matchers.getElementByID(
      ConnectedAccountsSelectorsIDs.NETWORK_PICKER,
    );
  }

  get disconnectAllButton() {
    return Matchers.getElementByText(
      ConnectedAccountModalSelectorsText.DISCONNECT_ALL,
    );
  }
  get disconnectButton() {
    return Matchers.getElementByID(ConnectedAccountsSelectorsIDs.DISCONNECT);
  }

  get disconnectAllAccountsAndNetworksButton() {
    return Matchers.getElementByID(
      ConnectedAccountsSelectorsIDs.DISCONNECT_ALL_ACCOUNTS_NETWORKS,
    );
  }

  get navigateToEditNetworksPermissionsButton() {
    return Matchers.getElementByID(
      ConnectedAccountsSelectorsIDs.NAVIGATE_TO_EDIT_NETWORKS_PERMISSIONS_BUTTON,
    );
  }

  get connectAccountsButton() {
    return Matchers.getElementByID(
      ConnectedAccountsSelectorsIDs.CONNECT_ACCOUNTS_BUTTON,
    );
  }
  get managePermissionsButton() {
    return Matchers.getElementByID(
      ConnectedAccountsSelectorsIDs.MANAGE_PERMISSIONS,
    );
  }

  get title() {
    return Matchers.getElementByText(ConnectedAccountModalSelectorsText.TITLE);
  }

  get selectAllNetworksButton() {
    return Matchers.getElementByText(
      ConnectedAccountModalSelectorsText.SELECT_ALL,
    );
    // return Matchers.getElementByID(
    //   ConnectedAccountsSelectorsIDs.SELECT_ALL_NETWORKS_BUTTON,
    // );
  }

  get disconnectNetworksButton() {
    return Matchers.getElementByID(
      ConnectedAccountsSelectorsIDs.DISCONNECT_NETWORKS_BUTTON,
    );
  }

  get confirmDisconnectNetworksButton() {
    return Matchers.getElementByID(
      ConnectedAccountsSelectorsIDs.CONFIRM_DISCONNECT_NETWORKS_BUTTON,
    );
  }

  async tapPermissionsButton() {
    await Gestures.waitAndTap(this.permissionsButton);
  }

  async tapNetworksPicker() {
    await Gestures.waitAndTap(this.networkPicker);
  }

  async tapDisconnectAllButton() {
    await Gestures.waitAndTap(this.disconnectAllButton);
  }

  async tapManagePermissionsButton() {
    await TestHelpers.delay(4000);
    await Gestures.waitAndTap(this.managePermissionsButton);
  }

  async tapDisconnectButton() {
    await Gestures.waitAndTap(this.disconnectButton);
  }
  async tapDisconnectAllAccountsAndNetworksButton() {
    await Gestures.waitAndTap(this.disconnectAllAccountsAndNetworksButton);
  }

  async tapNavigateToEditNetworksPermissionsButton() {
    await Gestures.waitAndTap(this.navigateToEditNetworksPermissionsButton);
  }

  async tapSelectAllNetworksButton() {
    await Gestures.waitAndTap(this.selectAllNetworksButton);
  }

  async tapDeselectAllNetworksButton() {
    await Gestures.waitAndTap(this.selectAllNetworksButton);
  }

  async tapDisconnectNetworksButton() {
    await Gestures.waitAndTap(this.disconnectNetworksButton);
  }

  async tapConfirmDisconnectNetworksButton() {
    await Gestures.waitAndTap(this.confirmDisconnectNetworksButton);
  }

  //async tapToSetAsPrimaryAccount() {
  // }

  async scrollToBottomOfModal() {
    await Gestures.swipe(this.title, 'down', 'fast');
  }

  async tapConnectMoreAccountsButton() {
    await Gestures.waitAndTap(this.connectAccountsButton);
  }
}

export default new ConnectedAccountsModal();
