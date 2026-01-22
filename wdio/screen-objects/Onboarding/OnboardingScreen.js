import Gestures from '../../helpers/Gestures';
import Selectors from '../../helpers/Selectors';
import { OnboardingSelectorIDs } from '../../../app/components/Views/Onboarding/Onboarding.testIds';
import AppwrightSelectors from '../../../tests/framework/AppwrightSelectors';
import AppwrightGestures from '../../../tests/framework/AppwrightGestures';
import { expect as appwrightExpect } from 'appwright';

class OnBoardingScreen {

  get device() {
    return this._device;
  }

  set device(device) {
    this._device = device;
  }

  get createNewWalletButton() {
    if (!this._device) {
      return Selectors.getXpathElementByResourceId(
        OnboardingSelectorIDs.NEW_WALLET_BUTTON,
      );
    } else {
      return AppwrightSelectors.getElementByID(this._device, OnboardingSelectorIDs.NEW_WALLET_BUTTON);
    }
  }

  get existingWalletButton() {
    if (!this._device) {
      return Selectors.getXpathElementByResourceId(
        OnboardingSelectorIDs.EXISTING_WALLET_BUTTON,
      );
    } else {
      return AppwrightSelectors.getElementByID(this._device, OnboardingSelectorIDs.EXISTING_WALLET_BUTTON);
    }
  }

  async tapHaveAnExistingWallet() {
    if (!this._device) {
      await Gestures.waitAndTap(this.existingWalletButton);
    } else {
      await AppwrightGestures.tap(await this.existingWalletButton);
    }
  }

  async tapCreateNewWalletButton() {
    if (!this._device) {
      await Gestures.waitAndTap(this.createNewWalletButton);
    } else {
      await AppwrightGestures.tap(await this.createNewWalletButton);
    }
  }

  async isScreenTitleVisible() {
    if (!this._device) {
      await expect(this.createNewWalletButton).toBeDisplayed();
    } else {
      const element = await this.createNewWalletButton;
      await appwrightExpect(element).toBeVisible({ timeout: 30000 });
    }
  }
}

export default new OnBoardingScreen();
