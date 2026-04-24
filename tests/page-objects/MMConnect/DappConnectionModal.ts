import {
  encapsulated,
  EncapsulatedElementType,
  asPlaywrightElement,
} from '../../framework/EncapsulatedElement';
import { encapsulatedAction } from '../../framework/encapsulatedAction';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import UnifiedGestures from '../../framework/UnifiedGestures';
import { getDriver } from '../../framework/PlaywrightUtilities';
import { ConnectAccountBottomSheetSelectorsIDs } from '../../../app/components/Views/AccountConnect/ConnectAccountBottomSheet.testIds';
import { AccountCellIds } from '../../../app/component-library/components-temp/MultichainAccounts/AccountCell/AccountCell.testIds';
import { CellComponentSelectorsIDs } from '../../../app/component-library/components/Cells/Cell/CellComponent.testIds';
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
      appium: () =>
        PlaywrightMatchers.getElementByXPath(
          '//android.view.ViewGroup[@content-desc="Edit accounts"]',
        ),
    });
  }

  get permissionsTabButton(): EncapsulatedElementType {
    return encapsulated({
      appium: () =>
        PlaywrightMatchers.getElementByXPath(
          '//android.view.ViewGroup[@content-desc="Permissions"]',
        ),
    });
  }

  get editNetworksButton(): EncapsulatedElementType {
    return encapsulated({
      appium: () =>
        PlaywrightMatchers.getElementByXPath(
          '(//android.widget.TextView[@text="Edit"])[2]',
        ),
    });
  }

  get updateNetworksButton(): EncapsulatedElementType {
    return encapsulated({
      appium: () =>
        PlaywrightMatchers.getElementByXPath(
          '//android.widget.Button[@content-desc="Update"]',
        ),
    });
  }

  getAccountButton(accountName: string): EncapsulatedElementType {
    return encapsulated({
      appium: () =>
        PlaywrightMatchers.getElementByXPath(
          `//android.widget.TextView[@resource-id="${AccountCellIds.ADDRESS}" and @text="${accountName}"]`,
        ),
    });
  }

  getNetworkButton(networkName: string): EncapsulatedElementType {
    return encapsulated({
      appium: () =>
        PlaywrightMatchers.getElementByXPath(
          `//android.widget.TextView[@resource-id="${CellComponentSelectorsIDs.BASE_TITLE}" and @text="${networkName}"]`,
        ),
    });
  }

  async tapConnectButton({
    shouldCooldown = false,
    timeToCooldown = 1000,
  }: {
    shouldCooldown?: boolean;
    timeToCooldown?: number;
  } = {}): Promise<void> {
    await UnifiedGestures.waitAndTap(this.connectButton);
    if (shouldCooldown) {
      await sleep(timeToCooldown);
    }
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
        const element = await asPlaywrightElement(
          this.getNetworkButton(networkName),
        );
        await element.click();
      },
    });
  }

  async tapUpdateNetworksButton(): Promise<void> {
    await UnifiedGestures.tap(this.updateNetworksButton);
  }
}

export default new DappConnectionModal();
