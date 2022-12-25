import {
  WALLET_ACCOUNT_NAME_LABEL_TEXT,
  WALLET_ACCOUNT_NAME_LABEL_INPUT,
  WALLET_ACCOUNT_ADDRESS,
} from '../../testIDs/Screens/WalletAccount.testIds';
import { driver } from '@wdio/appium-service';

import Selectors from '../../helpers/Selectors';
import Gestures from '../../helpers/Gestures';

class WalletAccountModal {
  get accountNameLabelText() {
    return Selectors.getXpathElementByResourceId(
      WALLET_ACCOUNT_NAME_LABEL_TEXT,
    );
  }

  get accountNameLabelInput() {
    return Selectors.getXpathElementByResourceId(
      WALLET_ACCOUNT_NAME_LABEL_INPUT,
    );
  }

  get walletAddress() {
    return Selectors.getElementByPlatform(WALLET_ACCOUNT_ADDRESS);
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

  async tapWalletAddress() {
    await Gestures.tap(this.walletAddress);
  }
}

export default new WalletAccountModal();
