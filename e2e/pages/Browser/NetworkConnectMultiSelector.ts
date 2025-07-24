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
}

export default new NetworkConnectMultiSelector();
