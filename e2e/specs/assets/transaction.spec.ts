import TestHelpers from '../../helpers';
import { RegressionAssets } from '../../tags';
import AmountView from '../../pages/Send/AmountView';
import SendView from '../../pages/Send/SendView';
import TransactionConfirmationView from '../../pages/Send/TransactionConfirmView';
import { loginToApp } from '../../viewHelper';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import enContent from '../../../locales/languages/en.json';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import NetworkEducationModal from '../../pages/Network/NetworkEducationModal';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import Assertions from '../../framework/Assertions';
import WalletView from '../../pages/wallet/WalletView';
import TokenOverview from '../../pages/wallet/TokenOverview';
import { mockEvents } from '../../api-mocking/mock-config/mock-events';
import ToastModal from '../../pages/wallet/ToastModal';
import { setupMockRequest } from '../../api-mocking/mockHelpers';
import { Mockttp } from 'mockttp';

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
        fixture: new FixtureBuilder().withPopularNetworks().build(),
        restartDevice: true,
        testSpecificMock: async (mockServer: Mockttp) => {
          const { urlEndpoint, response } =
            mockEvents.GET.remoteFeatureFlagsOldConfirmations;
          await setupMockRequest(mockServer, {
            requestMethod: 'GET',
            url: urlEndpoint,
            response,
            responseCode: 200,
          });
        },
      },
      async () => {
        await loginToApp();
        await WalletView.tapTokenNetworkFilter();
        await WalletView.tapTokenNetworkFilterAll();
        // Wait for network filter to apply and layout to stabilize
        await TestHelpers.delay(2000);

        // Scroll to top first to ensure consistent starting position
        await WalletView.scrollToTopOfTokensList();
        await TestHelpers.delay(1000);

        // Then scroll to Ethereum with extra stability
        await WalletView.scrollToToken(ETHEREUM_NAME);
        await TestHelpers.delay(1500); // Extra time for scroll to complete

        await WalletView.tapOnToken(ETHEREUM_NAME);
        await TokenOverview.tapSendButton();
        // if (device.getPlatform() === 'ios') {
        //   await NetworkEducationModal.tapNetworkName(ETHEREUM_NAME);
        // }
        await NetworkEducationModal.tapGotItButton();

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
