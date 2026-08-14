import { OnboardingSelectorIDs } from '../../../app/components/Views/Onboarding/Onboarding.testIds';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import { EncapsulatedElementType } from '../../framework/EncapsulatedElement';

class OnboardingView {
  get container(): EncapsulatedElementType {
    return Matchers.getElementByID(OnboardingSelectorIDs.CONTAINER_ID);
  }

  get existingWalletButton(): EncapsulatedElementType {
    return Matchers.getElementByID(
      OnboardingSelectorIDs.EXISTING_WALLET_BUTTON,
    );
  }

  get newWalletButton(): EncapsulatedElementType {
    return Matchers.getElementByID(OnboardingSelectorIDs.NEW_WALLET_BUTTON);
  }

  async tapCreateWallet(): Promise<void> {
    await Gestures.waitAndTap(this.newWalletButton, {
      elemDescription: 'Onboarding Create New Wallet Button',
      checkForDisplayed: true,
      checkEnabled: true,
      waitForInteractive: true,
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
      timeout: 15_000,
    });
  }
}

export default new OnboardingView();
