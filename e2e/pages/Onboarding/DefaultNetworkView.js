import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';
import NetworksView from '../Settings/NetworksView';
import {
  CustomDefaultNetworkIDs,
  CustomDefaultNetworkTexts,
} from '../../selectors/Onboarding/CustomDefaultNetwork.selectors';
import Assertions from '../../utils/Assertions';
import MetaMetricsOptIn from '../../pages/Onboarding/MetaMetricsOptInView';
import TestHelpers from '../../helpers';

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
    const isVisible = await Assertions.checkIfVisible(
      MetaMetricsOptIn.container,
    );
    // Tap again if there is a delay
    if (!isVisible) {
      await TestHelpers.delay(5000);
      await Gestures.waitAndTap(this.useThisNetworkButton);
    }
  }

  async typeRpcURL(rpcURL) {
    await (await NetworksView.rpcURLInput).clearText();
    await NetworksView.typeInRpcUrl(rpcURL);
  }
}

export default new DefaultNetworkView();
