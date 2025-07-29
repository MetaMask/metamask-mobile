import { OnboardingSelectorIDs } from '../../selectors/Onboarding/Onboarding.selectors';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import { BASE_DEFAULTS, Utilities } from '../../framework';
import OnboardingSheet from './OnboardingSheet';

const SEEDLESS_ONBOARDING_ENABLED =
  process.env.SEEDLESS_ONBOARDING_ENABLED === 'true';
class OnboardingView {
  get container() {
    return Matchers.getElementByID(OnboardingSelectorIDs.CONTAINER_ID);
  }

  get existingWalletButton() {
    return Matchers.getElementByID(
      OnboardingSelectorIDs.EXISTING_WALLET_BUTTON,
    );
  }

  get newWalletButton() {
    return Matchers.getElementByID(OnboardingSelectorIDs.NEW_WALLET_BUTTON);
  }

  async tapCreateWallet() {
    await Gestures.waitAndTap(this.newWalletButton);
  }

  async tapHaveAnExistingWallet() {
    await Utilities.executeWithRetry(
      async () => {
        await Gestures.waitAndTap(this.existingWalletButton, {
          elemDescription: 'Onboarding Have an Existing Wallet Button',
        });
        if (SEEDLESS_ONBOARDING_ENABLED) {
          await Utilities.waitForElementToBeVisible(
            OnboardingSheet.importSeedButton,
          );
        } else {
          await Utilities.waitForElementToDisappear(
            OnboardingSheet.existingWalletButton,
          );
        }
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
