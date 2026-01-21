import { OnboardingSelectorIDs } from '../../../app/components/Views/Onboarding/Onboarding.testIds';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';

class OnboardingView {
  get container(): DetoxElement {
    return Matchers.getElementByID(OnboardingSelectorIDs.CONTAINER_ID);
  }

  get existingWalletButton() {
    return Matchers.getElementByID(
      OnboardingSelectorIDs.EXISTING_WALLET_BUTTON,
    );
  }

  get newWalletButton(): DetoxElement {
    return Matchers.getElementByID(OnboardingSelectorIDs.NEW_WALLET_BUTTON);
  }

  async tapCreateWallet(): Promise<void> {
    await Gestures.waitAndTap(this.newWalletButton, {
      elemDescription: 'Onboarding  - Create New Wallet Button',
    });
  }

  async tapHaveAnExistingWallet() {
    await Gestures.waitAndTap(this.existingWalletButton, {
      elemDescription: 'Onboarding Have an Existing Wallet Button',
    });
  }
}

export default new OnboardingView();
