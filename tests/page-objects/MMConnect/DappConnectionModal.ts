import Assertions from '../../framework/Assertions';
import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';
import {
  getDriver,
  sleep,
  type EncapsulatedElementType,
} from '../../framework';
import { PlatformDetector } from '../../framework/PlatformLocator';
import { ConnectAccountBottomSheetSelectorsIDs } from '../../../app/components/Views/MultichainAccounts/shared/ConnectAccountBottomSheet.testIds';
import {
  ConnectedAccountModalSelectorsText,
  ConnectedAccountsSelectorsIDs,
} from '../../../app/components/Views/MultichainAccounts/shared/ConnectedAccountModal.testIds';

class DappConnectionModal {
  get connectButton(): EncapsulatedElementType {
    return Matchers.getElementByID(
      ConnectAccountBottomSheetSelectorsIDs.CONNECT_BUTTON,
    );
  }

  get updateAccountsButton(): EncapsulatedElementType {
    return Matchers.getElementByID(
      ConnectAccountBottomSheetSelectorsIDs.SELECT_MULTI_BUTTON,
    );
  }

  get editAccountsButton(): EncapsulatedElementType {
    if (PlatformDetector.isAndroid()) {
      return Matchers.getElementByNativeXPath(
        '//android.view.ViewGroup[@content-desc="Edit accounts"]',
      );
    }
    return Matchers.getElementByID(
      ConnectedAccountsSelectorsIDs.ACCOUNT_LIST_BOTTOM_SHEET,
    );
  }

  get permissionsTabButton(): EncapsulatedElementType {
    return Matchers.getElementByText(
      ConnectedAccountModalSelectorsText.PERMISSION_LINK,
    );
  }

  get editNetworksButton(): EncapsulatedElementType {
    return Matchers.getElementByID(
      ConnectedAccountsSelectorsIDs.NAVIGATE_TO_EDIT_NETWORKS_PERMISSIONS_BUTTON,
    );
  }

  get updateNetworksButton(): EncapsulatedElementType {
    return Matchers.getElementByText('Update');
  }

  getAccountButton(accountName: string): EncapsulatedElementType {
    return Matchers.getElementByText(accountName);
  }

  getNetworkButton(networkName: string): EncapsulatedElementType {
    return Matchers.getElementByText(networkName);
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
    await Gestures.waitAndTap(this.connectButton, {
      timeout,
      elemDescription: 'DappConnectionModal connect button',
    });
    if (shouldCooldown) {
      await sleep(timeToCooldown);
    }
  }

  /** Waits for the "Return to app" success toast to appear then dismiss. */
  async waitForReturnToAppToastToDismiss(): Promise<void> {
    const toastText = 'Return to the app to continue.';
    const toast = Matchers.getElementByText(toastText);
    await Assertions.expectElementToBeVisible(toast, {
      timeout: 30_000,
      description: `"${toastText}" toast did not appear within 30000ms`,
    });
    await Assertions.expectElementToNotBeVisible(toast, {
      timeout: 15_000,
      description: `"${toastText}" toast did not dismiss within 15000ms`,
    });
  }

  async tapEditAccountsButton(): Promise<void> {
    await Gestures.tap(this.editAccountsButton, {
      elemDescription: 'DappConnectionModal edit accounts',
    });
  }

  async tapAccountButton(accountName: string): Promise<void> {
    await Gestures.tap(this.getAccountButton(accountName), {
      elemDescription: `DappConnectionModal account ${accountName}`,
    });
  }

  async tapUpdateAccountsButton(): Promise<void> {
    await Gestures.tap(this.updateAccountsButton, {
      elemDescription: 'DappConnectionModal update accounts',
    });
  }

  async tapPermissionsTabButton(): Promise<void> {
    await Gestures.tap(this.permissionsTabButton, {
      elemDescription: 'DappConnectionModal permissions tab',
    });
  }

  async tapEditNetworksButton(): Promise<void> {
    await Gestures.tap(this.editNetworksButton, {
      elemDescription: 'DappConnectionModal edit networks',
    });
  }

  async tapNetworkButton(networkName: string): Promise<void> {
    const drv = getDriver();
    await drv.execute('mobile: scrollGesture', {
      left: 0,
      top: 0,
      width: 1000,
      height: 1000,
      direction: 'down',
      percent: 1.0,
    });
    await Gestures.tap(this.getNetworkButton(networkName), {
      elemDescription: `DappConnectionModal network ${networkName}`,
    });
  }

  async tapUpdateNetworksButton(): Promise<void> {
    await Gestures.tap(this.updateNetworksButton, {
      elemDescription: 'DappConnectionModal update networks',
    });
  }
}

export default new DappConnectionModal();
