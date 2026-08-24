import { OnboardingSelectorIDs } from '../../../app/components/Views/Onboarding/Onboarding.testIds';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import type { AppiumElement } from '../../framework/AppiumElement';

class OnboardingView {
  get container(): Promise<AppiumElement> {
    return Matchers.getElementByID(OnboardingSelectorIDs.CONTAINER_ID);
  }

  get existingWalletButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      OnboardingSelectorIDs.EXISTING_WALLET_BUTTON,
    );
  }

  get newWalletButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(OnboardingSelectorIDs.NEW_WALLET_BUTTON);
  }

  async tapCreateWallet(): Promise<void> {
    await Gestures.waitAndTap(this.newWalletButton, {
      elemDescription: 'Onboarding Create New Wallet Button',
      checkForDisplayed: true,
      checkEnabled: true,
      waitForInteractive: true,
      checkStability: true,
      timeout: 15_000,
    });
  }

  async tapCreateNewWalletButton(): Promise<void> {
    await this.tapCreateWallet();
  }

  async tapHaveAnExistingWallet(): Promise<void> {
    await Gestures.waitAndTap(this.existingWalletButton, {
      elemDescription: 'Onboarding Have an Existing Wallet Button',
      checkForDisplayed: true,
      checkEnabled: true,
      waitForInteractive: true,
      checkStability: true,
      timeout: 15_000,
    });
  }
}

export default new OnboardingView();
