import { NetworkConnectMultiSelectorSelectorsIDs } from '../../selectors/Browser/NetworkConnectMultiSelector.selectors';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';

class NetworkConnectMultiSelector {
  private chainPermissionTestId: string = '';

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

  get individualChainPermission(): DetoxElement {
    return Matchers.getElementByID(this.chainPermissionTestId);
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

  async setNetWorkPermissionTestIdForChain(chainName: string, isSelected: boolean): Promise<void> {
    if (isSelected) {
      this.chainPermissionTestId = `${chainName}-selected`;
    } else {
      this.chainPermissionTestId = `${chainName}-not-selected`;
    }
  }
}

export default new NetworkConnectMultiSelector();
