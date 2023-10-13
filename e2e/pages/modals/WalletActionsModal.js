import TestHelpers from '../../helpers';
import { WALLET_SEND } from '../../../app/components/Views/WalletActions/WalletActions.constants';

export default class WalletActionsModal {
  static async tapSendButton() {
    await TestHelpers.waitAndTap(WALLET_SEND);
  }
}
