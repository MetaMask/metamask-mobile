import { OnboardingSelectorIDs } from '../../selectors/Onboarding/Onboarding.selectors';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import { BASE_DEFAULTS, Utilities } from '../../framework';
import OnboardingSheet from './OnboardingSheet';

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
    await Utilities.executeWithRetry(
      async () => {
        await Gestures.waitAndTap(this.existingWalletButton, {
          elemDescription: 'Onboarding Have an Existing Wallet Button',
        });
        await Utilities.waitForElementToBeVisible(
          OnboardingSheet.importSeedButton,
        );
      },
      {
        timeout: BASE_DEFAULTS.timeout,
        description: 'tapHaveAnExistingWallet()',
        elemDescription: 'Taps to prompt bottom sheet',
      },
    );
  }
}

export default new OnboardingView();
