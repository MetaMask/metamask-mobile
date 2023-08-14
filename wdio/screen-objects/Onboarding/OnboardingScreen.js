import { TERMS_AND_CONDITIONS_BUTTON_ID } from '../testIDs/Components/TermsAndConditions.testIds';
import {
  WALLET_SETUP_CREATE_NEW_WALLET_BUTTON_ID,
  WALLET_SETUP_CREATE_NEW_WALLET_BUTTON_TEXT,
  WALLET_SETUP_CREATE_NEW_WALLET_TEXT,
  WALLET_SETUP_SCREEN_DESCRIPTION_ID,
  WALLET_SETUP_SCREEN_IMPORT_FROM_SEED_BUTTON_ID,
  WALLET_SETUP_SCREEN_IMPORT_FROM_SEED_BUTTON_TEXT, WALLET_SETUP_SCREEN_TITLE_ID,
  WALLET_SETUP_SCREEN_TITLE_TEXT,
} from '../testIDs/Screens/WalletSetupScreen.testIds';
import Gestures from '../../helpers/Gestures';
import Selectors from '../../helpers/Selectors';

class OnBoardingScreen {
  get title() {
    return Selectors.getXpathElementByResourceId(WALLET_SETUP_SCREEN_TITLE_ID);
  }

  get description() {
    return Selectors.getXpathElementByResourceId(
      WALLET_SETUP_SCREEN_DESCRIPTION_ID,
    );
  }

  get createNewWalletButton() {
    return Selectors.getXpathElementByText(
      WALLET_SETUP_CREATE_NEW_WALLET_BUTTON_TEXT,
    );
  }

  get importWalletButton() {
    return Selectors.getXpathElementByText(
      WALLET_SETUP_SCREEN_IMPORT_FROM_SEED_BUTTON_TEXT,
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
