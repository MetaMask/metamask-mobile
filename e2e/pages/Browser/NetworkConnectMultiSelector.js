import { NetworkConnectMultiSelectorSelectorsIDs } from '../../selectors/Browser/NetworkConnectMultiSelector.selectors';
import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';
import { waitFor } from 'detox';
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

  async tapUpdateButton() {
    await Gestures.waitAndTap(this.updateButton);
  }

  async tapBackButton() {
    await Gestures.waitAndTap(this.backButton);
  }

  async isNetworkChainPermissionSelected(chainName) {
    const chainPermissionTestId = `${chainName}-selected`;

    const element = await Matchers.getElementByID(chainPermissionTestId);
    await waitFor(element).toBeVisible().withTimeout(10000);

    return expect(element).toExist();
  }

  async isNetworkChainPermissionNotSelected(chainName) {
    const chainPermissionTestId = `${chainName}-not-selected`;

    const element = await Matchers.getElementByID(chainPermissionTestId);
    await waitFor(element).toBeVisible().withTimeout(10000);

    return expect(element).toExist();
  }
}

export default new NetworkConnectMultiSelector();
