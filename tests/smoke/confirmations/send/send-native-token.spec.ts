/* eslint-disable jest/no-disabled-tests -- E2E skipped; covered by component view tests */
import FixtureBuilder, {
  DEFAULT_FIXTURE_ACCOUNT,
} from '../../../framework/fixtures/FixtureBuilder';
import FooterActions from '../../../page-objects/Browser/Confirmations/FooterActions';
import SendView from '../../../page-objects/Send/RedesignedSendView';
import TabBarComponent from '../../../page-objects/wallet/TabBarComponent';
import WalletView from '../../../page-objects/wallet/WalletView';
import { Assertions } from '../../../framework';
import { DappVariants, LOCAL_NODE_RPC_URL } from '../../../framework/Constants';
import { SmokeConfirmations } from '../../../tags';
import { loginToApp } from '../../../flows/wallet.flow';
import { withFixtures } from '../../../framework/fixtures/FixtureHelper';
import { LocalNode } from '../../../framework/types';
import { setupRemoteFeatureFlagsMock } from '../../../api-mocking/helpers/remoteFeatureFlagsHelper';
import { Mockttp } from 'mockttp';
import { setupMockRequest } from '../../../api-mocking/helpers/mockHelpers';
import { validateTransactionHashInTransactionFinalizedEvent } from './metricsValidationHelper';

const RECIPIENT = '0x0c54fccd2e384b4bb6f2e405bf5cbc15a017aafb';

describe(SmokeConfirmations('Send native asset'), () => {
  // Moved to cv tests (send.view.test.tsx)
  it.skip('should send ETH to an address', async () => {
    await withFixtures(
      {
        dapps: [
          {
            dappVariant: DappVariants.TEST_DAPP,
          },
        ],
        fixture: new FixtureBuilder()
          .withNetworkController({
            chainId: '0x539',
            rpcUrl: LOCAL_NODE_RPC_URL,
            type: 'custom',
            nickname: 'Local RPC',
            ticker: 'ETH',
          })
          .withMetaMetricsOptIn()
          .withPreferencesController({})
          .build(),
        testSpecificMock: async (mockServer: Mockttp) => {
          await setupRemoteFeatureFlagsMock(mockServer);

          await setupMockRequest(mockServer, {
            requestMethod: 'PUT',
            url: /https:\/\/authentication\.api\.cx\.metamask\.io\/api\/v2\/profile\/accounts/i,
            response: {
              message: 'OK',
            },
            responseCode: 200,
          });

          await setupMockRequest(mockServer, {
            url: /accounts\.api\.cx\.metamask\.io\/v4\/multiaccount\/balances/,
            response: {
              balances: [
                {
                  object: 'token',
                  address: '0x0000000000000000000000000000000000000000',
                  symbol: 'ETH',
                  name: 'Ether',
                  type: 'native',
                  decimals: 18,
                  chainId: 1337,
                  balance: '10.000000000000000000',
                  accountAddress: `eip155:1337:${DEFAULT_FIXTURE_ACCOUNT}`,
                },
              ],
              unprocessedNetworks: [],
            },
            requestMethod: 'GET',
            responseCode: 200,
          });
        },
        restartDevice: true,
      },
      async ({
        localNodes,
        mockServer,
      }: {
        localNodes?: LocalNode[];
        mockServer?: Mockttp;
      }) => {
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

        // Validate txHash in Transaction Finalized Event.
        // Makes the test fail if the txHash is not matching with the latest transaction on the local node.
        await validateTransactionHashInTransactionFinalizedEvent(
          localNodes,
          mockServer,
        );

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
