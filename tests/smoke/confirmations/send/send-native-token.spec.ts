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
import {
  REMOTE_FEATURE_FLAGS_URL_REGEX,
  setupRemoteFeatureFlagsMock,
} from '../../../api-mocking/helpers/remoteFeatureFlagsHelper';
import { Mockttp } from 'mockttp';
import {
  setupMockRequest,
  waitForProxiedRequestsMatching,
} from '../../../api-mocking/helpers/mockHelpers';
import { validateTransactionHashInTransactionFinalizedEvent } from './metricsValidationHelper';

const RECIPIENT = '0x0c54fccd2e384b4bb6f2e405bf5cbc15a017aafb';

describe(SmokeConfirmations('Send native asset'), () => {
  // Moved partially to cv tests (send.view.test.tsx, EVM coverage)
  it('should send MAX balance ETH to an address', async () => {
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
      async ({ localNodes, mockServer }) => {
        await loginToApp();
        await waitForProxiedRequestsMatching(
          mockServer,
          {
            method: 'GET',
            urlRegex: REMOTE_FEATURE_FLAGS_URL_REGEX,
          },
          {
            description: 'remote feature flags fetched',
            timeout: 30000,
          },
        );
        await device.disableSynchronization();
        // send Max ETH
        await WalletView.tapWalletSendButton();
        await SendView.selectEthereumToken();
        await SendView.pressAmountMaxButton();
        await SendView.pressContinueButton();
        await SendView.inputRecipientAddress(RECIPIENT);
        await SendView.pressReviewButton();
        await Assertions.expectElementToNotBeVisible(SendView.reviewButton, {
          description: 'Send review button dismissed',
          timeout: 5000,
        });
        await Assertions.expectElementToBeVisible(FooterActions.confirmButton, {
          description: 'Confirm button is visible on review screen',
          timeout: 30000,
        });
        await FooterActions.tapConfirmButton();
        await TabBarComponent.tapActivity();
        await Assertions.expectTextDisplayed('Confirmed');

        // Validate txHash in Transaction Finalized Event.
        // Makes the test fail if the txHash is not matching with the latest transaction on the local node.
        await validateTransactionHashInTransactionFinalizedEvent(
          localNodes,
          mockServer,
        );
      },
    );
  });
});
