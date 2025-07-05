'use strict';

import { SolanaNewFeatureSheetSelectorsIDs } from '../../selectors/wallet/SolanaNewFeatureSheet.selectors';
import Gestures from '../../framework/Gestures.ts';
import { WalletViewSelectorsIDs } from '../../selectors/wallet/WalletView.selectors';
import Matchers from '../../framework/Matchers.ts';

class SolanaNewFeatureSheet {
  // Sheet container
  get sheetContainer() {
    return Matchers.getElementByID(SolanaNewFeatureSheetSelectorsIDs.SOLANA_NEW_FEATURE_SHEET);
  }

  // Create Account button
  get createAccountButton() {
    return Matchers.getElementByID(SolanaNewFeatureSheetSelectorsIDs.SOLANA_CREATE_ACCOUNT_BUTTON);
  }

  get learnMoreButton() {
    return Matchers.getElementByID(SolanaNewFeatureSheetSelectorsIDs.SOLANA_LEARN_MORE_BUTTON);
  }

  get notNowButton() {
    return Matchers.getElementByID(SolanaNewFeatureSheetSelectorsIDs.SOLANA_NOT_NOW_BUTTON);
  }

  get addAccountButton() {
    return Matchers.getElementByID(SolanaNewFeatureSheetSelectorsIDs.SOLANA_ADD_ACCOUNT_BUTTON_IN_SHEET);
  }

  get carouselLogo() {
    return Matchers.getElementByID(WalletViewSelectorsIDs.CAROUSEL_SIXTH_SLIDE);
  }

  // Interaction methods
  async tapCreateAccountButton() {
    await Gestures.waitAndTap(this.createAccountButton, {
      elemDescription: 'Solana New Feature Sheet Create Account Button',
    });
  }

  async tapViewAccountButton() {
    await Gestures.waitAndTap(this.createAccountButton, { //Create account testID is used for both create and view account actions
      elemDescription: 'Solana New Feature Sheet View Account Button',
    });
  }

  async tapAddAccountButton() {
    await Gestures.waitAndTap(this.addAccountButton);
  }

  async tapLearnMoreButton() {
    await Gestures.waitAndTap(this.learnMoreButton);
  }


  async tapNotNowButton() {
    await Gestures.waitAndTap(this.notNowButton, {
      elemDescription: 'Solana New Feature Sheet Not Now Button',
    });
  }

  async swipeWithCarouselLogo() {
    await Gestures.swipe(this.learnMoreButton, 'down', 'fast');
  }
}

export default new SolanaNewFeatureSheet();
