import SendView from '../../pages/Send/RedesignedSendView';
import SolanaTestDApp from '../../pages/Browser/SolanaTestDApp';
import WalletView from '../../pages/wallet/WalletView';
import { SmokeConfirmationsRedesigned } from '../../tags';
import { withSolanaAccountEnabled } from '../../common-solana';

const RECIPIENT = '4Nd1mZyJY5ZqzR3n8bQF7h5L2Q9gY1yTtM6nQhc7P1Dp';

describe(SmokeConfirmationsRedesigned('Send native asset'), () => {
  it('should send ETH to an address', async () => {
    await withSolanaAccountEnabled({}, async () => {
      await device.disableSynchronization();
      await WalletView.tapWalletSendButton();
      await SendView.selectSolanaToken();
      await SendView.enterSmallAmount();
      await SendView.pressContinueButton();
      await SendView.inputRecipientAddress(RECIPIENT);
      await SendView.pressReviewButton();
      await SolanaTestDApp.tapCancelButton();
    });
  });
});
