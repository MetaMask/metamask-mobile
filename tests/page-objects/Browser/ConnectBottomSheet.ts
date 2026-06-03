import {
  ConnectAccountBottomSheetSelectorsIDs,
  ConnectAccountBottomSheetSelectorsText,
} from '../../../app/components/Views/MultichainAccounts/shared/ConnectAccountBottomSheet.testIds';
import Matchers from '../../framework/Matchers';
import { CommonSelectorsIDs } from '../../../app/util/Common.testIds';
import {
  encapsulated,
  EncapsulatedElementType,
} from '../../framework/EncapsulatedElement';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import UnifiedGestures from '../../framework/UnifiedGestures';

class ConnectBottomSheet {
  get container(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          ConnectAccountBottomSheetSelectorsIDs.CONTAINER,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          ConnectAccountBottomSheetSelectorsIDs.CONTAINER,
        ),
    });
  }
  get connectButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        device.getPlatform() === 'android'
          ? Matchers.getElementByLabel(CommonSelectorsIDs.CONNECT_BUTTON)
          : Matchers.getElementByID(CommonSelectorsIDs.CONNECT_BUTTON),
      appium: () =>
        PlaywrightMatchers.getElementById(CommonSelectorsIDs.CONNECT_BUTTON),
    });
  }

  get connectAccountsButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByText(
          ConnectAccountBottomSheetSelectorsText.CONNECT_ACCOUNTS,
        ),
      appium: () =>
        PlaywrightMatchers.getElementByText(
          ConnectAccountBottomSheetSelectorsText.CONNECT_ACCOUNTS,
        ),
    });
  }

  get importButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByText(
          ConnectAccountBottomSheetSelectorsText.IMPORT_ACCOUNT,
        ),
      appium: () =>
        PlaywrightMatchers.getElementByText(
          ConnectAccountBottomSheetSelectorsText.IMPORT_ACCOUNT,
        ),
    });
  }

  get selectAllButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByText(
          ConnectAccountBottomSheetSelectorsText.SELECT_ALL,
        ),
      appium: () =>
        PlaywrightMatchers.getElementByText(
          ConnectAccountBottomSheetSelectorsText.SELECT_ALL,
        ),
    });
  }

  get selectMultiButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          ConnectAccountBottomSheetSelectorsIDs.SELECT_MULTI_BUTTON,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          ConnectAccountBottomSheetSelectorsIDs.SELECT_MULTI_BUTTON,
        ),
    });
  }

  get cancelButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          ConnectAccountBottomSheetSelectorsIDs.CANCEL_BUTTON,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          ConnectAccountBottomSheetSelectorsIDs.CANCEL_BUTTON,
        ),
    });
  }

  async tapCancelButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.cancelButton, {
      elemDescription: 'Tap on the cancel button',
    });
  }

  async tapConnectButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.connectButton, {
      elemDescription: 'Tap on the connect button',
    });
  }

  async tapConnectMultipleAccountsButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.connectAccountsButton, {
      elemDescription: 'Tap on the connect multiple accounts button',
    });
  }

  async tapImportAccountOrHWButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.importButton, {
      elemDescription: 'Tap on the import account or hardware wallet button',
    });
  }

  async tapSelectAllButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.selectAllButton, {
      elemDescription: 'Tap on the select all button',
    });
  }

  async tapAccountConnectMultiSelectButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.selectMultiButton, {
      elemDescription: 'Tap on the account connect multi select button',
    });
  }

  async scrollToBottomOfModal(): Promise<void> {
    await UnifiedGestures.swipe(this.container, 'down', {
      speed: 'slow',
      elemDescription: 'Scroll to the bottom of the modal',
    });
  }
}

export default new ConnectBottomSheet();
