import TestHelpers from '../helpers';

import {
  LEDGER_BUTTON,
  QR_BASED_BUTTON,
} from '../../wdio/screen-objects/testIDs/Screens/SelectHardwareWalletView.testIds';

export default class SelectHardwareWalletView {
  static async tapLedgerButton() {
    await TestHelpers.waitAndTap(LEDGER_BUTTON);
  }

  static async tapQRBasedButton() {
    await TestHelpers.waitAndTap(QR_BASED_BUTTON);
  }
}
