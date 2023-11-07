import Selectors from '../../helpers/Selectors';
import Gestures from '../../helpers/Gestures';

import {
  NETWORK_SCROLL_ID,
  NETWORK_TEST_SWITCH_ID,
} from '../testIDs/Components/NetworkListModal.TestIds';
import { ADD_NETWORK_BUTTON } from '../testIDs/Screens/NetworksScreen.testids';
import { CELL_SELECT_TEST_ID } from '../../../app/constants/test-ids';

class NetworkListModal {
  get scroll() {
    return Selectors.getElementByPlatform(NETWORK_SCROLL_ID);
  }

  get addNetworkButton() {
    return Selectors.getElementByPlatform(ADD_NETWORK_BUTTON);
  }

  get testNetworkSwitch() {
    return Selectors.getElementByPlatform(NETWORK_TEST_SWITCH_ID);
  }

  get networksButton() {
    return Selectors.getXpathByContentDesc(CELL_SELECT_TEST_ID);
  }

  async changeNetwork(networkName) {
    await Gestures.tapTextByXpath(networkName);
  }

  async waitForDisplayed() {
    const scroll = await this.scroll;
    await scroll.waitForDisplayed();
  }

  async waitForDisappear() {
    const scroll = await this.scroll;
    await scroll.waitForDisplayed({ reverse: true });
  }

  async tapAddNetworkButton() {
    await Gestures.waitAndTap(this.addNetworkButton);
  }

  async tapTestNetworkSwitch() {
    await Gestures.waitAndTap(this.testNetworkSwitch);
  }

  async isTestNetworkToggle(value) {
    await expect(this.testNetworkSwitch).toHaveTextContaining(value);
  }

  async isNetworksDisplayed(value) {
    await expect(this.networksButton).toBeElementsArrayOfSize(value);
  }
}

export default new NetworkListModal();
