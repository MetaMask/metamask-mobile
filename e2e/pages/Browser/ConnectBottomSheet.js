import {
  ConnectAccountBottomSheetSelectorsIDs,
  ConnectAccountBottomSheetSelectorsText,
} from '../../selectors/Browser/ConnectAccountBottomSheet.selectors';
import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';
import { CommonSelectorsIDs } from '../../selectors/Common.selectors';

class ConnectBottomSheet {
  get container() {
    return Matchers.getElementByID(
      ConnectAccountBottomSheetSelectorsIDs.CONTAINER,
    );
  }
  get connectButton() {
    return device.getPlatform() === 'android'
      ? Matchers.getElementByLabel(CommonSelectorsIDs.CONNECT_BUTTON)
      : Matchers.getElementByID(CommonSelectorsIDs.CONNECT_BUTTON);
  }

  get connectAccountsButton() {
    return Matchers.getElementByText(
      ConnectAccountBottomSheetSelectorsText.CONNECT_ACCOUNTS,
    );
  }

  get importButton() {
    return Matchers.getElementByText(
      ConnectAccountBottomSheetSelectorsText.IMPORT_ACCOUNT,
    );
  }

  get selectAllButton() {
    return Matchers.getElementByText(
      ConnectAccountBottomSheetSelectorsText.SELECT_ALL,
    );
  }

  get selectMultiButton() {
    return Matchers.getElementByID(
      ConnectAccountBottomSheetSelectorsIDs.SELECT_MULTI_BUTTON,
    );
  }

  get cancelButton() {
    return Matchers.getElementByID(
      ConnectAccountBottomSheetSelectorsIDs.CANCEL_BUTTON,
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

export default new ConnectBottomSheet();
