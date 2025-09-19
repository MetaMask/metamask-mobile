import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import { OnboardingSheetSelectorIDs } from '../../selectors/Onboarding/OnboardingSheet.selectors';
// Import Appwright dependencies for dual compatibility
import AppwrightSelectors from '../../../wdio/helpers/AppwrightSelectors';
import { Device } from 'appwright';

class OnboardingSheet {
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
      return Matchers.getElementByID(OnboardingSheetSelectorIDs.CONTAINER_ID);
    }
      // Appwright framework
      return AppwrightSelectors.getElementByID(
        this._device,
        OnboardingSheetSelectorIDs.CONTAINER_ID,
      );

  }

  get googleLoginButton() {
    if (!this._device) {
      // Detox framework
      return Matchers.getElementByID(
        OnboardingSheetSelectorIDs.GOOGLE_LOGIN_BUTTON,
      );
    }
      // Appwright framework
      return AppwrightSelectors.getElementByID(
        this._device,
        OnboardingSheetSelectorIDs.GOOGLE_LOGIN_BUTTON,
      );

  }

  get appleLoginButton() {
    if (!this._device) {
      // Detox framework
      return Matchers.getElementByID(
        OnboardingSheetSelectorIDs.APPLE_LOGIN_BUTTON,
      );
    }
      // Appwright framework
      return AppwrightSelectors.getElementByID(
        this._device,
        OnboardingSheetSelectorIDs.APPLE_LOGIN_BUTTON,
      );

  }

  get importSeedButton() {
    if (!this._device) {
      // Detox framework
      return Matchers.getElementByID(
        OnboardingSheetSelectorIDs.IMPORT_SEED_BUTTON,
      );
    }
      // Appwright framework
      return AppwrightSelectors.getElementByID(
        this._device,
        OnboardingSheetSelectorIDs.IMPORT_SEED_BUTTON,
      );

  }

  async tapGoogleLoginButton(): Promise<void> {
    if (!this._device) {
      // Detox framework
      await Gestures.waitAndTap(this.googleLoginButton, {
        elemDescription: 'Google Login Button in Onboarding Sheet',
      });
    } else {
      // Appwright framework
      const button = await this.googleLoginButton;
      await button.tap();
    }
  }

  async tapAppleLoginButton(): Promise<void> {
    if (!this._device) {
      // Detox framework
      await Gestures.waitAndTap(this.appleLoginButton, {
        elemDescription: 'Apple Login Button in Onboarding Sheet',
      });
    } else {
      // Appwright framework
      const button = await this.appleLoginButton;
      await button.tap();
    }
  }

  async tapImportSeedButton(): Promise<void> {
    if (!this._device) {
      // Detox framework
      await Gestures.waitAndTap(this.importSeedButton, {
        elemDescription: 'Import Seed Button in Onboarding Sheet',
      });
    } else {
      // Appwright framework
      const button = await this.importSeedButton;
      await button.tap();
    }
  }
}

export default new OnboardingSheet();
