import { NetworkConnectMultiSelectorSelectorsIDs } from '../../../app/components/Views/NetworkConnect/NetworkConnectMultiSelector.testIds';
import Matchers from '../../framework/Matchers';
import { Assertions } from '../../framework';
import {
  encapsulated,
  EncapsulatedElementType,
} from '../../framework/EncapsulatedElement';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import UnifiedGestures from '../../framework/UnifiedGestures';

class NetworkConnectMultiSelector {
  get updateButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          NetworkConnectMultiSelectorSelectorsIDs.UPDATE_CHAIN_PERMISSIONS,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          NetworkConnectMultiSelectorSelectorsIDs.UPDATE_CHAIN_PERMISSIONS,
        ),
    });
  }

  get backButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          NetworkConnectMultiSelectorSelectorsIDs.BACK_BUTTON,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          NetworkConnectMultiSelectorSelectorsIDs.BACK_BUTTON,
        ),
    });
  }

  getMultiselectElement(label: string): DetoxElement {
    return Matchers.getElementByLabel(label);
  }

  async tapUpdateButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.updateButton, {
      elemDescription: 'Tap on the update button',
    });
  }

  async tapBackButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.backButton, {
      elemDescription: 'Tap on the back button',
    });
  }

  async isNetworkChainPermissionSelected(chainName: string): Promise<void> {
    const chainPermissionTestId = `${chainName}-selected`;
    const el = await Matchers.getElementByID(chainPermissionTestId);
    await Assertions.expectElementToBeVisible(el, {
      timeout: 10000,
      description: `Network chain permission ${chainName} should be selected`,
    });
  }

  async isNetworkChainPermissionNotSelected(chainName: string): Promise<void> {
    const chainPermissionTestId = `${chainName}-not-selected`;
    const el = await Matchers.getElementByID(chainPermissionTestId);
    await Assertions.expectElementToBeVisible(el, {
      timeout: 10000,
      description: `Network chain permission ${chainName} should be selected`,
    });
  }

  async selectNetworkChainPermission(chainName: string): Promise<void> {
    const el = this.getMultiselectElement(chainName);
    await UnifiedGestures.waitAndTap(el, {
      elemDescription: `Tap on the network chain permission ${chainName}`,
    });
  }
}

export default new NetworkConnectMultiSelector();
