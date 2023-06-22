import TestHelpers from '../../helpers';
import { ADD_ACCOUNT_NEW_ACCOUNT_BUTTON } from '../../../wdio/screen-objects/testIDs/Components/AddAccountModal.testIds';

export default class AddAccountModal {
  static async tapAddNewAccount() {
    await TestHelpers.waitAndTap(ADD_ACCOUNT_NEW_ACCOUNT_BUTTON);
  }
}
