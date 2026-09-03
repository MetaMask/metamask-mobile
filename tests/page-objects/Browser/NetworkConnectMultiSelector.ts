import { NetworkConnectMultiSelectorSelectorsIDs } from '../../../app/components/Views/NetworkConnect/NetworkConnectMultiSelector.testIds';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import Assertions from '../../framework/Assertions';
import { PlatformDetector } from '../../framework/PlatformLocator';

class NetworkConnectMultiSelector {
  get updateButton() {
    return Matchers.getElementByID(
      NetworkConnectMultiSelectorSelectorsIDs.UPDATE_CHAIN_PERMISSIONS,
    );
  }

  get backButton() {
    return Matchers.getElementByID(
      NetworkConnectMultiSelectorSelectorsIDs.BACK_BUTTON,
    );
  }

  getNetworkRow(networkName: string) {
    const escaped = networkName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return Matchers.getElementByID(
      new RegExp(`^${escaped}-(selected|not-selected)$`),
    );
  }

  async tapUpdateButton(): Promise<void> {
    await Gestures.waitAndTap(this.updateButton, {
      elemDescription: 'Tap on the update button',
    });
  }

  async tapBackButton(): Promise<void> {
    await Gestures.waitAndTap(this.backButton, {
      elemDescription: 'Tap on the back button',
    });
  }

  async isNetworkChainPermissionSelected(chainName: string): Promise<void> {
    const el = Matchers.getElementByID(`${chainName}-selected`);
    if (PlatformDetector.isIOSAppium()) {
      await Assertions.expectElementToExist(el, {
        timeout: 10000,
        description: `Network chain permission ${chainName} should be selected`,
      });
      return;
    }
    await Assertions.expectElementToBeVisible(el, {
      timeout: 10000,
      description: `Network chain permission ${chainName} should be selected`,
    });
  }

  async isNetworkChainPermissionNotSelected(chainName: string): Promise<void> {
    const el = Matchers.getElementByID(`${chainName}-not-selected`);
    if (PlatformDetector.isIOSAppium()) {
      await Assertions.expectElementToExist(el, {
        timeout: 10000,
        description: `Network chain permission ${chainName} should not be selected`,
      });
      return;
    }
    await Assertions.expectElementToBeVisible(el, {
      timeout: 10000,
      description: `Network chain permission ${chainName} should not be selected`,
    });
  }

  async selectNetworkChainPermission(chainName: string): Promise<void> {
    const row = this.getNetworkRow(chainName);
    await Gestures.waitAndTap(row, {
      elemDescription: `Tap on the network chain permission ${chainName}`,
      checkForDisplayed: !PlatformDetector.isIOSAppium(),
    });
  }
}

export default new NetworkConnectMultiSelector();
