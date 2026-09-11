import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import { WalletDetailsIds } from '../../../app/components/Views/MultichainAccounts/WalletDetails/WalletDetails.testIds';
import { type AppiumElement } from '../../framework';

class WalletDetails {
  get container(): Promise<AppiumElement> {
    return Matchers.getElementByID(WalletDetailsIds.WALLET_DETAILS_CONTAINER);
  }

  get createAccountLink(): Promise<AppiumElement> {
    return Matchers.getElementByID(WalletDetailsIds.ADD_ACCOUNT_BUTTON);
  }

  get srpButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(WalletDetailsIds.REVEAL_SRP_BUTTON);
  }

  get backButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(WalletDetailsIds.BACK_BUTTON);
  }

  async tapBackButton(): Promise<void> {
    await Gestures.waitAndTap(this.backButton, {
      elemDescription: 'Back Button in Wallet Details',
    });
  }

  async tapCreateAccount(): Promise<void> {
    await Gestures.waitAndTap(this.createAccountLink, {
      elemDescription: 'Create account link',
    });
  }

  async tapSRP(): Promise<void> {
    await Gestures.waitAndTap(this.srpButton, {
      elemDescription: 'Secret Recovery Phrase',
    });
  }
}

export default new WalletDetails();
