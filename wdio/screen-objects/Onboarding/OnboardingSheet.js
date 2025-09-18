import Gestures from '../../helpers/Gestures';
import Selectors from '../../helpers/Selectors';
import { OnboardingSheetSelectorIDs } from '../../../e2e/selectors/Onboarding/OnboardingSheet.selectors';
import AppwrightSelectors from '../../helpers/AppwrightSelectors';
import AppwrightGestures from '../../../appwright/utils/AppwrightGestures.js';
import { expect as appwrightExpect } from 'appwright';

class OnboardingSheet extends AppwrightGestures {
  constructor() {
    super();
  }

  get device() {
    return this._device;
  }

  set device(device) {
    this._device = device;
    super.device = device; // Set device in parent class too
  }

  get container() {
    return Selectors.getXpathElementByResourceId(OnboardingSheetSelectorIDs.CONTAINER_ID);
  }

  get googleLoginButton() {
    return Selectors.getXpathElementByResourceId(OnboardingSheetSelectorIDs.GOOGLE_LOGIN_BUTTON);
  }

  get appleLoginButton() {
    return Selectors.getXpathElementByResourceId(OnboardingSheetSelectorIDs.APPLE_LOGIN_BUTTON);
  }

  get importSeedButton() {
    if (!this._device) {
      return Selectors.getXpathElementByResourceId(OnboardingSheetSelectorIDs.IMPORT_SEED_BUTTON);
    } else {
      return AppwrightSelectors.getElementByID(this._device, OnboardingSheetSelectorIDs.IMPORT_SEED_BUTTON);
    }
  }

  get notNowButton() {
    return AppwrightSelectors.getElementByCatchAll(this._device, 'Not now');
  }

  async tapGoogleLoginButton() {
    await Gestures.waitAndTap(this.googleLoginButton);
  }

  async tapAppleLoginButton() {
    await Gestures.waitAndTap(this.appleLoginButton);
  }

  async tapImportSeedButton() {
    if (!this.device) {
      await Gestures.waitAndTap(this.importSeedButton);
    } else {
      await this.tap(this.importSeedButton); // Use inherited tapElement method with retry logic
    }
  }

  async isVisible() {
    const element = await this.importSeedButton;
    await appwrightExpect(element).toBeVisible({ timeout: 10000 });
  }

  async tapNotNow() {
    const notNowByButton = await this.notNowButton;
    await notNowByButton.isVisible({ timeout: 2000 });
    await notNowByButton.tap();
  }
}

export default new OnboardingSheet();
