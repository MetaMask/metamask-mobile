import {
  ACCOUNT_OVERVIEW_ID,
  WALLET_ACCOUNT_NAME_LABEL_INPUT,
  WALLET_ACCOUNT_NAME_LABEL_TEXT,
} from '../testIDs/Screens/WalletView.testIds';

import Selectors from '../../helpers/Selectors';
import Gestures from '../../helpers/Gestures';

class WalletAccountModal {
  get accountNameLabelText() {
    return Selectors.getElementByPlatform(WALLET_ACCOUNT_NAME_LABEL_TEXT);
  }

  get accountNameLabelInput() {
    return Selectors.getElementByPlatform(WALLET_ACCOUNT_NAME_LABEL_INPUT);
  }

  get walletAccountOverview() {
    return Selectors.getXpathElementByResourceId(ACCOUNT_OVERVIEW_ID);
  }

  async longPressAccountNameLabel() {
    await Gestures.longPress(this.accountNameLabelText, 1000);
  }

  async editAccountNameLabel(text) {
    await Gestures.typeText(this.accountNameLabelInput, text);
  }

  async isAccountNameLabelEditable() {
    await expect(this.accountNameLabelInput).toBeDisplayed();
  }

  async isAccountNameLabelEqualTo(expected) {
    const textFromElement = await this.accountNameLabelText;
    const accountName = await textFromElement.getText();
    await expect(accountName).toContain(expected);
  }

  async isAccountInputLabelEqualTo(expected) {
    const textFromElement = await this.accountNameLabelInput;
    const accountName = await textFromElement.getText();
    await expect(accountName).toContain(expected);
  }

  async isAccountOverview() {
    await expect(await this.walletAccountOverview).toBeDisplayed();
  }
}

export default new WalletAccountModal();
