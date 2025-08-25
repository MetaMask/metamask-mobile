import { loginToApp } from '../../viewHelper';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import { SmokePerps } from '../../tags';
import Assertions from '../../framework/Assertions';
import WalletView from '../../pages/wallet/WalletView';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { PerpsHelpers } from './helpers/perps-helpers';
import WalletActionsBottomSheet from '../../pages/wallet/WalletActionsBottomSheet';
import PerpsMarketListView from '../../pages/Perps/PerpsMarketListView';
import { PERPS_ARBITRUM_MOCKS } from '../../api-mocking/mock-responses/perps-arbitrum-mocks';
import PerpsMarketDetailsView from '../../pages/Perps/PerpsMarketDetailsView';
import PerpsOrderView from '../../pages/Perps/PerpsOrderView';
import PerpsView from '../../pages/Perps/PerpsView';
import TestHelpers from '../../helpers';

describe(SmokePerps('Perps Position'), () => {
  // Set specific flag to disable Perps streaming and use mocks for this test only
  beforeAll(() => {
    process.env.DISABLE_PERPS_STREAMING = 'true';
  });

  afterAll(() => {
    // Clean up environment variables
    delete process.env.DISABLE_PERPS_STREAMING;
  });

  it('should navigate to Market list and select first market', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder()
          .withPopularNetworks()
          .withNetworkController({
            providerConfig: {
              type: 'rpc',
              chainId: '0xa4b1',
              rpcUrl: 'https://arb1.arbitrum.io/rpc',
              nickname: 'Arbitrum One',
              ticker: 'ETH',
            },
          })
          .ensureSolanaModalSuppressed()
          .build(),
        restartDevice: true,
        testSpecificMock: PERPS_ARBITRUM_MOCKS,
      },
      async () => {
        await device.launchApp();
        console.log('🚀 Starting Perps Position test...');

        await loginToApp();
        await Assertions.expectElementToBeVisible(WalletView.container);

        await PerpsHelpers.importHyperLiquidWallet();

        // Navigate back to wallet and then to Perps tab
        await TabBarComponent.tapWallet();

        // Navigate to Perps tab with comprehensive sync management (prevents timer blocking)
        await PerpsHelpers.navigateToPerpsTab();

        // Assert that Perps tab is loaded and displaying balance
        await Assertions.expectTextDisplayed('Perp account balance');

        // Navigate to Perps via actions menu
        await TabBarComponent.tapActions();
        await WalletActionsBottomSheet.tapPerpsButton();

        // Wait for Perps system to initialize and stabilize (prevents timer blocking)
        // await PerpsHelpers.waitForBalanceUpdate(3000);

        await Assertions.expectElementToBeVisible(
          PerpsMarketListView.listHeader,
        );

        // Press the first market row item (regardless of what coin it is)
        await PerpsHelpers.withSyncDisabled(async () => {
          await PerpsMarketListView.tapFirstMarketRowItem();
          await PerpsMarketDetailsView.tapLongButton();
          await PerpsOrderView.tapTakeProfitButton();
          await PerpsView.tapTakeProfitPercentageButton(1);
          await PerpsView.tapStopLossPercentageButton(1);
          await PerpsView.tapSetTpslButton();
          await PerpsView.tapPlaceOrderButton();
          // Wait for order success toast to dismiss
          // await PerpsView.tapOrderSuccessToastDismissButton();
          await TestHelpers.delay(2500);
          // now I need to scroll to the bottom of the page
          await PerpsHelpers.scrollToBottom();

          await TestHelpers.delay(1000);

          // then I need to tap the close position button
          await PerpsView.tapClosePositionButton();

          await TestHelpers.delay(1000);

          // Now I need to press Close Position button
          await PerpsView.tapClosePositionBottomSheetButton();
        });
      },
    );
  });
});
