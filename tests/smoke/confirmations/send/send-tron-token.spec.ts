import SendView from '../../../../e2e/pages/Send/RedesignedSendView';
import TokenOverview from '../../../../e2e/pages/wallet/TokenOverview';
import WalletView from '../../../../e2e/pages/wallet/WalletView';
import { SmokeConfirmations } from '../../../../e2e/tags';
import { withFixtures } from '../../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../../framework/fixtures/FixtureBuilder';
import { loginToApp } from '../../../../e2e/viewHelper';

describe(SmokeConfirmations('Send TRX token'), () => {
  it.skip('shows insufficient funds', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();
        await device.disableSynchronization();
        await WalletView.tapOnToken('Tron');
        await TokenOverview.tapSendButton();
        await SendView.enterZeroAmount();
        await SendView.checkInsufficientFundsError();
      },
    );
  });
});
