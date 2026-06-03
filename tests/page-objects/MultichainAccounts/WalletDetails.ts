import Matchers from '../../framework/Matchers';
import { WalletDetailsIds } from '../../../app/components/Views/MultichainAccounts/WalletDetails/WalletDetails.testIds';
import {
  encapsulated,
  EncapsulatedElementType,
} from '../../framework/EncapsulatedElement';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import UnifiedGestures from '../../framework/UnifiedGestures';

class WalletDetails {
  get container(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(WalletDetailsIds.WALLET_DETAILS_CONTAINER),
      appium: () =>
        PlaywrightMatchers.getElementById(
          WalletDetailsIds.WALLET_DETAILS_CONTAINER,
        ),
    });
  }

  get createAccountLink(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByID(WalletDetailsIds.ADD_ACCOUNT_BUTTON),
      appium: () =>
        PlaywrightMatchers.getElementById(WalletDetailsIds.ADD_ACCOUNT_BUTTON),
    });
  }

  get srpButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByID(WalletDetailsIds.REVEAL_SRP_BUTTON),
      appium: () =>
        PlaywrightMatchers.getElementById(WalletDetailsIds.REVEAL_SRP_BUTTON),
    });
  }

  async tapCreateAccount(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.createAccountLink, {
      elemDescription: 'Create account link',
    });
  }

  async tapSRP(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.srpButton, {
      elemDescription: 'Secret Recovery Phrase',
    });
  }
}

export default new WalletDetails();
