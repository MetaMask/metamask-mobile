import Gestures from '../../../tests/framework/Gestures.ts';
import Matchers from '../../../tests/framework/Matchers.ts';
import { SwitchAccountModalSelectorIDs } from '../../../app/components/Views/confirmations/components/modals/switch-account-type-modal/SwitchAccountModal.testIds';
class SwitchAccountModal {
  get smartAccountLink() {
    return Matchers.getElementByText('Smart account');
  }

  get switchAccountButton() {
    return Matchers.getElementByID(
      SwitchAccountModalSelectorIDs.SWITCH_ACCOUNT_BUTTON_LOCALHOST,
    );
  }

  get smartAccountBackButton() {
    return Matchers.getElementByID(
      SwitchAccountModalSelectorIDs.SMART_ACCOUNT_BACK_BUTTON,
    );
  }

  async tapSwitchAccountButton(): Promise<void> {
    await Gestures.waitAndTap(this.switchAccountButton, {
      checkEnabled: false,
      elemDescription: 'Switch Account button',
    });
  }

  async tapSmartAccountLink(): Promise<void> {
    await Gestures.waitAndTap(this.smartAccountLink, {
      elemDescription: 'Smart Account link',
    });
  }

  async tapSmartAccountBackButton(): Promise<void> {
    await Gestures.waitAndTap(this.smartAccountBackButton, {
      elemDescription: 'Smart Account back button',
    });
  }
}

export default new SwitchAccountModal();
