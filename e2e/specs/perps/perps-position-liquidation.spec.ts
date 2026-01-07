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
import PerpsHomeView from '../../pages/Perps/PerpsHomeView';
import PerpsView from '../../pages/Perps/PerpsView';
import { createLogger, LogLevel } from '../../framework/logger';
import PerpsE2EModifiers from './helpers/perps-modifiers';
import Assertions from '../../framework/Assertions';
import Matchers from '../../framework/Matchers';
import { PerpsPositionsViewSelectorsIDs } from '../../selectors/Perps/Perps.selectors';
import { TestSuiteParams } from '../../framework/types';

const logger = createLogger({
  name: 'PerpsPositionSpec',
  level: LogLevel.INFO,
});

describe(RegressionTrade('Perps Position'), () => {
  it('opens a long position with custom profit and closes it', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder()
          .withPerpsProfile('position-testing')
          .build(),
        restartDevice: true,
        testSpecificMock: PERPS_ARBITRUM_MOCKS,
        useCommandQueueServer: true,
      },
      async ({ commandQueueServer }: TestSuiteParams) => {
        if (!commandQueueServer) {
          throw new Error('Command queue server not found');
        }
        logger.info('💰 Using E2E mock balance - no wallet import needed');
        logger.info('🎯 Mock account: $10,000 total, $8,000 available');
        await loginToApp();

        await device.disableSynchronization();

        // Navigate to Perps tab using manual sync management
        await PerpsHelpers.navigateToPerpsTab();

        // Navigate to actions
        await TabBarComponent.tapActions();

        await WalletActionsBottomSheet.tapPerpsButton();

        await PerpsMarketListView.selectMarket('ETH');

        await PerpsMarketDetailsView.tapLongButton();

        await PerpsView.tapPlaceOrderButton();

        logger.info('📈 E2E Mock: Order placed successfully');
        logger.info('💎 E2E Mock: Position created with mock data');

        await PerpsView.tapBackButtonPositionSheet();
        await PerpsHomeView.tapBackHomeButton();

        // add price change and liquidation -> not yet liquidated
        await PerpsE2EModifiers.updateMarketPriceServer(
          commandQueueServer,
          'BTC',
          '80000.00',
        );
        await PerpsE2EModifiers.triggerLiquidationServer(
          commandQueueServer,
          'BTC',
        );
        logger.info('🔥 E2E Mock: Liquidation triggered. Not yet liquidated');

        // Assertion 1: still have 2 positions (the default and the recently opened)
        await PerpsView.ensurePerpsTabPositionVisible('BTC', 5, 'long', 0);
        await PerpsView.ensurePerpsTabPositionVisible('ETH', 3, 'long', 1);

        // add price change and force liquidation - BTC below 30k triggers default BTC liquidation
        await PerpsE2EModifiers.updateMarketPriceServer(
          commandQueueServer,
          'BTC',
          '30000.00',
        );
        await PerpsE2EModifiers.triggerLiquidationServer(
          commandQueueServer,
          'BTC',
        );
        logger.info('🔥 E2E Mock: Liquidation triggered. Liquidated');

        // Assertion 2: only BTC 3x is visible
        // 1) The expected (first item) exists and is visible
        await Assertions.expectElementToBeVisible(
          PerpsView.getPositionItem('ETH', 3, 'long', 0),
          { description: 'ETH 3x long en índice 0' },
        );

        // 2) There is no second item of position (verification by index with base ID)
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
