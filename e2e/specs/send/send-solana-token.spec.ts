import SendView from '../../pages/Send/RedesignedSendView';
import SolanaTestDApp from '../../pages/Browser/SolanaTestDApp';
import TokenOverview from '../../pages/wallet/TokenOverview';
import WalletView from '../../pages/wallet/WalletView';
import { SmokeConfirmationsRedesigned } from '../../tags';
import { withSolanaAccountEnabled } from '../../common-solana';

const RECIPIENT = '4Nd1mZyJY5ZqzR3n8bQF7h5L2Q9gY1yTtM6nQhc7P1Dp';

describe(SmokeConfirmationsRedesigned('Send SOL token'), () => {
  it('should send solana to an address', async () => {
    await withSolanaAccountEnabled({}, async () => {
      await device.disableSynchronization();
      await WalletView.tapOnToken('Solana', 1);
      await TokenOverview.tapSendButton();
      // using 0 value as balance of SOL is not loaded at times making test flaky
      await SendView.enterZeroAmount();
      await SendView.pressContinueButton();
      await SendView.inputRecipientAddress(RECIPIENT);
      await SendView.pressReviewButton();
      await SolanaTestDApp.tapCancelButton();
    });
  });
});
