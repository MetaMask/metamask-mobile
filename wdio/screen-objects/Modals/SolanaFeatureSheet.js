'use strict';

import { SolanaNewFeatureSheetSelectorsIDs } from '../../../e2e/selectors/wallet/SolanaNewFeatureSheet.selectors';
import { WalletViewSelectorsIDs } from '../../../e2e/selectors/wallet/WalletView.selectors';
import Selectors from '../../helpers/Selectors';
import Gestures from '../../helpers/Gestures';



class SolanaNewFeatureSheet {
  // Sheet container
  get container() {
    return Selectors.getXpathElementByResourceId(SolanaNewFeatureSheetSelectorsIDs.SOLANA_NEW_FEATURE_SHEET);
  }

  // Import Account button
  get importAccountButton() {
    return Selectors.getXpathElementByResourceId(SolanaNewFeatureSheetSelectorsIDs.SOLANA_IMPORT_ACCOUNT_BUTTON);
  }

  get learnMoreButton() {
    return Selectors.getXpathElementByResourceId(SolanaNewFeatureSheetSelectorsIDs.SOLANA_LEARN_MORE_BUTTON);
  }

  get notNowButton() {
    return Selectors.getXpathElementByResourceId(SolanaNewFeatureSheetSelectorsIDs.SOLANA_NOT_NOW_BUTTON);
  }

  get addAccountButton() {
    return Selectors.getXpathElementByResourceId(SolanaNewFeatureSheetSelectorsIDs.SOLANA_ADD_ACCOUNT_BUTTON_IN_SHEET);
  }

  get carouselLogo() {
    return Selectors.getXpathElementByResourceId(WalletViewSelectorsIDs.CAROUSEL_SIXTH_SLIDE);
  }

  // Interaction methods
  async tapImportAccountButton() {
    await Gestures.waitAndTap(this.importAccountButton);
  }

  async tapViewAccountButton() {
    await Gestures.waitAndTap(this.importAccountButton);//Create account testID is used for both create and view account actions
  }

  async tapAddAccountButton() {
    await Gestures.waitAndTap(this.addAccountButton);
  }

  async tapLearnMoreButton() {
    await Gestures.waitAndTap(this.learnMoreButton);
  }


  async tapNotNowButton() {
    await Gestures.waitAndTap(this.notNowButton);
  }

  async isVisible() {
    await expect(this.container).toBeDisplayed();
  }

  async isNotVisible() {
    await expect(this.container).not.toBeDisplayed();
  }

}

export default new SolanaNewFeatureSheet();
