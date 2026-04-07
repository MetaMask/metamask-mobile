import { OnboardingSelectorIDs } from '../../../app/components/Views/Onboarding/Onboarding.testIds';
import Matchers from '../../framework/Matchers';
import {
  encapsulated,
  EncapsulatedElementType,
} from '../../framework/EncapsulatedElement';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import UnifiedGestures from '../../framework/UnifiedGestures';

class OnboardingView {
  get container(): DetoxElement {
    return Matchers.getElementByID(OnboardingSelectorIDs.CONTAINER_ID);
  }

  get existingWalletButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(OnboardingSelectorIDs.EXISTING_WALLET_BUTTON),
      appium: () =>
        PlaywrightMatchers.getElementById(
          OnboardingSelectorIDs.EXISTING_WALLET_BUTTON,
          {
            exact: true,
          },
        ),
    });
  }

  get newWalletButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(OnboardingSelectorIDs.NEW_WALLET_BUTTON),
      appium: () =>
        PlaywrightMatchers.getElementById(
          OnboardingSelectorIDs.NEW_WALLET_BUTTON,
          {
            exact: true,
          },
        ),
    });
  }

  async tapCreateWallet(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.newWalletButton, {
      description: 'Onboarding  - Create New Wallet Button',
    });
  }

  async tapCreateNewWalletButton(): Promise<void> {
    await this.tapCreateWallet();
  }

  async tapHaveAnExistingWallet() {
    await UnifiedGestures.waitAndTap(this.existingWalletButton, {
      description: 'Onboarding Have an Existing Wallet Button',
    });
  }
}

export default new OnboardingView();
