import Matchers from '../../framework/Matchers.ts';
import Gestures from '../../framework/Gestures.ts';
import { SwitchAccountModalSelectorIDs } from '../../selectors/wallet/SwitchAccountModal.selectors.js';
import { AccountDetailsIds } from '../../selectors/MultichainAccounts/AccountDetails.selectors.ts';
class SwitchAccountModal {
  get smartAccountLink(): DetoxElement {
    return Matchers.getElementByID(
      SwitchAccountModalSelectorIDs.SMART_ACCOUNT_LINK,
    );
  }

  get switchAccountButton(): DetoxElement {
    return Matchers.getElementByID(
      SwitchAccountModalSelectorIDs.SWITCH_ACCOUNT_BUTTON_LOCALHOST,
    );
  }

  get smartAccountBackButton(): DetoxElement {
    return Matchers.getElementByID(
      SwitchAccountModalSelectorIDs.SMART_ACCOUNT_BACK_BUTTON,
    );
  }

  get accountModalBackButton(): DetoxElement {
    return Matchers.getElementByID(AccountDetailsIds.BACK_BUTTON);
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

  async tapAccountModalBackButton(): Promise<void> {
    await Gestures.waitAndTap(this.accountModalBackButton, {
      elemDescription: 'Account Modal back button',
    });
  }
}

export default new SwitchAccountModal();
