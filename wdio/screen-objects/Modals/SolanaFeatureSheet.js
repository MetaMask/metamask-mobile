'use strict';

import { SolanaNewFeatureSheetSelectorsIDs } from '../../../e2e/selectors/wallet/SolanaNewFeatureSheet.selectors';
import { WalletViewSelectorsIDs } from '../../../e2e/selectors/wallet/WalletView.selectors';
import Selectors from '../../helpers/Selectors';
import Gestures from '../../helpers/Gestures';
import AppwrightSelectors from '../../helpers/AppwrightSelectors';
import { expect as appwrightExpect } from 'appwright';



class SolanaNewFeatureSheet {

  get device() {
    return this._device;
  }

  set device(device) {
    this._device = device;
  }
  // Sheet container
  get container() {
    if (!this._device) {
      return Selectors.getXpathElementByResourceId(SolanaNewFeatureSheetSelectorsIDs.SOLANA_NEW_FEATURE_SHEET);
    } else {
      return AppwrightSelectors.getElementByID(this._device, SolanaNewFeatureSheetSelectorsIDs.SOLANA_NEW_FEATURE_SHEET);
    }
  }

  // Import Account button
  get importAccountButton() {
    if (!this._device) {
      return Selectors.getXpathElementByResourceId(SolanaNewFeatureSheetSelectorsIDs.SOLANA_IMPORT_ACCOUNT_BUTTON);
    } else {
      return AppwrightSelectors.getElementByID(this._device, SolanaNewFeatureSheetSelectorsIDs.SOLANA_IMPORT_ACCOUNT_BUTTON);
    }
  }

  get learnMoreButton() {
    if (!this._device) {
      return Selectors.getXpathElementByResourceId(SolanaNewFeatureSheetSelectorsIDs.SOLANA_LEARN_MORE_BUTTON);
    } else {
      return AppwrightSelectors.getElementByID(this._device, SolanaNewFeatureSheetSelectorsIDs.SOLANA_LEARN_MORE_BUTTON);
    }
  }

  get notNowButton() {
    if (!this._device) {
      return Selectors.getXpathElementByResourceId(SolanaNewFeatureSheetSelectorsIDs.SOLANA_NOT_NOW_BUTTON);
    } else {
      return AppwrightSelectors.getElementByID(this._device, SolanaNewFeatureSheetSelectorsIDs.SOLANA_NOT_NOW_BUTTON);
    }
  }

  get addAccountButton() {
    if (!this._device) {
      return Selectors.getXpathElementByResourceId(SolanaNewFeatureSheetSelectorsIDs.SOLANA_ADD_ACCOUNT_BUTTON_IN_SHEET);
    } else {
      return AppwrightSelectors.getElementByID(this._device, SolanaNewFeatureSheetSelectorsIDs.SOLANA_ADD_ACCOUNT_BUTTON_IN_SHEET);
    }
  }

  get carouselLogo() {
    if (!this._device) {
      return Selectors.getXpathElementByResourceId(WalletViewSelectorsIDs.CAROUSEL_SIXTH_SLIDE);
    } else {
      return AppwrightSelectors.getElementByID(this._device, WalletViewSelectorsIDs.CAROUSEL_SIXTH_SLIDE);
    }
  }

  // Interaction methods
  async tapImportAccountButton() {
    if (!this._device) {
      await Gestures.waitAndTap(this.importAccountButton);
    } else {
      await this.importAccountButton.tap();
    }
  }

  async tapViewAccountButton() {
    if (!this._device) {
      await Gestures.waitAndTap(this.importAccountButton);//Create account testID is used for both create and view account actions
    } else {
      await this.importAccountButton.tap();
    }
  }

  async tapAddAccountButton() {
    if (!this._device) {
      await Gestures.waitAndTap(this.addAccountButton);
    } else {
      await this.addAccountButton.tap();
    }
  }

  async tapLearnMoreButton() {
    if (!this._device) {
      await Gestures.waitAndTap(this.learnMoreButton);
    } else {
      await this.learnMoreButton.tap();
    }
  }


  async tapNotNowButton() {
    if (!this._device) {
      await Gestures.waitAndTap(this.notNowButton);
    } else {
      const button = await this.notNowButton;
      await button.tap();
    }
  }

  async isVisible() {
    if (!this._device) {
      await expect(this.importAccountButton).toBeDisplayed();
    } else {
      const element = await this.importAccountButton;
      await appwrightExpect(element).toBeVisible({ timeout: 10000 });
    }
  }

  async isNotVisible() {
    if (!this._device) {
      await expect(this.container).not.toBeDisplayed();
    } else {
      await expect(this.container).not.toBeVisible();
    }
  }

}

export default new SolanaNewFeatureSheet();
