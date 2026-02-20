import SendView from '../../../page-objects/Send/RedesignedSendView';
import SolanaTestDApp from '../../../page-objects/Browser/SolanaTestDApp';
import TokenOverview from '../../../page-objects/wallet/TokenOverview';
import WalletView from '../../../page-objects/wallet/WalletView';
import { SmokeConfirmations } from '../../../tags';
import { withFixtures } from '../../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../../framework/fixtures/FixtureBuilder';
import { loginToApp } from '../../../flows/wallet.flow';

// Ported flow from metamask-extension/test/e2e/tests/send/send-tron.spec.ts
const RECIPIENT = 'TK3xRFq22eEiATz6kfamDeAAQrPdfdGPeq';

describe(SmokeConfirmations('Send TRX token'), () => {
  it('reaches TRX review step and cancels confirmation', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();
        await device.disableSynchronization();

        await WalletView.waitForTokenToBeReady('Tron');
        await WalletView.tapOnToken('Tron');
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
