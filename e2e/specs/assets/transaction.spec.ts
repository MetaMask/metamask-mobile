import TestHelpers from '../../helpers';
import { SmokeAssets } from '../../tags';
import RedesignedSendView from '../../pages/Send/RedesignedSendView';
import TransactionConfirmationView from '../../pages/Send/TransactionConfirmView';
import { loginToApp } from '../../viewHelper';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import enContent from '../../../locales/languages/en.json';
import FixtureBuilder from '../../../tests/framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../../tests/framework/fixtures/FixtureHelper';
import Assertions from '../../../tests/framework/Assertions';
import WalletView from '../../pages/wallet/WalletView';
import TokenOverview from '../../pages/wallet/TokenOverview';
import ToastModal from '../../pages/wallet/ToastModal';
import { Mockttp } from 'mockttp';
import { setupRemoteFeatureFlagsMock } from '../../../tests/api-mocking/helpers/remoteFeatureFlagsHelper';
import { oldConfirmationsRemoteFeatureFlags } from '../../../tests/api-mocking/mock-responses/feature-flags-mocks';
import { LocalNode } from '../../../tests/framework/types';
import { AnvilPort } from '../../../tests/framework/fixtures/FixtureUtils';
import { AnvilManager } from '../../../tests/seeder/anvil-manager';

describe(SmokeAssets('Transaction'), () => {
  beforeAll(async () => {
    jest.setTimeout(2500000);
    await TestHelpers.reverseServerPort();
  });

  it('send ETH from token detail page and validate the activity', async () => {
    const ETHEREUM_NAME = 'Ethereum';
    const RECIPIENT = '0x1FDb169Ef12954F20A15852980e1F0C122BfC1D6';
    const AMOUNT = '0.12345';
    const TOKEN_NAME = enContent.unit.eth;
    await withFixtures(
      {
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
            .withNetworkEnabledMap({
              eip155: { '0x539': true },
            })
            .build();
        },
        restartDevice: true,
        testSpecificMock: async (mockServer: Mockttp) => {
          await setupRemoteFeatureFlagsMock(
            mockServer,
            Object.assign({}, ...oldConfirmationsRemoteFeatureFlags),
          );
        },
      },
      async () => {
        await loginToApp();
        // Scroll to top first to ensure consistent starting position
        await WalletView.scrollToTopOfTokensList();

        // Then scroll to Ethereum with extra stability
        await WalletView.scrollToToken(ETHEREUM_NAME);
        await WalletView.tapOnToken(ETHEREUM_NAME);
        await TokenOverview.tapSendButton();

        await RedesignedSendView.inputRecipientAddress(RECIPIENT);
        await RedesignedSendView.typeInTransactionAmount(AMOUNT);
        await RedesignedSendView.pressReviewButton();

        await TransactionConfirmationView.tapConfirmButton();
        await Assertions.expectElementToBeVisible(ToastModal.notificationTitle);
        await Assertions.expectElementToNotBeVisible(
          ToastModal.notificationTitle,
        );
        await TabBarComponent.tapActivity();
        await Assertions.expectTextDisplayed(`${AMOUNT} ${TOKEN_NAME}`);
      },
    );
  });
});
