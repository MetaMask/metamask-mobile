import TestHelpers from '../../helpers';

const PROTECT_YOUR_WALLET_MODAL_CONTAINER_ID = 'protect-wallet-modal';
import {
  NOTIFICATION_REMIND_ME_LATER_BUTTON_ID,
  SECURE_WALLET_BACKUP_ALERT_MODAL,
} from '../../../wdio/screen-objects/testIDs/Screens/WalletView.testIds';
export default class ProtectYourWalletModal {
  static async tapRemindMeLaterButton() {
    await TestHelpers.tap(NOTIFICATION_REMIND_ME_LATER_BUTTON_ID);
  }

  static async isVisible() {
    await TestHelpers.checkIfVisible(PROTECT_YOUR_WALLET_MODAL_CONTAINER_ID);
  }

  static async isNotVisible() {
    await TestHelpers.checkIfNotVisible(PROTECT_YOUR_WALLET_MODAL_CONTAINER_ID);
  }

  static async isCollapsedBackUpYourWalletModalVisible() {
    await TestHelpers.checkIfVisible(SECURE_WALLET_BACKUP_ALERT_MODAL);
  }

  static async isCollapsedBackUpYourWalletModalNotVisible() {
    await TestHelpers.checkIfNotVisible(SECURE_WALLET_BACKUP_ALERT_MODAL);
  }
}
