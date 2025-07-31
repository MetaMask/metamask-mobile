import { WalletViewSelectorsIDs } from '../../e2e/selectors/wallet/WalletView.selectors';
import { CommonScreen } from './CommonScreen';

export class WalletAccountScreen extends CommonScreen {
  get accountNameLabelText() {
    return WalletViewSelectorsIDs.ACCOUNT_NAME_LABEL_TEXT;
  }

  get accountNameLabelInput() {
    return WalletViewSelectorsIDs.ACCOUNT_NAME_LABEL_INPUT;
  }

  get walletAccountOverview() {
    return WalletViewSelectorsIDs.ACCOUNT_OVERVIEW;
  }


  get accountIcon() {
    return WalletViewSelectorsIDs.ACCOUNT_ICON;
  }

  async tapOnAccountIcon() {
    await this.tapOnElement(this.accountNameLabelText);
  }

  async isAccountNameLabelEqualTo(expectedAccountName) {
    const accountName = await this.getText(this.accountNameLabelText);
    return accountName === expectedAccountName;
  }

  async isWalletAccountOverviewVisible() {
    await this.isElementByIdVisible(this.walletAccountOverview);
  }
}
