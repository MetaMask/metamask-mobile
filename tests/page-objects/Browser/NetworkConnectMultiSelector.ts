import { NetworkConnectMultiSelectorSelectorsIDs } from '../../../app/components/Views/NetworkConnect/NetworkConnectMultiSelector.testIds';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import {
  Assertions,
  EncapsulatedElementType,
  encapsulated,
} from '../../framework';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';

class NetworkConnectMultiSelector {
  get updateButton(): EncapsulatedElementType {
    return Matchers.getElementByID(
      NetworkConnectMultiSelectorSelectorsIDs.UPDATE_CHAIN_PERMISSIONS,
    );
  }

  get backButton(): EncapsulatedElementType {
    return Matchers.getElementByID(
      NetworkConnectMultiSelectorSelectorsIDs.BACK_BUTTON,
    );
  }

  getNetworkRow(networkName: string): EncapsulatedElementType {
    return encapsulated({
      appium: {
        android: () =>
          PlaywrightMatchers.getElementByXPath(
            `//*[@content-desc='${networkName}' or @text='${networkName}']`,
          ),
        ios: () => PlaywrightMatchers.getElementByAccessibilityId(networkName),
      },
    });
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
    const chainPermissionTestId = `${chainName}-selected`;
    const el = Matchers.getElementByID(chainPermissionTestId);
    await Assertions.expectElementToBeVisible(el, {
      timeout: 10000,
      description: `Network chain permission ${chainName} should be selected`,
    });
  }

  async isNetworkChainPermissionNotSelected(chainName: string): Promise<void> {
    const chainPermissionTestId = `${chainName}-not-selected`;
    const el = Matchers.getElementByID(chainPermissionTestId);
    await Assertions.expectElementToBeVisible(el, {
      timeout: 10000,
      description: `Network chain permission ${chainName} should be selected`,
    });
  }

  async selectNetworkChainPermission(chainName: string): Promise<void> {
    await Gestures.waitAndTap(this.getNetworkRow(chainName), {
      elemDescription: `Tap on the network chain permission ${chainName}`,
    });
  }
}

export default new NetworkConnectMultiSelector();
