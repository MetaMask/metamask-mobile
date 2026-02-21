import SendView from '../../../page-objects/Send/RedesignedSendView';
import TokenOverview from '../../../page-objects/wallet/TokenOverview';
import WalletView from '../../../page-objects/wallet/WalletView';
import { SmokeConfirmations } from '../../../tags';
import { withFixtures } from '../../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../../framework/fixtures/FixtureBuilder';
import { loginToApp } from '../../../flows/wallet.flow';

// Ported flow from metamask-extension/test/e2e/tests/send/btc-send.spec.ts
const TOKEN = 'Bitcoin';

describe(SmokeConfirmations('Send Bitcoin'), () => {
  it('shows insufficient funds for a high BTC amount', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();
        await device.disableSynchronization();
        await WalletView.waitForTokenToBeReady(TOKEN, 0);
        await WalletView.tapOnToken(TOKEN);
        await TokenOverview.tapSendButton();
        await SendView.pressAmountFiveButton();
        await SendView.checkInsufficientFundsError();
      },
    );
  });
});
