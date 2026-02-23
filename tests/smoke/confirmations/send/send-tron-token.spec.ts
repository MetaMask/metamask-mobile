import SendView from '../../../page-objects/Send/RedesignedSendView';
import TokenOverview from '../../../page-objects/wallet/TokenOverview';
import WalletView from '../../../page-objects/wallet/WalletView';
import { SmokeConfirmations } from '../../../tags';
import { withFixtures } from '../../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../../framework/fixtures/FixtureBuilder';
import { loginToApp } from '../../../flows/wallet.flow';

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
