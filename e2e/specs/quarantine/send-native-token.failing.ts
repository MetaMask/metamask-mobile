import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import FooterActions from '../../pages/Browser/Confirmations/FooterActions';
import SendView from '../../pages/Send/RedesignedSendView';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import WalletView from '../../pages/wallet/WalletView';
import { Assertions } from '../../framework';
import { DappVariants } from '../../framework/Constants';
import { SmokeConfirmationsRedesigned } from '../../tags';
import { AnvilPort } from '../../framework/fixtures/FixtureUtils';
import { loginToApp } from '../../viewHelper';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import { LocalNode } from '../../framework/types';
import { AnvilManager } from '../../seeder/anvil-manager';

const RECIPIENT = '0x0c54fccd2e384b4bb6f2e405bf5cbc15a017aafb';

describe(SmokeConfirmationsRedesigned('Send native asset'), () => {
  it('should send ETH to an address', async () => {
    await withFixtures(
      {
        dapps: [
          {
            dappVariant: DappVariants.TEST_DAPP,
          },
        ],
        fixture: ({ localNodes }: { localNodes?: LocalNode[] }) => {
          const node = localNodes?.[0] as unknown as AnvilManager;
          const rpcPort =
            node instanceof AnvilManager
              ? (node.getPort() ?? AnvilPort())
              : undefined;

          return new FixtureBuilder()
            .withNetworkController({
              providerConfig: {
                chainId: '0x539',
                rpcUrl: `http://localhost:${rpcPort ?? AnvilPort()}`,
                type: 'custom',
                nickname: 'Local RPC',
                ticker: 'ETH',
              },
            })
            .build();
        },
        restartDevice: true,
      },
      async () => {
        await loginToApp();
        await device.disableSynchronization();
        // send 5 ETH
        await WalletView.tapWalletSendButton();
        await SendView.selectEthereumToken();
        await SendView.pressAmountFiveButton();
        await SendView.pressContinueButton();
        await SendView.inputRecipientAddress(RECIPIENT);
        await SendView.pressReviewButton();
        await FooterActions.tapConfirmButton();
        await TabBarComponent.tapActivity();
        await Assertions.expectTextDisplayed('Confirmed');

        // send 50% ETH
        await TabBarComponent.tapWallet();
        await WalletView.tapWalletSendButton();
        await SendView.selectEthereumToken();
        await SendView.pressFiftyPercentButton();
        await SendView.pressContinueButton();
        await SendView.inputRecipientAddress(RECIPIENT);
        await SendView.pressReviewButton();
        await FooterActions.tapConfirmButton();
        await TabBarComponent.tapActivity();
        await Assertions.expectTextDisplayed('Confirmed');

        // send Max ETH
        await TabBarComponent.tapWallet();
        await WalletView.tapWalletSendButton();
        await SendView.selectEthereumToken();
        await SendView.pressAmountMaxButton();
        await SendView.pressContinueButton();
        await SendView.inputRecipientAddress(RECIPIENT);
        await SendView.pressReviewButton();
        await FooterActions.tapConfirmButton();
        await TabBarComponent.tapActivity();
        await Assertions.expectTextDisplayed('Confirmed');
      },
    );
  });
});
