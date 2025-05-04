'use strict';

import { SolanaNewFeatureSheetSelectorsIDs } from '../../selectors/wallet/SolanaNewFeatureSheet.selectors';
import Gestures from '../../utils/Gestures';
import Assertions from '../../utils/Assertions';

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
}

export default new SolanaNewFeatureSheet();
