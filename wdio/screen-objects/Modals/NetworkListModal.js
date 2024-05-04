import Selectors from '../../helpers/Selectors';
import Gestures from '../../helpers/Gestures';

import { NETWORK_TEST_SWITCH_ID } from '../testIDs/Components/NetworkListModal.TestIds';
import { ADD_NETWORK_BUTTON } from '../testIDs/Screens/NetworksScreen.testids';
import { CellModalSelectorsIDs } from '../../../e2e/selectors/Modals/CellModal.selectors';
import { NetworkListModalSelectorsText } from "../../../e2e/selectors/Modals/NetworkListModal.selectors";

class NetworkListModal {
  get title() {
    return Selectors.getXpathElementByText(NetworkListModalSelectorsText.SELECT_NETWORK);
  }

  get addNetworkButton() {
    return Selectors.getElementByPlatform(ADD_NETWORK_BUTTON);
  }

  get testNetworkSwitch() {
    return Selectors.getXpathElementByResourceId(NETWORK_TEST_SWITCH_ID);
  }

  get networksButton() {
    return Selectors.getXpathByContentDesc(CellModalSelectorsIDs.SELECT);
  }

  async changeNetwork(networkName) {
    await Gestures.tapTextByXpath(networkName);
  }

  async waitForDisplayed() {
    const scroll = await this.title;
    await scroll.waitForDisplayed();
  }

  async waitForDisappear() {
    const scroll = await this.title;
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
