import {
  ConnectAccountModalSelectorsIDs,
  ConnectAccountModalSelectorsText,
} from '../../selectors/Modals/ConnectAccountModal.selectors';
import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';
import { CommonSelectorsIDs } from '../../selectors/Common.selectors';

class ConnectModal {
  get container() {
    return Matchers.getElementByID(ConnectAccountModalSelectorsIDs.CONTAINER);
  }

  get connectButton() {
    return Matchers.getElementByID(CommonSelectorsIDs.CONNECT_BUTTON);
  }

  get connectAccountsButton() {
    return Matchers.getElementByText(
      ConnectAccountModalSelectorsText.CONNECT_ACCOUNTS,
    );
  }

  get importButton() {
    return Matchers.getElementByText(
      ConnectAccountModalSelectorsText.IMPORT_ACCOUNT,
    );
  }

  get selectAllButton() {
    return Matchers.getElementByText(
      ConnectAccountModalSelectorsText.SELECT_ALL,
    );
  }

  get selectMultiButton() {
    return Matchers.getElementByID(
      ConnectAccountModalSelectorsIDs.SELECT_MULTI_BUTTON,
    );
  }

  get cancelButton() {
    return Matchers.getElementByID(
      ConnectAccountModalSelectorsIDs.CANCEL_BUTTON,
    );
  }

  async tapCancelButton() {
    await Gestures.waitAndTap(this.connectButton);
  }

  async tapConnectButton() {
    await Gestures.waitAndTap(this.connectButton);
  }

  async tapConnectMultipleAccountsButton() {
    await Gestures.waitAndTap(this.connectAccountsButton);
  }

  async tapImportAccountOrHWButton() {
    await Gestures.waitAndTap(this.importButton);
  }

  async tapSelectAllButton() {
    await Gestures.waitAndTap(this.selectAllButton);
  }

  async tapAccountConnectMultiSelectButton() {
    await Gestures.waitAndTap(this.selectMultiButton);
  }

  async scrollToBottomOfModal() {
    await Gestures.swipe(this.container, 'down', 'slow');
  }
}

export default new ConnectModal();
