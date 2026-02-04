import FixtureBuilder from '../../../framework/fixtures/FixtureBuilder';
import FooterActions from '../../../../e2e/pages/Browser/Confirmations/FooterActions';
import SendView from '../../../../e2e/pages/Send/RedesignedSendView';
import TabBarComponent from '../../../../e2e/pages/wallet/TabBarComponent';
import WalletView from '../../../../e2e/pages/wallet/WalletView';
import { Assertions } from '../../../framework';
import { DappVariants, LOCAL_NODE_RPC_URL } from '../../../framework/Constants';
import { SmokeConfirmations } from '../../../../e2e/tags';
import { loginToApp } from '../../../../e2e/viewHelper';
import { withFixtures } from '../../../framework/fixtures/FixtureHelper';
import { LocalNode } from '../../../framework/types';
import { setupRemoteFeatureFlagsMock } from '../../../api-mocking/helpers/remoteFeatureFlagsHelper';
import { remoteFeatureFlagExtensionUxPna25 } from '../../../api-mocking/mock-responses/feature-flags-mocks';
import { Mockttp } from 'mockttp';
import { setupMockRequest } from '../../../api-mocking/helpers/mockHelpers';
import { validateTransactionHashInTransactionFinalizedEvent } from './metricsValidationHelper';

const RECIPIENT = '0x0c54fccd2e384b4bb6f2e405bf5cbc15a017aafb';

describe(SmokeConfirmations('Send native asset'), () => {
  it('should send ETH to an address', async () => {
    await withFixtures(
      {
        dapps: [
          {
            dappVariant: DappVariants.TEST_DAPP,
          },
        ],
        fixture: new FixtureBuilder()
          .withNetworkController({
            providerConfig: {
              chainId: '0x539',
              rpcUrl: LOCAL_NODE_RPC_URL,
              type: 'custom',
              nickname: 'Local RPC',
              ticker: 'ETH',
            },
          })
          .withMetaMetricsOptIn()
          .withPreferencesController({})
          .build(),
        testSpecificMock: async (mockServer: Mockttp) => {
          await setupRemoteFeatureFlagsMock(
            mockServer,
            remoteFeatureFlagExtensionUxPna25(true),
          );

          await setupMockRequest(mockServer, {
            requestMethod: 'PUT',
            url: /https:\/\/authentication\.api\.cx\.metamask\.io\/api\/v2\/profile\/accounts/i,
            response: {
              message: 'OK',
            },
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
