import { NetworksViewSelectorsIDs } from '../../selectors/Settings/NetworksView.selectors';
import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';
import NetworksView from '../Settings/NetworksView';
import TestHelpers from '../../helpers';
import {
  CustomDefaultNetworkIDs,
  CustomeDefaultNetworkTexts,
} from '../../selectors/Onboarding/CustomDefaultNetwork.selectors';

class DefaultNetworkView {
  get useThisNetworkButton() {
    return Matchers.getElementByID(
      CustomDefaultNetworkIDs.USE_THIS_NETWORK_BUTTON_ID,
    );
  }

  get invalidRPCLabel() {
    return Matchers.getElementByID(NetworksViewSelectorsIDs.RPC_WARNING_BANNER);
  }

  async tapUseThisNetworkButton() {
    if (device.getPlatform() === 'ios') {
      await Gestures.waitAndTap(this.useThisNetworkButton);
      await Gestures.waitAndTap(this.useThisNetworkButton);
    } else {
      await TestHelpers.waitAndTapByLabel(
        CustomeDefaultNetworkTexts.USE_THIS_NETWORK_BUTTON_TEXT,
      );
      await TestHelpers.waitAndTapByLabel(
        CustomeDefaultNetworkTexts.USE_THIS_NETWORK_BUTTON_TEXT,
      );
    }
  }

  async typeRpcURL(rpcURL) {
    await (await NetworksView.rpcURLInput).clearText();
    await NetworksView.typeInRpcUrl(rpcURL);
  }
}

export default new DefaultNetworkView();
