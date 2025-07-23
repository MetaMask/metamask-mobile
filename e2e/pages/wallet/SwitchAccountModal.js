import Matchers from '../../framework/Matchers.ts';
import Gestures from '../../framework/Gestures.ts';
import { SwitchAccountModalSelectorIDs } from '../../selectors/wallet/SwitchAccountModal.selectors.js';
class SwitchAccountModal {
  get switchAccountButton() {
    return Matchers.getElementByID(
      SwitchAccountModalSelectorIDs.SWITCH_ACCOUNT_BUTTON_LOCALHOST,
    );
  }

  async tapSwitchAccountButton() {
    await Gestures.waitAndTap(this.switchAccountButton, {
      checkEnabled: false,
    });
  }
}

export default new SwitchAccountModal();
