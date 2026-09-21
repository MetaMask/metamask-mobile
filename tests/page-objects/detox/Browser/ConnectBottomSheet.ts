import {
  Assertions,
  Gestures,
  Matchers,
  Utilities,
} from '../../../framework/detox';
import { EncapsulatedElementType } from '../../../framework/EncapsulatedElement';
import { CommonSelectorsIDs } from '../../../../app/util/Common.testIds';

/**
 * Detox-native page object for the "Connect accounts" approval bottom sheet
 * shown when a dapp requests account permissions.
 *
 * Detox-world twin of the Appium
 * `tests/page-objects/Browser/ConnectBottomSheet.ts`.
 *
 * NOTE: the sheet is gated on the common Connect button rather than a
 * container testID — the sheet variant rendered for runtime-imported
 * hardware accounts (MultichainAccountConnect) does not expose the
 * `connect-account-modal` container id the Appium twin asserts (verified
 * against a live failure screenshot, dapp-run4 2026-09-15).
 */
class ConnectBottomSheet {
  get connectButton(): EncapsulatedElementType {
    return Matchers.getElementByID(CommonSelectorsIDs.CONNECT_BUTTON);
  }

  /**
   * Waits for the connect approval sheet to become visible by waiting for
   * its Connect button.
   * @param timeout - Max time to wait for the sheet, in ms.
   */
  async waitForVisible(timeout: number): Promise<void> {
    await Assertions.expectElementToBeVisible(this.connectButton, {
      timeout,
      description: 'Connect approval sheet Connect button should be visible',
    });
  }

  /**
   * Taps the Connect button on the approval sheet and waits for the sheet
   * to dismiss.
   */
  async tapConnectButton(): Promise<void> {
    await Gestures.waitAndTap(this.connectButton, {
      timeout: 15000,
      elemDescription: 'Connect button (approval sheet)',
    });
    await Utilities.waitForElementToDisappear(this.connectButton, 15000);
  }
}

export default new ConnectBottomSheet();
