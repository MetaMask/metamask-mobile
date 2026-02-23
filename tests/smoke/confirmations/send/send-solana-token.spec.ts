import SendView from '../../../../e2e/pages/Send/RedesignedSendView';
import SolanaTestDApp from '../../../../e2e/pages/Browser/SolanaTestDApp';
import TokenOverview from '../../../../e2e/pages/wallet/TokenOverview';
import WalletView from '../../../../e2e/pages/wallet/WalletView';
import { SmokeConfirmations } from '../../../../e2e/tags';
import { loginToApp } from '../../../../e2e/viewHelper';
import { withFixtures } from '../../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../../framework/fixtures/FixtureBuilder';

const RECIPIENT = '4Nd1mZyJY5ZqzR3n8bQF7h5L2Q9gY1yTtM6nQhc7P1Dp';

describe(SmokeConfirmations('Send SOL token'), () => {
  it('should send solana to an address', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();
        await device.disableSynchronization();
        await WalletView.tapOnToken('Solana');
        await TokenOverview.tapSendButton();
        await SendView.enterZeroAmount();
        await SendView.pressContinueButton();
        await SendView.inputRecipientAddress(RECIPIENT);
        await SendView.pressReviewButton();
        await SolanaTestDApp.tapCancelButton();
      },
    );
  });
});
