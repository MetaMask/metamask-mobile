import { loginToApp } from '../../viewHelper';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import { RegressionTrade } from '../../tags';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { PerpsHelpers } from './helpers/perps-helpers';
import WalletActionsBottomSheet from '../../pages/wallet/WalletActionsBottomSheet';
import PerpsMarketListView from '../../pages/Perps/PerpsMarketListView';
import { PERPS_ARBITRUM_MOCKS } from '../../api-mocking/mock-responses/perps-arbitrum-mocks';
import PerpsMarketDetailsView from '../../pages/Perps/PerpsMarketDetailsView';
// Removed unused import to satisfy no-unused-vars
// import PerpsOrderView from '../../pages/Perps/PerpsOrderView';
import PerpsView from '../../pages/Perps/PerpsView';
import { createLogger, LogLevel } from '../../framework/logger';
import PerpsE2E from '../../framework/PerpsE2E';
import TestHelpers from '../../helpers';
import Assertions from '../../framework/Assertions';
import Matchers from '../../framework/Matchers';
import { PerpsPositionsViewSelectorsIDs } from '../../selectors/Perps/Perps.selectors';

const logger = createLogger({
  name: 'PerpsPositionSpec',
  level: LogLevel.INFO,
});

describe(RegressionTrade('Perps Position'), () => {
  it('should open a long position with custom profit and close it', async () => {
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

        await WalletActionsBottomSheet.tapPerpsButton();

        await device.disableSynchronization();
        await PerpsMarketListView.tapFirstMarketRowItem();
        await PerpsMarketDetailsView.tapLongButton();

        await PerpsView.tapPlaceOrderButton();

        logger.info('📈 E2E Mock: Order placed successfully');
        logger.info('💎 E2E Mock: Position created with mock data');

        await PerpsView.tapBackButtonPositionSheet();
        await PerpsView.tapBackButtonMarketList();

        // add price change and liquidation -> not yet liquidated
        await PerpsE2E.updateMarketPrice('BTC', '80000.00');
        await PerpsE2E.triggerLiquidation('BTC');
        logger.info('🔥 E2E Mock: Liquidation triggered. Not yet liquidated');

        // Assertion 1: todavía hay 2 posiciones (la por defecto y la recién abierta)
        await PerpsView.ensurePerpsTabPositionVisible('BTC', 5, 'long', 0);
        await PerpsView.ensurePerpsTabPositionVisible('BTC', 3, 'long', 1);

        // Small stabilization wait before pushing price
        await TestHelpers.delay(2000);

        // add price change and force liquidation - BTC below 30k triggers default BTC liquidation
        await PerpsE2E.updateMarketPrice('BTC', '30000.00');
        await PerpsE2E.triggerLiquidation('BTC');
        logger.info('🔥 E2E Mock: Liquidation triggered. Liquidated');

        // Assertion 2: only BTC 3x is visible
        // 1) La esperada (primer item) existe y es visible
        await Assertions.expectElementToBeVisible(
          PerpsView.getPositionItem('BTC', 3, 'long', 0),
          { description: 'BTC 3x long en índice 0' },
        );

        // 2) No existe un segundo item de posición (verificación por índice con ID base)
        const secondItem = (await Matchers.getElementByID(
          PerpsPositionsViewSelectorsIDs.POSITION_ITEM,
          1,
        )) as unknown as DetoxElement;
        await Assertions.expectElementToNotBeVisible(secondItem, {
          description: 'No second position card should be visible',
        });
      },
    );
  });
});
