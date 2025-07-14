import Gestures from '../../helpers/Gestures';
import Selectors from '../../helpers/Selectors';
import { OnboardingSelectorIDs } from '../../../e2e/selectors/Onboarding/Onboarding.selectors';

class OnBoardingScreen {
  get title() {
    return Selectors.getXpathElementByResourceId(OnboardingSelectorIDs.SCREEN_TITLE);
  }

  get description() {
    return Selectors.getXpathElementByResourceId(
      OnboardingSelectorIDs.SCREEN_DESCRIPTION,
    );
  }

  get createNewWalletButton() {
    return Selectors.getXpathElementByResourceId(
      OnboardingSelectorIDs.NEW_WALLET_BUTTON,
    );
  }

  get existingWalletButton() {
    return Selectors.getXpathElementByResourceId(
      OnboardingSelectorIDs.EXISTING_WALLET_BUTTON,
    );
  }

  async isScreenTitleVisible() {
    await expect(this.title).toBeDisplayed();
  }

  async tapHaveAnExistingWallet() {
    await Gestures.waitAndTap(this.existingWalletButton);
  }

  async tapCreateNewWalletButton() {
    await Gestures.waitAndTap(this.createNewWalletButton);
  }
}

export default new OnBoardingScreen();
