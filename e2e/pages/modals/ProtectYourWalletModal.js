import TestHelpers from '../../helpers';

import {
  NOTIFICATION_REMIND_ME_LATER_BUTTON_ID,
  SECURE_WALLET_BACKUP_ALERT_MODAL,
} from '../../../wdio/screen-objects/testIDs/Screens/WalletView.testIds';
import { ProtectWalletModalSelectorsIDs } from '../../selectors/Modals/ProtectWalletModal.selectors';
export default class ProtectYourWalletModal {
  static async tapRemindMeLaterButton() {
    await TestHelpers.tap(NOTIFICATION_REMIND_ME_LATER_BUTTON_ID);
  }

  static async isVisible() {
    await TestHelpers.checkIfVisible(ProtectWalletModalSelectorsIDs.CONTAINER);
  }

  static async isNotVisible() {
    await TestHelpers.checkIfNotVisible(
      ProtectWalletModalSelectorsIDs.CONTAINER,
    );
  }

  static async isCollapsedBackUpYourWalletModalVisible() {
    await TestHelpers.checkIfVisible(SECURE_WALLET_BACKUP_ALERT_MODAL);
  }
}
