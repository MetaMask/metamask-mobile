import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import { WalletDetailsIds } from '../../../app/components/Views/MultichainAccounts/WalletDetails/WalletDetails.testIds';

class WalletDetails {
  get container(): DetoxElement {
    return Matchers.getElementByID(WalletDetailsIds.WALLET_DETAILS_CONTAINER);
  }

  get createAccountLink(): DetoxElement {
    return Matchers.getElementByID(WalletDetailsIds.ADD_ACCOUNT_BUTTON);
  }

  get srpButton(): DetoxElement {
    return Matchers.getElementByID(WalletDetailsIds.REVEAL_SRP_BUTTON);
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
