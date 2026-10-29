import { AccountsImportedTestIds } from '../../../app/components/Views/AddDeviceToWallet/AccountsImported.testIds';
import Matchers from '../../framework/Matchers';
import Assertions from '../../framework/Assertions';
import Gestures from '../../framework/Gestures';
import type { AppiumElement } from '../../framework/AppiumElement';

class AccountsImportedView {
  get container(): Promise<AppiumElement> {
    return Matchers.getElementByID(AccountsImportedTestIds.SCREEN);
  }

  get continueButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(AccountsImportedTestIds.CONTINUE);
  }

  async expectScreenVisible(timeout = 30_000): Promise<void> {
    await Assertions.expectElementToBeVisible(this.container, {
      description: 'Accounts imported screen should be visible',
      timeout,
    });
  }

  async tapContinue(): Promise<void> {
    await Gestures.waitAndTap(this.continueButton, {
      elemDescription: 'Accounts imported continue button',
      timeout: 15_000,
    });
  }
}

export default new AccountsImportedView();
