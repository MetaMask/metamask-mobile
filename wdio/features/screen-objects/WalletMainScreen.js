import { WALLET_CONTAINER_ID} from '../testIDs/Screens/WalletScreen-testIds.js';
import {
  ONBOARDING_WIZARD_STEP_1_CONTAINER_ID,
  ONBOARDING_WIZARD_STEP_1_NO_THANKS_ID,
} from '../testIDs/Components/OnboardingWizard.testIds';
import Selectors from '../helpers/Selectors';
import {WALLET_VIEW_BURGER_ICON_ID} from '../testIDs/Screens/WalletView.testIds';
import Gestures from '../helpers/Gestures.js';

class WalletMainScreen {

  get wizardContainer(){
    return Selectors.getElementByPlatform(ONBOARDING_WIZARD_STEP_1_CONTAINER_ID);
  }

  get noThanks(){
    return Selectors.getElementByPlatform(ONBOARDING_WIZARD_STEP_1_NO_THANKS_ID);
  }

  get burgerIcon(){
    return Selectors.getElementByPlatform(WALLET_VIEW_BURGER_ICON_ID);
  }

  get WalletScreenContainer(){
    return Selectors.getElementByPlatform(WALLET_CONTAINER_ID);
  }

  async isOnboardingWizardVisible() {
    await expect(this.wizardContainer).toBeDisplayed();
  }

  async tapNoThanks(){
    await Gestures.waitAndTap(this.noThanks);
  }

  async tapBurgerIcon(){
    await Gestures.waitAndTap(this.burgerIcon);
  }

  async isVisible() {
    await expect(this.WalletScreenContainer).toBeDisplayed();
  }
}

export default new WalletMainScreen();
