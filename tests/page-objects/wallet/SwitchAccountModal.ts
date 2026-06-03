import Matchers from '../../framework/Matchers';
import { SwitchAccountModalSelectorIDs } from '../../../app/components/Views/confirmations/components/modals/switch-account-type-modal/SwitchAccountModal.testIds';
import UnifiedGestures from '../../framework/UnifiedGestures';
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
    await UnifiedGestures.waitAndTap(this.switchAccountButton, {
      checkEnabled: false,
      elemDescription: 'Switch Account button',
    });
  }

  async tapSmartAccountLink(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.smartAccountLink, {
      elemDescription: 'Smart Account link',
    });
  }

  async tapSmartAccountBackButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.smartAccountBackButton, {
      elemDescription: 'Smart Account back button',
    });
  }
}

export default new SwitchAccountModal();
