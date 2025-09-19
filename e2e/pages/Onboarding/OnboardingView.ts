import { OnboardingSelectorIDs } from '../../selectors/Onboarding/Onboarding.selectors';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import { BASE_DEFAULTS, Utilities } from '../../framework';
import OnboardingSheet from './OnboardingSheet';
const SEEDLESS_ONBOARDING_ENABLED =
  process.env.SEEDLESS_ONBOARDING_ENABLED === 'true' ||
  process.env.SEEDLESS_ONBOARDING_ENABLED === undefined;

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
        if (SEEDLESS_ONBOARDING_ENABLED) {
          await Gestures.waitAndTap(this.existingWalletButton, {
            elemDescription: 'Onboarding Have an Existing Wallet Button',
          });
          await Utilities.waitUntil(
            () => Utilities.isElementVisible(OnboardingSheet.importSeedButton),
            {
              timeout: BASE_DEFAULTS.timeout,
              interval: 100,
            },
          );
        } else {
          await Gestures.waitAndTap(this.existingWalletButton, {
            elemDescription: 'Onboarding Have an Existing Wallet Button',
            waitForElementToDisappear: true,
          });
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
