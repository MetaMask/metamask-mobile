import Gestures from '../helpers/Gestures';
import Selectors from '../helpers/Selectors';
import {
  ACCOUNT_LIST_ADD_BUTTON_ID,
  ACCOUNT_LIST_ID,
} from './testIDs/Components/AccountListComponent.testIds';

class AccountListComponent {
  get accountListContainer() {
    return Selectors.getXpathElementByResourceId(ACCOUNT_LIST_ID);
  }

  get addAccountButton() {
    return Selectors.getXpathElementByResourceId(ACCOUNT_LIST_ADD_BUTTON_ID);
  }

  async tapAddAccountButton() {
    await Gestures.waitAndTap(this.addAccountButton);
  }

  async isComponentDisplayed() {
    const container = await this.accountListContainer;
    await container.waitForDisplayed();
  }

  async isComponentNotDisplayed() {
    const element = await this.accountListContainer;
    await element.waitForExist({ reverse: true });
  }
}

export default new AccountListComponent();
