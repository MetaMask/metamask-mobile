import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';
import NetworksView from '../Settings/NetworksView';
import {
  CustomDefaultNetworkIDs,
  CustomDefaultNetworkTexts,
} from '../../selectors/Onboarding/CustomDefaultNetwork.selectors';

class DefaultNetworkView {
  get useThisNetworkButton() {
    return Matchers.getElementByID(
      CustomDefaultNetworkIDs.USE_THIS_NETWORK_BUTTON_ID,
    );
  }

  async tapUseThisNetworkButton() {
    if (device.getPlatform() === 'ios') {
      await Gestures.waitAndTap(this.useThisNetworkButton);
      await Gestures.waitAndTap(this.useThisNetworkButton);
    } else {
      await Gestures.waitAndTapByLabel(
        CustomDefaultNetworkTexts.USE_THIS_NETWORK_BUTTON_TEXT,
      );
      await Gestures.waitAndTapByLabel(
        CustomDefaultNetworkTexts.USE_THIS_NETWORK_BUTTON_TEXT,
      );
    }
  }

  async typeRpcURL(rpcURL) {
    await (await NetworksView.rpcURLInput).clearText();
    await NetworksView.typeInRpcUrl(rpcURL);
  }
}

export default new DefaultNetworkView();
