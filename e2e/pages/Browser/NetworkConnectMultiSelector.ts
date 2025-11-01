import { NetworkConnectMultiSelectorSelectorsIDs } from '../../selectors/Browser/NetworkConnectMultiSelector.selectors';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import { Assertions } from '../../framework';

class NetworkConnectMultiSelector {
  get updateButton(): DetoxElement {
    return Matchers.getElementByID(
      NetworkConnectMultiSelectorSelectorsIDs.UPDATE_CHAIN_PERMISSIONS,
    );
  }

  get backButton(): DetoxElement {
    return Matchers.getElementByID(
      NetworkConnectMultiSelectorSelectorsIDs.BACK_BUTTON,
    );
  }

  getMultiselectElement(label: string): DetoxElement {
    return Matchers.getElementByLabel(label);
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
    await Gestures.waitAndTap(el, {
      elemDescription: `Tap on the network chain permission ${chainName}`,
    });
  }
}

export default new NetworkConnectMultiSelector();
