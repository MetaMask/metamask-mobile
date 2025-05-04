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

  get addAccountButton() {
    return element(by.id(SolanaNewFeatureSheetSelectorsIDs.SOLANA_ADD_ACCOUNT_BUTTON_IN_SHEET));
  }

  // Interaction methods
  async waitForSheetToBeVisible(timeout = 15000) {
    await Assertions.checkIfVisible(SolanaNewFeatureSheetSelectorsIDs.FEATURE_SHEET, timeout);
  }

  async tapCreateAccountButton() {
    await Gestures.waitAndTap(this.createAccountButton);
  }

  async tapAddAccountButton() {
    await Gestures.waitAndTap(this.addAccountButton);
  }

  async tapLearnMoreButton() {
    await Gestures.waitAndTap(this.learnMoreButton);
  }

  async verifySheetIsVisible() {
    await Assertions.checkIfVisible(SolanaNewFeatureSheetSelectorsIDs.FEATURE_SHEET);
  }

  async verifyLearnMoreButtonIsVisible() {
    await Assertions.checkIfVisible(SolanaNewFeatureSheetSelectorsIDs.SOLANA_LEARN_MORE_BUTTON);
  }

  async verifyAddAccountButtonIsVisible() {
    await Assertions.checkIfVisible(SolanaNewFeatureSheetSelectorsIDs.SOLANA_ADD_ACCOUNT_BUTTON_IN_SHEET);
  }


  async verifyCreateAccountButtonIsVisible() {
    await Assertions.checkIfVisible(SolanaNewFeatureSheetSelectorsIDs.CREATE_ACCOUNT_BUTTON);
  }
}

export default new SolanaNewFeatureSheet();
