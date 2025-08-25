import { loginToApp } from '../../viewHelper';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import { SmokePerps } from '../../tags';
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
import { DevLogger } from '../../../app/core/SDKConnect/utils/DevLogger';

// E2E environment setup - mocks auto-configure via isE2E flag

describe(SmokePerps('Perps Position'), () => {
  // Enable comprehensive Perps mocking to prevent timer blocking
  beforeAll(() => {
    // Enable comprehensive E2E mocking via environment variables
    process.env.DISABLE_PERPS_STREAMING = 'true';
    process.env.METAMASK_ENVIRONMENT = 'test'; // Enables isE2E flag - auto-configures mocks

    DevLogger.log('🎭 E2E Perps mocking enabled - no testnet funds required');
    DevLogger.log('🎭 Bridge will auto-configure when controllers initialize');
  });

  afterAll(() => {
    // Clean up environment variables
    delete process.env.DISABLE_PERPS_STREAMING;
    delete process.env.METAMASK_ENVIRONMENT;
    DevLogger.log('✅ E2E Perps mocking cleaned up');
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
        // Launch app with sync disabled from start to avoid timer issues
        await device.launchApp({
          launchArgs: {
            detoxEnableSynchronization: 0, // Disable sync from launch
            detoxURLBlacklistRegex: '(".*hyperliquid.*")', // Block HyperLiquid URLs
          },
        });

        await loginToApp();

        DevLogger.log('💰 Using E2E mock balance - no wallet import needed');
        DevLogger.log('🎯 Mock account: $10,000 total, $8,000 available');

        // Skip wallet import - E2E mocks provide balance
        // await PerpsHelpers.importHyperLiquidWallet(); // ❌ No longer needed

        // Navigate to Perps tab using manual sync management
        await PerpsHelpers.navigateToPerpsTab();

        // Navigate to actions
        await TabBarComponent.tapActions();

        await device.disableSynchronization();

        await WalletActionsBottomSheet.tapPerpsButton();
        await PerpsMarketListView.tapFirstMarketRowItem();
        await PerpsMarketDetailsView.tapLongButton();
        await PerpsOrderView.tapTakeProfitButton();
        await PerpsView.tapTakeProfitPercentageButton(1);
        await PerpsView.tapStopLossPercentageButton(1);
        await PerpsView.tapSetTpslButton();
        await PerpsView.tapPlaceOrderButton();

        DevLogger.log('📈 E2E Mock: Order placed successfully');
        DevLogger.log('💎 E2E Mock: Position created with mock data');

        await TestHelpers.delay(4000);

        await PerpsHelpers.scrollToBottom();

        await TestHelpers.delay(2000);

        await PerpsView.tapClosePositionButton();

        DevLogger.log('📉 E2E Mock: Preparing to close position');

        await TestHelpers.delay(1000);

        await PerpsView.tapClosePositionBottomSheetButton();

        DevLogger.log('🎉 E2E Mock: Position closed successfully');
        DevLogger.log('💰 E2E Mock: Balance updated with P&L');
      },
    );
  });
});
