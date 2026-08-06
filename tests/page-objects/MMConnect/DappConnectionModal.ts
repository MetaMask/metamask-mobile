import {
  encapsulated,
  EncapsulatedElementType,
  asPlaywrightElement,
} from '../../framework/EncapsulatedElement';
import { encapsulatedAction } from '../../framework/encapsulatedAction';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import UnifiedGestures from '../../framework/UnifiedGestures';
import { getDriver } from '../../framework/PlaywrightUtilities';
import { ConnectAccountBottomSheetSelectorsIDs } from '../../../app/components/Views/MultichainAccounts/shared/ConnectAccountBottomSheet.testIds';
import {
  ConnectedAccountModalSelectorsText,
  ConnectedAccountsSelectorsIDs,
} from '../../../app/components/Views/MultichainAccounts/shared/ConnectedAccountModal.testIds';
import { sleep } from '../../framework';

class DappConnectionModal {
  get connectButton(): EncapsulatedElementType {
    return encapsulated({
      appium: () =>
        PlaywrightMatchers.getElementById(
          ConnectAccountBottomSheetSelectorsIDs.CONNECT_BUTTON,
        ),
    });
  }

  get updateAccountsButton(): EncapsulatedElementType {
    return encapsulated({
      appium: () =>
        PlaywrightMatchers.getElementById(
          ConnectAccountBottomSheetSelectorsIDs.SELECT_MULTI_BUTTON,
        ),
    });
  }

  get editAccountsButton(): EncapsulatedElementType {
    return encapsulated({
      appium: {
        android: () =>
          PlaywrightMatchers.getElementByXPath(
            '//android.view.ViewGroup[@content-desc="Edit accounts"]',
          ),
        ios: () =>
          PlaywrightMatchers.getElementById(
            ConnectedAccountsSelectorsIDs.ACCOUNT_LIST_BOTTOM_SHEET,
          ),
      },
    });
  }

  get permissionsTabButton(): EncapsulatedElementType {
    return encapsulated({
      appium: () =>
        PlaywrightMatchers.getElementByText(
          ConnectedAccountModalSelectorsText.PERMISSION_LINK,
          true,
        ),
    });
  }

  get editNetworksButton(): EncapsulatedElementType {
    return encapsulated({
      appium: () =>
        PlaywrightMatchers.getElementById(
          ConnectedAccountsSelectorsIDs.NAVIGATE_TO_EDIT_NETWORKS_PERMISSIONS_BUTTON,
        ),
    });
  }

  get updateNetworksButton(): EncapsulatedElementType {
    return encapsulated({
      appium: () => PlaywrightMatchers.getElementByText('Update', true),
    });
  }

  getAccountButton(accountName: string): EncapsulatedElementType {
    return encapsulated({
      appium: () => PlaywrightMatchers.getElementByText(accountName, true),
    });
  }

  getNetworkButton(networkName: string): EncapsulatedElementType {
    return encapsulated({
      appium: () => PlaywrightMatchers.getElementByText(networkName, true),
    });
  }

  async tapConnectButton({
    shouldCooldown = false,
    timeToCooldown = 1000,
    timeout = 15_000,
  }: {
    shouldCooldown?: boolean;
    timeToCooldown?: number;
    timeout?: number;
  } = {}): Promise<void> {
    await UnifiedGestures.waitAndTap(this.connectButton, { timeout });
    if (shouldCooldown) {
      await sleep(timeToCooldown);
    }
  }

  /**
   * Best-effort wait for the "Return to app" success toast to clear.
   */
  async waitForReturnToAppToastToDismiss(): Promise<void> {
    const toastText = 'Return to the app to continue.';
    const isVisible = async () =>
      (await PlaywrightMatchers.countElementsByText(toastText, true)) > 0;

    const appearDeadline = Date.now() + 8_000;
    let appeared = false;
    while (Date.now() < appearDeadline) {
      if (await isVisible()) {
        appeared = true;
        break;
      }
      await sleep(250);
    }
    if (!appeared) {
      return;
    }

    const dismissDeadline = Date.now() + 10_000;
    while (Date.now() < dismissDeadline) {
      if (!(await isVisible())) {
        return;
      }
      await sleep(250);
    }
    // Sticky toast must not fail the connect path — relay flush has had time.
  }

  async tapEditAccountsButton(): Promise<void> {
    await UnifiedGestures.tap(this.editAccountsButton);
  }

  async tapAccountButton(accountName: string): Promise<void> {
    await UnifiedGestures.tap(this.getAccountButton(accountName));
  }

  async tapUpdateAccountsButton(): Promise<void> {
    await UnifiedGestures.tap(this.updateAccountsButton);
  }

  async tapPermissionsTabButton(): Promise<void> {
    await UnifiedGestures.tap(this.permissionsTabButton);
  }

  async tapEditNetworksButton(): Promise<void> {
    await UnifiedGestures.tap(this.editNetworksButton);
  }

  async tapNetworkButton(networkName: string): Promise<void> {
    await encapsulatedAction({
      appium: async () => {
        const drv = getDriver();
        await drv.execute('mobile: scrollGesture', {
          left: 0,
          top: 0,
          width: 1000,
          height: 1000,
          direction: 'down',
          percent: 1.0,
        });
        const networkButton = await asPlaywrightElement(
          this.getNetworkButton(networkName),
        );
        await networkButton.click();
      },
    });
  }

  async tapUpdateNetworksButton(): Promise<void> {
    await UnifiedGestures.tap(this.updateNetworksButton);
  }
}

export default new DappConnectionModal();
