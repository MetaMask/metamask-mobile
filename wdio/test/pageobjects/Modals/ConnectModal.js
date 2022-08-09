import TestHelpers from '../../helpers';
import {
  ACCOUNT_APROVAL_MODAL_CONTAINER_ID,
  CANCEL_BUTTON_ID,
  CONNECT_BUTTON_ID,
} from '../../../app/constants/test-ids';

export default class ConnectModal {
  static async tapCancelButton() {
    await TestHelpers.tap(CANCEL_BUTTON_ID);
  }

  static async tapConnectButton() {
    await TestHelpers.tap(CONNECT_BUTTON_ID);
  }

  static async isVisible() {
    await TestHelpers.checkIfVisible(ACCOUNT_APROVAL_MODAL_CONTAINER_ID);
  }

  static async isNotVisible() {
    await TestHelpers.checkIfNotVisible(ACCOUNT_APROVAL_MODAL_CONTAINER_ID);
  }
}
