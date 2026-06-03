import Matchers from '../../framework/Matchers';
import { MultichainDeleteAccountSelectors } from '../../../app/components/Views/MultichainAccounts/sheets/DeleteAccount/DeleteAccount.testIds';
import {
  encapsulated,
  EncapsulatedElementType,
} from '../../framework/EncapsulatedElement';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import UnifiedGestures from '../../framework/UnifiedGestures';

class DeleteAccount {
  get container(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          MultichainDeleteAccountSelectors.DELETE_ACCOUNT_CONTAINER,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          MultichainDeleteAccountSelectors.DELETE_ACCOUNT_CONTAINER,
        ),
    });
  }

  get deleteAccountButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          MultichainDeleteAccountSelectors.DELETE_ACCOUNT_REMOVE_BUTTON,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          MultichainDeleteAccountSelectors.DELETE_ACCOUNT_REMOVE_BUTTON,
        ),
    });
  }

  async tapDeleteAccount(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.deleteAccountButton, {
      elemDescription: 'Delete Account Button in Delete Account',
    });
  }
}

export default new DeleteAccount();
