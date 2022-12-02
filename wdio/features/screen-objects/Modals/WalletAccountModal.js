import {
  WALLET_ACCOUNT_NAME_LABEL_TEXT,
  WALLET_ACCOUNT_NAME_LABEL_INPUT,
  WALLET_ACCOUNT_ICON
} from '../../testIDs/Screens/WalletAccount.testIds'

import Selectors from '../../helpers/Selectors';
import Gestures from '../../helpers/Gestures';

class WalletAccountModal {
  get accountNameLabelText() {
    return Selectors.getXpathElementByResourceId(WALLET_ACCOUNT_NAME_LABEL_TEXT);
  }

  get accountNameLabelInput() {
    return Selectors.getXpathElementByResourceId(WALLET_ACCOUNT_NAME_LABEL_INPUT);
  }

  async longPressAccountNameLabel() {
    await Gestures.longPress(this.accountNameLabelText, 1000);
  }

  async isAccountNameLabelEditable() {
     await expect(this.accountNameLabelInput).toBeDisplayed();
  }

  async editAccountNameLabel(text) {
    await Gestures.typeText(this.accountNameLabelInput, text);
  }

  async isAccountNameLabelEqualTo(expected) {
    const textFromElement = await this.accountNameLabelInput;
    const accountName = await textFromElement.getText();
    await expect(accountName).toContain(expected);
  }
}

export default new WalletAccountModal();
