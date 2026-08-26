import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import { AccountDetailsIds } from '../../../app/components/Views/MultichainAccounts/AccountDetails.testIds';
import { SwitchAccountModalSelectorIDs } from '../../../app/components/Views/confirmations/components/modals/switch-account-type-modal/SwitchAccountModal.testIds';
import { type AppiumElement } from '../../framework';
import { PlatformDetector } from '../../framework/PlatformLocator';

class SwitchAccountModal {
  get smartAccountLink(): Promise<AppiumElement> {
    return Matchers.getElementByID(AccountDetailsIds.SMART_ACCOUNT_LINK);
  }

  get smartAccountBackButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      SwitchAccountModalSelectorIDs.SMART_ACCOUNT_BACK_BUTTON,
    );
  }

  async tapSmartAccountLink(): Promise<void> {
    await Gestures.scrollIntoView(this.smartAccountLink);
    await Gestures.waitAndTap(this.smartAccountLink, {
      elemDescription: 'Smart Account link',
      timeout: 15_000,
      checkForDisplayed: false,
      checkEnabled: false,
    });
  }

  async tapSmartAccountBackButton(): Promise<void> {
    await Gestures.waitAndTap(this.smartAccountBackButton, {
      elemDescription: 'Smart Account back button',
      timeout: 15_000,
      checkForDisplayed: !PlatformDetector.isIOS(),
      checkEnabled: false,
    });
  }
}

export default new SwitchAccountModal();
