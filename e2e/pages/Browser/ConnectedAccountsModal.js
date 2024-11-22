import {
  ConnectedAccountModalSelectorsText,
  ConnectedAccountsSelectorsIDs,
} from '../../selectors/Browser/ConnectedAccountModal.selectors';
import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';
import TestHelpers from '../../helpers';

class ConnectedAccountsModal {
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
    return Matchers.getElementByText(
      ConnectedAccountModalSelectorsText.DISCONNECT,
    );
  }
  get disconnectAllAccountsAndNetworksButton() {
    return Matchers.getElementByText(
      ConnectedAccountModalSelectorsText.DISCONNECT_ALL_ACCOUNTS_NETWORKS,
    );
  }

  get connectAccountsButton() {
    return Matchers.getElementByID(
      ConnectedAccountsSelectorsIDs.CONNECT_ACCOUNTS_BUTTON,
    );
  }
  get managePermissionsButton() {
    return Matchers.getElementByText(
      ConnectedAccountModalSelectorsText.MANAGE_PERMISSIONS,
    );
  }

  get title() {
    return Matchers.getElementByText(ConnectedAccountModalSelectorsText.TITLE);
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
    await Gestures.waitAndTap(this.managePermissionsButton);
  }

  async tapDisconnectButton() {
    await Gestures.waitAndTap(this.disconnectButton);
  }
  async tapDisconnectAllAccountsAndNetworksButton() {
    await Gestures.waitAndTap(this.disconnectAllAccountsAndNetworksButton);
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
