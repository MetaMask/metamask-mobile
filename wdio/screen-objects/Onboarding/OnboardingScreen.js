import {
  WALLET_SETUP_CREATE_NEW_WALLET_BUTTON_TEXT,
  WALLET_SETUP_SCREEN_DESCRIPTION_ID,
  WALLET_SETUP_SCREEN_IMPORT_FROM_SEED_BUTTON_TEXT,
  WALLET_SETUP_SCREEN_TITLE_ID,
} from '../testIDs/Screens/WalletSetupScreen.testIds';
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

  get importWalletButton() {
    return Selectors.getXpathElementByResourceId(
      OnboardingSelectorIDs.IMPORT_SEED_BUTTON,
    );
  }

  async isScreenTitleVisible() {
    await expect(this.title).toBeDisplayed();
  }

  async clickImportWalletButton() {
    await Gestures.waitAndTap(this.importWalletButton);
  }

  async tapCreateNewWalletButton() {
    await Gestures.waitAndTap(this.createNewWalletButton);
  }
}

export default new OnBoardingScreen();
