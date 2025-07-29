import Matchers from '../../framework/Matchers.ts';
import Gestures from '../../framework/Gestures.ts';
import { SwitchAccountModalSelectorIDs } from '../../selectors/wallet/SwitchAccountModal.selectors.js';
class SwitchAccountModal {
  get switchAccountButton(): DetoxElement {
    return Matchers.getElementByID(
      SwitchAccountModalSelectorIDs.SWITCH_ACCOUNT_BUTTON_LOCALHOST,
    );
  }

  async tapSwitchAccountButton(): Promise<void> {
    await Gestures.waitAndTap(this.switchAccountButton, {
      checkEnabled: false,
      elemDescription: 'Switch Account button',
    });
  }
}

export default new SwitchAccountModal();
