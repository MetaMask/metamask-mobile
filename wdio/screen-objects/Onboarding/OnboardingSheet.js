import Gestures from '../../helpers/Gestures';
import Selectors from '../../helpers/Selectors';
import { OnboardingSheetSelectorIDs } from '../../../e2e/selectors/Onboarding/OnboardingSheet.selectors';
import AppwrightSelectors from '../../helpers/AppwrightSelectors';
import { expect as appwrightExpect } from 'appwright';

class OnboardingSheet {

  get device() {
    return this._device;
  }

  set device(device) {
    this._device = device;
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
      const button = await this.importSeedButton;
      await button.tap();
    }
  }

  async isVisible() {
    const element = await this.importSeedButton;
    await appwrightExpect(element).toBeVisible({ timeout: 10000 });
  }

  async tapNotNow() {
    const notNowByText = await AppwrightSelectors.getElementByCatchAll(this._device, 'Not now');
    await notNowByText.isVisible({ timeout: 2000 });
    await notNowByText.tap();
  }
}

export default new OnboardingSheet();
