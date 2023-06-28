import TestHelpers from '../../helpers';
import {
  WALLET_RECEIVE_ACTION_BUTTON,
  WALLET_SEND_ACTION_BUTTON,
} from '../../../wdio/screen-objects/testIDs/Components/WalletActionModal.testIds';

export default class WalletActionsModal {
  static async tapSendButton() {
    await TestHelpers.waitAndTap(WALLET_SEND_ACTION_BUTTON);
  }

  static async tapReceiveButton() {
    await TestHelpers.waitAndTap(WALLET_RECEIVE_ACTION_BUTTON);
  }
}
