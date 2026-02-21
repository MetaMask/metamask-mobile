import SendView from '../../../page-objects/Send/RedesignedSendView';
import SolanaTestDApp from '../../../page-objects/Browser/SolanaTestDApp';
import TokenOverview from '../../../page-objects/wallet/TokenOverview';
import WalletView from '../../../page-objects/wallet/WalletView';
import { SmokeConfirmations } from '../../../tags';
import { loginToApp } from '../../../flows/wallet.flow';
import { withFixtures } from '../../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../../framework/fixtures/FixtureBuilder';

// Ported flow from metamask-extension/test/e2e/tests/send/send-solana.spec.ts
const RECIPIENT = '4Nd1mZyJY5ZqzR3n8bQF7h5L2Q9gY1yTtM6nQhc7P1Dp';

describe(SmokeConfirmations('Send SOL token'), () => {
  it('reaches SOL review step and cancels confirmation', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();
        await device.disableSynchronization();

        await WalletView.waitForTokenToBeReady('Solana');
        await WalletView.tapOnToken('Solana');
        await TokenOverview.tapSendButton();
        await SendView.typeInTransactionAmount('1');
        await SendView.pressContinueButton();
        await SendView.inputRecipientAddress(RECIPIENT);
        await SendView.pressReviewButton();
        await SolanaTestDApp.tapCancelButton();
      },
    );
  });
});
