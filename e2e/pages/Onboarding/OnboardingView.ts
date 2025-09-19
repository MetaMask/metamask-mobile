import { OnboardingSelectorIDs } from '../../selectors/Onboarding/Onboarding.selectors';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import { BASE_DEFAULTS, Utilities } from '../../framework';
import OnboardingSheet from './OnboardingSheet';
// Import Appwright dependencies for dual compatibility
import AppwrightSelectors from '../../../wdio/helpers/AppwrightSelectors';
import { expect as appwrightExpect, Device } from 'appwright';
const SEEDLESS_ONBOARDING_ENABLED =
  process.env.SEEDLESS_ONBOARDING_ENABLED === 'true' ||
  process.env.SEEDLESS_ONBOARDING_ENABLED === undefined;

class OnboardingView {
  private _device?: Device;

  get device(): Device | undefined {
    return this._device;
  }

  set device(device: Device) {
    this._device = device;
  }

  get container() {
    if (!this._device) {
      // Detox framework
      return Matchers.getElementByID(OnboardingSelectorIDs.CONTAINER_ID);
    }
      // Appwright framework
      return AppwrightSelectors.getElementByID(
        this._device,
        OnboardingSelectorIDs.CONTAINER_ID,
      );

  }

  get existingWalletButton() {
    if (!this._device) {
      // Detox framework
      return Matchers.getElementByID(
        OnboardingSelectorIDs.EXISTING_WALLET_BUTTON,
      );
    }
      // Appwright framework
      return AppwrightSelectors.getElementByID(
        this._device,
        OnboardingSelectorIDs.EXISTING_WALLET_BUTTON,
      );

  }

  get newWalletButton() {
    if (!this._device) {
      // Detox framework
      return Matchers.getElementByID(OnboardingSelectorIDs.NEW_WALLET_BUTTON);
    }
      // Appwright framework
      return AppwrightSelectors.getElementByID(
        this._device,
        OnboardingSelectorIDs.NEW_WALLET_BUTTON,
      );

  }

  async tapCreateWallet(): Promise<void> {
    if (!this._device) {
      // Detox framework
      await Gestures.waitAndTap(this.newWalletButton, {
        elemDescription: 'Onboarding  - Create New Wallet Button',
      });
    } else {
      // Appwright framework
      const button = await this.newWalletButton;
      await button.tap();
    }
  }

  async tapHaveAnExistingWallet() {
    if (!this._device) {
      // Detox framework
      await Utilities.executeWithRetry(
        async () => {
          if (SEEDLESS_ONBOARDING_ENABLED) {
            await Gestures.waitAndTap(this.existingWalletButton, {
              elemDescription: 'Onboarding Have an Existing Wallet Button',
            });
            await Utilities.waitForElementToBeVisible(
              OnboardingSheet.importSeedButton,
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
    } else {
      // Appwright framework
      const button = await this.existingWalletButton;
      await button.tap();

      if (SEEDLESS_ONBOARDING_ENABLED) {
        // Wait for import seed button to be visible in Appwright
        const importSeedButton = await AppwrightSelectors.getElementByID(
          this._device,
          'onboarding-sheet-import-seed-button-id',
        );
        await appwrightExpect(importSeedButton).toBeVisible({ timeout: 10000 });
      }
    }
  }
}

export default new OnboardingView();
