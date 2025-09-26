import TestHelpers from '../../helpers';
import { RegressionAssets } from '../../tags';
import AmountView from '../../pages/Send/AmountView';
import SendView from '../../pages/Send/SendView';
import TransactionConfirmationView from '../../pages/Send/TransactionConfirmView';
import { loginToApp } from '../../viewHelper';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import enContent from '../../../locales/languages/en.json';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import Assertions from '../../framework/Assertions';
import WalletView from '../../pages/wallet/WalletView';
import TokenOverview from '../../pages/wallet/TokenOverview';
import ToastModal from '../../pages/wallet/ToastModal';
import { Mockttp } from 'mockttp';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper';
import { oldConfirmationsRemoteFeatureFlags } from '../../api-mocking/mock-responses/feature-flags-mocks';

describe(RegressionAssets('Transaction'), () => {
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
        fixture: new FixtureBuilder()
          .withGanacheNetwork()
          .withNetworkEnabledMap({
            eip155: { '0x539': true },
          })
          .build(),
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

        await SendView.inputAddress(RECIPIENT);
        await SendView.tapNextButton();

        await AmountView.typeInTransactionAmount(AMOUNT);
        await AmountView.tapNextButton();

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
