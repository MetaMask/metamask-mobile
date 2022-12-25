import Gestures from '../../helpers/Gestures';
import Selectors from '../../helpers/Selectors';
import {
  ACCOUNT_LIST_MODAL_ID,
  ACCOUNT_LIST_ACCOUNT_NAMES,
} from '../../testIDs/Components/AccounstList.testIds';

class AccountListModal {
  get accountList() {
    return Selectors.getXpathElementByResourceId(ACCOUNT_LIST_MODAL_ID);
  }

  get accountsListed() {
    return Selectors.getElementsByPlatform(ACCOUNT_LIST_ACCOUNT_NAMES);
  }

  async isDisplayed() {
    await expect(this.accountList).toBeDisplayed();
  }

  async tapAccount2Option() {
    await Gestures.waitAndTap(this.account2NameText);
  }

  async tapAccount(account) {
    const elementsText = await Selectors.getElementsByPlatform(
      ACCOUNT_LIST_ACCOUNT_NAMES,
    );
    elementsText.forEach((element) => {
      const elementText = element.getText();

      if (elementText === account) {
        Gestures.tap(element);
      }
    });
  }
}

export default new AccountListModal();
