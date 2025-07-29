import { SolanaNewFeatureSheetSelectorsIDs } from '../../selectors/wallet/SolanaNewFeatureSheet.selectors';
import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';

class SolanaNewFeatureSheet {
  // Sheet container
  get sheetContainer(): DetoxElement {
    return Matchers.getElementByID(
      SolanaNewFeatureSheetSelectorsIDs.SOLANA_NEW_FEATURE_SHEET,
    );
  }

  // Import Account button
  get importAccountButton(): DetoxElement {
    return Matchers.getElementByID(
      SolanaNewFeatureSheetSelectorsIDs.SOLANA_IMPORT_ACCOUNT_BUTTON,
    );
  }

  get learnMoreButton(): DetoxElement {
    return Matchers.getElementByID(
      SolanaNewFeatureSheetSelectorsIDs.SOLANA_LEARN_MORE_BUTTON,
    );
  }

  get notNowButton(): DetoxElement {
    return Matchers.getElementByID(
      SolanaNewFeatureSheetSelectorsIDs.SOLANA_NOT_NOW_BUTTON,
    );
  }

  get addAccountButton(): DetoxElement {
    return Matchers.getElementByID(
      SolanaNewFeatureSheetSelectorsIDs.SOLANA_ADD_ACCOUNT_BUTTON_IN_SHEET,
    );
  }

  // Interaction methods
  async tapImportAccountButton(): Promise<void> {
    await Gestures.waitAndTap(this.importAccountButton, {
      elemDescription: 'Solana New Feature Sheet Import Account Button',
    });
  }

  async tapViewAccountButton(): Promise<void> {
    await Gestures.waitAndTap(this.importAccountButton, {
      elemDescription: 'Solana New Feature Sheet View Account Button',
    });
  }

  async tapAddAccountButton(): Promise<void> {
    await Gestures.waitAndTap(this.addAccountButton, {
      elemDescription: 'Solana New Feature Sheet Add Account Button',
    });
  }

  async tapLearnMoreButton(): Promise<void> {
    await Gestures.waitAndTap(this.learnMoreButton, {
      elemDescription: 'Solana New Feature Sheet Learn More Button',
    });
  }

  async tapNotNowButton(): Promise<void> {
    await Gestures.waitAndTap(this.notNowButton, {
      elemDescription: 'Solana New Feature Sheet Not Now Button',
    });
  }

  async swipeWithCarouselLogo(): Promise<void> {
    await Gestures.swipe(this.learnMoreButton, 'down', {
      speed: 'fast',
    });
  }
}

export default new SolanaNewFeatureSheet();
