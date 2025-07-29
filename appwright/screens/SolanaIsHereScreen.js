import { expect } from 'appwright';
import { SolanaNewFeatureSheetSelectorsIDs } from '../../e2e/selectors/wallet/SolanaNewFeatureSheet.selectors';
import { CommonScreen } from "./CommonScreen";

export class SolanaIsHereScreen extends CommonScreen {

  get importAccountButton() {
    return SolanaNewFeatureSheetSelectorsIDs.SOLANA_IMPORT_ACCOUNT_BUTTON;
  }

  get notNowButton() {
    return SolanaNewFeatureSheetSelectorsIDs.SOLANA_NOT_NOW_BUTTON;
  }

  async tapOnImportAccountButton() {
    await this.tapOnElement(this.importAccountButton);
  }

  async tapOnNotNowButton() {
    await this.tapOnElement(this.notNowButton);
  }

  async isVisible() {
    await this.isElementByIdVisible(this.importAccountButton);
    await this.isElementByIdVisible(this.notNowButton);
  }

}