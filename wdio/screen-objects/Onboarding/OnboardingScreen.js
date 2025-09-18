import Gestures from '../../helpers/Gestures';
import Selectors from '../../helpers/Selectors';
import { OnboardingSelectorIDs } from '../../../e2e/selectors/Onboarding/Onboarding.selectors';
import AppwrightSelectors from '../../helpers/AppwrightSelectors';
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
      const button = await this.existingWalletButton;
      await button.tap();
    }
  }

  async tapCreateNewWalletButton() {
    if (!this._device) {
      await Gestures.waitAndTap(this.createNewWalletButton);
    } else {
      const button = await this.createNewWalletButton;
      await button.tap();
    }
  }
}

export default new OnBoardingScreen();
