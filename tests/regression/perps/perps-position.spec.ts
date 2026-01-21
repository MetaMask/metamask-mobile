import { loginToApp } from '../../page-objects/viewHelper.ts';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import { RegressionTrade } from '../../tags';
import TabBarComponent from '../../page-objects/wallet/TabBarComponent';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { PerpsHelpers } from '../../helpers/perps/perps-helpers';
import WalletActionsBottomSheet from '../../page-objects/wallet/WalletActionsBottomSheet';
import PerpsMarketListView from '../../page-objects/Perps/PerpsMarketListView';
import { PERPS_ARBITRUM_MOCKS } from '../../api-mocking/mock-responses/perps-arbitrum-mocks';
import PerpsMarketDetailsView from '../../page-objects/Perps/PerpsMarketDetailsView';
import PerpsOrderView from '../../page-objects/Perps/PerpsOrderView';
import PerpsView from '../../page-objects/Perps/PerpsView';
import { createLogger, LogLevel } from '../../framework/logger';

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
        testSpecificMock: PERPS_ARBITRUM_MOCKS,
      },
      async () => {
        logger.info('💰 Using E2E mock balance - no wallet import needed');
        logger.info('🎯 Mock account: $10,000 total, $8,000 available');
        await loginToApp();

        // Navigate to Perps tab using manual sync management
        await PerpsHelpers.navigateToPerpsTab();

        // Navigate to actions
        await TabBarComponent.tapActions();

        // This is needed due to disable animations on the next modal
        await device.disableSynchronization();
        await WalletActionsBottomSheet.tapPerpsButton();

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
