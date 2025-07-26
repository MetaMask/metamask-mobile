import {
  ConnectAccountBottomSheetSelectorsIDs,
  ConnectAccountBottomSheetSelectorsText,
} from '../../selectors/Browser/ConnectAccountBottomSheet.selectors';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import { CommonSelectorsIDs } from '../../selectors/Common.selectors';

class ConnectBottomSheet {
  get container(): DetoxElement {
    return Matchers.getElementByID(
      ConnectAccountBottomSheetSelectorsIDs.CONTAINER,
    );
  }
  get connectButton(): DetoxElement {
    return device.getPlatform() === 'android'
      ? Matchers.getElementByLabel(CommonSelectorsIDs.CONNECT_BUTTON)
      : Matchers.getElementByID(CommonSelectorsIDs.CONNECT_BUTTON);
  }

  get connectAccountsButton(): DetoxElement {
    return Matchers.getElementByText(
      ConnectAccountBottomSheetSelectorsText.CONNECT_ACCOUNTS,
    );
  }

  get importButton(): DetoxElement {
    return Matchers.getElementByText(
      ConnectAccountBottomSheetSelectorsText.IMPORT_ACCOUNT,
    );
  }

  get selectAllButton(): DetoxElement {
    return Matchers.getElementByText(
      ConnectAccountBottomSheetSelectorsText.SELECT_ALL,
    );
  }

  get selectMultiButton(): DetoxElement {
    return Matchers.getElementByID(
      ConnectAccountBottomSheetSelectorsIDs.SELECT_MULTI_BUTTON,
    );
  }

  get cancelButton(): DetoxElement {
    return Matchers.getElementByID(
      ConnectAccountBottomSheetSelectorsIDs.CANCEL_BUTTON,
    );
  }

  async tapCancelButton(): Promise<void> {
    await Gestures.waitAndTap(this.cancelButton, {
      elemDescription: 'Cancel button',
    });
  }

  async tapConnectButton(): Promise<void> {
    await Gestures.waitAndTap(this.connectButton, {
      elemDescription: 'Connect button',
    });
  }

  async tapConnectMultipleAccountsButton(): Promise<void> {
    await Gestures.waitAndTap(this.connectAccountsButton, {
      elemDescription: 'Connect multiple accounts button',
    });
  }

  async tapImportAccountOrHWButton(): Promise<void> {
    await Gestures.waitAndTap(this.importButton, {
      elemDescription: 'Import account or hardware wallet button',
    });
  }

  async tapSelectAllButton(): Promise<void> {
    await Gestures.waitAndTap(this.selectAllButton, {
      elemDescription: 'Select all button',
    });
  }

  async tapAccountConnectMultiSelectButton(): Promise<void> {
    await Gestures.waitAndTap(this.selectMultiButton, {
      elemDescription: 'Account connect multi select button',
    });
  }

  async scrollToBottomOfModal(): Promise<void> {
    await Gestures.swipe(this.container, 'down', {
      speed: 'slow',
      elemDescription: 'Scroll to the bottom of the modal',
    });
  }
}

export default new ConnectBottomSheet();
