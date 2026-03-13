import { loginToApp } from '../../flows/wallet.flow';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import { RegressionTrade } from '../../tags';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import WalletView from '../../page-objects/wallet/WalletView';
import PerpsMarketListView from '../../page-objects/Perps/PerpsMarketListView';
import { PERPS_ARBITRUM_MOCKS } from '../../api-mocking/mock-responses/perps-arbitrum-mocks';
import PerpsMarketDetailsView from '../../page-objects/Perps/PerpsMarketDetailsView';
import PerpsOrderView from '../../page-objects/Perps/PerpsOrderView';
import PerpsView from '../../page-objects/Perps/PerpsView';
import { createLogger, LogLevel } from '../../framework/logger';
import { Mockttp } from 'mockttp';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper';
import { remoteFeatureFlagHomepageSectionsV1Enabled } from '../../api-mocking/mock-responses/feature-flags-mocks';

// E2E environment setup - mocks auto-configure via isE2E flag

const logger = createLogger({
  name: 'PerpsPositionSpec',
  level: LogLevel.INFO,
});

describe(RegressionTrade('Perps Position'), () => {
  it('opens a long position with custom profit and closes it', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
        testSpecificMock: async (mockServer: Mockttp) => {
          await setupRemoteFeatureFlagsMock(mockServer, {
            ...remoteFeatureFlagHomepageSectionsV1Enabled(),
          });
          await PERPS_ARBITRUM_MOCKS(mockServer);
        },
      },
      async () => {
        logger.info('💰 Using E2E mock balance - no wallet import needed');
        logger.info('🎯 Mock account: $10,000 total, $8,000 available');
        await loginToApp();

        // Navigate to Perps via homepage section (same click path as smoke perps tests)
        await WalletView.scrollAndTapPerpsSection();

        await PerpsMarketListView.selectMarket('ETH');
        await PerpsMarketDetailsView.tapLongButton();
        await PerpsOrderView.tapTakeProfitButton();
        await PerpsView.tapTakeProfitPercentageButton(1);
        await PerpsView.tapStopLossPercentageButton(1);
        await PerpsView.tapSetTpslButton();
        await PerpsView.tapPlaceOrderButton();

        logger.info('📈 E2E Mock: Order placed successfully');
        logger.info('💎 E2E Mock: Position created with mock data');

        // Wait for screen ready and assert Close Position availability
        await PerpsMarketDetailsView.waitForScreenReady();
        await PerpsMarketDetailsView.expectClosePositionButtonVisible();

        await PerpsView.tapClosePositionButton();

        logger.info('📉 E2E Mock: Preparing to close position');

        await PerpsView.tapClosePositionBottomSheetButton();

        logger.info('🎉 E2E Mock: Position closed successfully');
        logger.info('💰 E2E Mock: Balance updated with P&L');
      },
    );
  });
});
