import Gestures from '../../helpers/Gestures';
import Selectors from '../../helpers/Selectors';
import { OnboardingSelectorIDs } from '../../../e2e/selectors/Onboarding/Onboarding.selectors';
import AppwrightSelectors from '../../helpers/AppwrightSelectors';
import AppwrightGestures from '../../../appwright/utils/AppwrightGestures.js';
import { expect as appwrightExpect } from 'appwright';

class OnBoardingScreen extends AppwrightGestures {
  constructor() {
    super();
  }


  get title() {
    if (!this._device) {
      return Selectors.getXpathElementByResourceId(OnboardingSelectorIDs.SCREEN_TITLE);
    } else {
      return AppwrightSelectors.getElementByID(this._device, OnboardingSelectorIDs.SCREEN_TITLE);
    }
  }

  get description() {
    return Selectors.getXpathElementByResourceId(
      OnboardingSelectorIDs.SCREEN_DESCRIPTION,
    );
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

  async isScreenTitleVisible() {
    if (!this._device) {
      await expect(this.title).toBeDisplayed();
    } else {
      const element = await this.title;
      await appwrightExpect(element).toBeVisible({ timeout: 10000 });
    }
  }

  async tapHaveAnExistingWallet() {
    if (!this._device) {
      await Gestures.waitAndTap(this.existingWalletButton);
    } else {
      await this.tap(this.existingWalletButton); // Use inherited tapElement method with retry logic
    }
  }

  async tapCreateNewWalletButton() {
    if (!this._device) {
      await Gestures.waitAndTap(this.createNewWalletButton);
    } else {
      await this.tap(this.createNewWalletButton); // Use inherited tapElement method with retry logic
    }
  }
}

export default new OnBoardingScreen();
