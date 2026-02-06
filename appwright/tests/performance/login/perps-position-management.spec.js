import { test } from '../../../fixtures/performance-test.js';

import TimerHelper from '../../../utils/TimersHelper.js';
import OnboardingSheet from '../../../../wdio/screen-objects/Onboarding/OnboardingSheet.js';
import CreatePasswordScreen from '../../../../wdio/screen-objects/Onboarding/CreatePasswordScreen.js';
import WalletMainScreen from '../../../../wdio/screen-objects/WalletMainScreen.js';
import TabBarModal from '../../../../wdio/screen-objects/Modals/TabBarModal.js';
import WalletActionModal from '../../../../wdio/screen-objects/Modals/WalletActionModal.js';
import PerpsTutorialScreen from '../../../../wdio/screen-objects/PerpsTutorialScreen.js';
import PerpsMarketListView from '../../../../wdio/screen-objects/PerpsMarketListView.js';
import PerpsTabView from '../../../../wdio/screen-objects/PerpsTabView.js';
import PerpsDepositScreen from '../../../../wdio/screen-objects/PerpsDepositScreen.js';
import PerpsMarketDetailsView from '../../../../wdio/screen-objects/PerpsMarketDetailsView.js';
import PerpsOrderView from '../../../../wdio/screen-objects/PerpsOrderView.js';
import PerpsClosePositionView from '../../../../wdio/screen-objects/PerpsClosePositionView.js';
import PerpsPositionDetailsView from '../../../../wdio/screen-objects/PerpsPositionDetailsView.js';
import PerpsPositionsView from '../../../../wdio/screen-objects/PerpsPositionsView.js';
import { login, selectAccountDevice } from '../../../utils/Flows.js';
import { PerformancePreps } from '../../../tags.js';

async function screensSetup(device) {
  const screens = [
    OnboardingSheet,
    CreatePasswordScreen,
    WalletMainScreen,
    TabBarModal,
    WalletActionModal,
    PerpsTutorialScreen,
    PerpsMarketListView,
    PerpsTabView,
    PerpsDepositScreen,
    PerpsMarketDetailsView,
    PerpsOrderView,
    PerpsClosePositionView,
    PerpsPositionDetailsView,
    PerpsPositionsView,
  ];
  screens.forEach((screen) => {
    screen.device = device;
  });
}

/* Scenario 5: Perps onboarding + add funds 10 USD ARB.USDC + Open Position + Close Position */
test.describe(PerformancePreps, () => {
  test(
    'Perps open position and close it',
    { tag: '@mm-perps-engineering-team' },
    async ({ device, performanceTracker }, testInfo) => {
      test.setTimeout(10 * 60 * 1000); // 10 minutes

      const selectPerpsMainScreenTimer = new TimerHelper(
        'Perps tutorial screen visible',
        { ios: 2000, android: 2000 },
        device,
      );

      const selectMarketTimer = new TimerHelper(
        'Market list screen visible',
        { ios: 7500, android: 7500 },
        device,
      );
      const openOrderScreenTimer = new TimerHelper(
        'Open Order Screen',
        { ios: 1500, android: 1500 },
        device,
      );
      const openPositionTimer = new TimerHelper(
        'Position opened',
        { ios: 10500, android: 20000 },
        device,
      );

      const MarketDetailsScreenTimer = new TimerHelper(
        'Market Details Screen',
        { ios: 10000, android: 10000 },
        device,
      );

      await screensSetup(device);
      await login(device);

      // Perps requires independent account for each device to avoid clashes when running tests in parallel
      await selectAccountDevice(device, testInfo);

      await TabBarModal.tapActionButton();
      await WalletActionModal.tapPerpsButton();
      await selectPerpsMainScreenTimer.measure(async () => {
        await PerpsTutorialScreen.isContainerDisplayed();
      });

      await PerpsTutorialScreen.tapSkip();
      await selectMarketTimer.measure(async () => {
        await PerpsMarketListView.isHeaderVisible();
      });

      await PerpsMarketListView.selectMarket('BTC');

      await MarketDetailsScreenTimer.measure(
        async () => await PerpsPositionDetailsView.isContainerDisplayed(),
      );
      // Check if there's an existing position and close it before continuing
      if (await PerpsPositionDetailsView.isPositionOpen()) {
        console.log(
          '⚠️ Position already open, closing it before continuing with the test...',
        );
        await PerpsPositionDetailsView.closePositionWithRetry();
        console.log('✅ Existing position closed successfully');
      }

      await PerpsMarketDetailsView.tapLongButton();
      // Open Position
      await openOrderScreenTimer.measure(async () =>
        PerpsOrderView.checkOrderScreenVisible(),
      );

      await PerpsOrderView.setLeverage(40);
      await PerpsOrderView.tapPlaceOrder();

      await openPositionTimer.measure(
        async () => await PerpsPositionDetailsView.isPositionOpen(),
      );

      await PerpsPositionDetailsView.closePositionWithRetry();

      performanceTracker.addTimers(
        selectPerpsMainScreenTimer,
        selectMarketTimer,
        openOrderScreenTimer,
        openPositionTimer,
        MarketDetailsScreenTimer,
      );
      await performanceTracker.attachToTest(testInfo);
    },
  );
});
