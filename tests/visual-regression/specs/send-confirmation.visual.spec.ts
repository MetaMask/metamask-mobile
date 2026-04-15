import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import { loginToApp } from '../../flows/wallet.flow';
import WalletView from '../../page-objects/wallet/WalletView';
import SendView from '../../page-objects/Send/RedesignedSendView';
import { Assertions } from '../../framework';
import { VisualRegression } from '../../tags';
import { visualCheck } from '../visual-check';
import { createTestConfig } from '../ai/visual-test-config';
import { LOCAL_NODE_RPC_URL } from '../../framework/Constants';
import FooterActions from '../../page-objects/Browser/Confirmations/FooterActions';

const RECIPIENT = '0x0c54fccd2e384b4bb6f2e405bf5cbc15a017aafb';

describe(VisualRegression('Send Confirmation'), () => {
  it('send ETH confirmation screen matches baseline', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder()
          .withNetworkController({
            chainId: '0x539',
            rpcUrl: LOCAL_NODE_RPC_URL,
            type: 'custom',
            nickname: 'Local RPC',
            ticker: 'ETH',
          })
          .build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();
        await device.disableSynchronization();

        // Navigate to send confirmation
        await WalletView.tapWalletSendButton();
        await SendView.selectEthereumToken();
        await SendView.pressAmountFiveButton();
        await SendView.pressContinueButton();
        await SendView.inputRecipientAddress(RECIPIENT);
        await SendView.pressReviewButton();

        await Assertions.expectElementToBeVisible(FooterActions.confirmButton, {
          description: 'Confirm button should be visible',
          timeout: 10000,
        });

        // Wait for confirmation screen to fully render (gas fees loading)
        await new Promise((resolve) => setTimeout(resolve, 5000));

        await visualCheck(
          'send-eth-confirmation',
          createTestConfig.sendConfirmation(),
        );
      },
    );
  });
});
