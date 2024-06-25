import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';
import NetworksView from '../Settings/NetworksView';
import {
  CustomDefaultNetworkIDs,
  CustomDefaultNetworkTexts,
} from '../../selectors/Onboarding/CustomDefaultNetwork.selectors';
class DefaultNetworkView {
  get useThisNetworkButton() {
    return device.getPlatform() === 'ios'
      ? Matchers.getElementByID(
          CustomDefaultNetworkIDs.USE_THIS_NETWORK_BUTTON_ID,
        )
      : Matchers.getElementByLabel(
          CustomDefaultNetworkTexts.USE_THIS_NETWORK_BUTTON_TEXT,
        );
  }

  async tapUseThisNetworkButton() {
    await Gestures.waitAndTap(this.useThisNetworkButton);
  }

  async typeRpcURL(rpcURL) {
    await (await NetworksView.rpcURLInput).clearText();
    await NetworksView.typeInRpcUrl(rpcURL);
  }
}

export default new DefaultNetworkView();
