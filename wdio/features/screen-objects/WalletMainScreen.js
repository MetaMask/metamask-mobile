import Selectors from '../helpers/Selectors';
import { 
  ONBOARDING_WIZARD_STEP_1_CONTAINER_ID, 
  ONBOARDING_WIZARD_STEP_1_NO_THANKS_ID 
} from '../testIDs/Components/OnboardingWizard.testIds';
import {WALLET_VIEW_BURGER_ICON_ID} from '../testIDs/Screens/WalletView.testIds';

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

  async validateOnboardingWizard() {
    await expect(this.wizardContainer).toBeDisplayed();
  }

  async tapNoThanks(){
    (await this.noThanks).touchAction('tap');
  }

  async tapBurgerIcon(){
    (await this.burgerIcon).touchAction('tap');
  }
}

export default new WalletMainScreen();
