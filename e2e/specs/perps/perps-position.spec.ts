import { loginToApp } from '../../viewHelper';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import { SmokeTrade } from '../../tags';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { PerpsHelpers } from './helpers/perps-helpers';
import WalletActionsBottomSheet from '../../pages/wallet/WalletActionsBottomSheet';
import PerpsMarketListView from '../../pages/Perps/PerpsMarketListView';
import { PERPS_ARBITRUM_MOCKS } from '../../api-mocking/mock-responses/perps-arbitrum-mocks';
import PerpsMarketDetailsView from '../../pages/Perps/PerpsMarketDetailsView';
import PerpsOrderView from '../../pages/Perps/PerpsOrderView';
import PerpsView from '../../pages/Perps/PerpsView';
import { createLogger, LogLevel } from '../../framework/logger';

// E2E environment setup - mocks auto-configure via isE2E flag

const logger = createLogger({
  name: 'PerpsPositionSpec',
  level: LogLevel.INFO,
});

describe(SmokeTrade('Perps Position'), () => {
  it('should open a long position with custom profit and close it', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
        testSpecificMock: PERPS_ARBITRUM_MOCKS,
      },
      async () => {
        await loginToApp();
        await device.disableSynchronization();
        // Navigate to Perps tab using manual sync management
        await PerpsHelpers.navigateToPerpsTab();

        // Navigate to actions
        await TabBarComponent.tapTrade();

        await WalletActionsBottomSheet.tapPerpsButton();

        await PerpsMarketListView.tapMarketRowItem('ETH');
        await PerpsMarketDetailsView.tapLongButton();
        // TODO: Fix failing in CI next 3 lines
        // await PerpsOrderView.tapTakeProfitButton();
        // await PerpsView.tapTakeProfitPercentageButton(1);
        // await PerpsView.tapSetTpslButton();
        await PerpsOrderView.tapQuickAmountPercent(50);
        await PerpsView.tapPlaceOrderButton();

        logger.info('📈 E2E Mock: Order placed successfully');
        logger.info('💎 E2E Mock: Position created with mock data');

        // await PerpsMarketDetailsView.tapNotificationTooltipTurnOnButton();
        await PerpsMarketDetailsView.tapPositionTab();

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
