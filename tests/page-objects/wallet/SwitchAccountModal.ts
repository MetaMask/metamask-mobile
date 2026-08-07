import Matchers from '../../framework/Matchers';
import { AccountDetailsIds } from '../../../app/components/Views/MultichainAccounts/AccountDetails.testIds';
import { SwitchAccountModalSelectorIDs } from '../../../app/components/Views/confirmations/components/modals/switch-account-type-modal/SwitchAccountModal.testIds';
import { EncapsulatedElementType, asPlaywrightElement } from '../../framework';
import { PlatformDetector } from '../../framework/PlatformLocator';
import PlaywrightGestures from '../../framework/PlaywrightGestures';

class SwitchAccountModal {
  get smartAccountLink(): EncapsulatedElementType {
    return Matchers.getElementByID(AccountDetailsIds.SMART_ACCOUNT_LINK);
  }

  get smartAccountBackButton(): EncapsulatedElementType {
    return Matchers.getElementByID(
      SwitchAccountModalSelectorIDs.SMART_ACCOUNT_BACK_BUTTON,
    );
  }

  async tapSmartAccountLink(): Promise<void> {
    const linkEl = await asPlaywrightElement(this.smartAccountLink);
    await PlaywrightGestures.scrollIntoView(linkEl);
    await PlaywrightGestures.waitAndTap(linkEl, {
      elemDescription: 'Smart Account link',
      timeout: 15_000,
      checkForDisplayed: false,
      checkForEnabled: false,
    });
  }

  async tapSmartAccountBackButton(): Promise<void> {
    const backEl = await asPlaywrightElement(this.smartAccountBackButton);
    await PlaywrightGestures.waitAndTap(backEl, {
      elemDescription: 'Smart Account back button',
      timeout: 15_000,
      checkForDisplayed: !PlatformDetector.isIOS(),
      checkForEnabled: false,
    });
  }
}

export default new SwitchAccountModal();
