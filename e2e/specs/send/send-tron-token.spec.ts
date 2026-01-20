import SendView from '../../pages/Send/RedesignedSendView';
import TokenOverview from '../../pages/wallet/TokenOverview';
import WalletView from '../../pages/wallet/WalletView';
import { SmokeConfirmationsRedesigned } from '../../tags';
import { withTronAccountEnabled } from '../../common-tron';

describe(SmokeConfirmationsRedesigned('Send TRX token'), () => {
  it('shows invalid value error', async () => {
    await withTronAccountEnabled(async () => {
      await device.disableSynchronization();
      await WalletView.tapOnToken('Tron');
      await TokenOverview.tapSendButton();
      await SendView.enterZeroAmount();
      await SendView.checkInvalidValueError();
    });
  });
  it('shows insufficient balance to cover fees error', async () => {
    await withTronAccountEnabled(async () => {
      await device.disableSynchronization();
      await WalletView.tapOnToken('Tron');
      await TokenOverview.tapSendButton();
      await SendView.pressFiftyPercentButton();
      await SendView.pressContinueButton();
      await SendView.checkInsufficientBalanceToCoverFeesError();
    });
  });
});
