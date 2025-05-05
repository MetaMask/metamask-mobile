'use strict';

import { SolanaNewFeatureSheetSelectorsIDs } from '../../selectors/wallet/SolanaNewFeatureSheet.selectors';
import Gestures from '../../utils/Gestures';
import Assertions from '../../utils/Assertions';
import { WalletViewSelectorsIDs } from '../../selectors/wallet/WalletView.selectors';

class SolanaNewFeatureSheet {
  // Sheet container
  get sheetContainer() {
    return element(by.id(SolanaNewFeatureSheetSelectorsIDs.SOLANA_NEW_FEATURE_SHEET));
  }

  // Create Account button
  get createAccountButton() {
    return element(by.id(SolanaNewFeatureSheetSelectorsIDs.SOLANA_CREATE_ACCOUNT_BUTTON));
  }

  get learnMoreButton() {
    return element(by.id(SolanaNewFeatureSheetSelectorsIDs.SOLANA_LEARN_MORE_BUTTON));
  }

  get notNowButton() {
    return element(by.id(SolanaNewFeatureSheetSelectorsIDs.SOLANA_NOT_NOW_BUTTON));
  }

  get addAccountButton() {
    return element(by.id(SolanaNewFeatureSheetSelectorsIDs.SOLANA_ADD_ACCOUNT_BUTTON_IN_SHEET));
  }

  get carouselLogo() {
    return element(by.id(WalletViewSelectorsIDs.CAROUSEL_SIXTH_SLIDE));
  }

  // Interaction methods
  async tapCreateAccountButton() {
    await Gestures.waitAndTap(this.createAccountButton);
  }

  async tapAddAccountButton() {
    await Gestures.waitAndTap(this.addAccountButton);
  }

  async tapLearnMoreButton() {
    await Gestures.waitAndTap(this.learnMoreButton);
  }

  async verifyCreateAccountButtonIsVisible() {
    await Assertions.checkIfVisible(SolanaNewFeatureSheetSelectorsIDs.CREATE_ACCOUNT_BUTTON);
  }

  async tapNotNowButton() {
    await Gestures.waitAndTap(this.notNowButton);
  }

  async swipeWithCarouselLogo() {
    await Gestures.swipe(this.learnMoreButton, 'down', 'fast');
  }
}

export default new SolanaNewFeatureSheet();
