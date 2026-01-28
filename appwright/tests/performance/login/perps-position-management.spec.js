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
        'Select Perps Main Screen',
        { ios: 2000, android: 2000 },
        device,
      );
      const skipTutorialTimer = new TimerHelper(
        'Skip Tutorial',
        { ios: 1600, android: 2500 },
        device,
      );
      const selectMarketTimer = new TimerHelper(
        'Select Market BTC',
        { ios: 7500, android: 7500 },
        device,
      );
      const openOrderScreenTimer = new TimerHelper(
        'Open Order Screen',
        { ios: 1500, android: 1500 },
        device,
      );
      const openPositionTimer = new TimerHelper(
        'Open Long Position',
        { ios: 10500, android: 20000 },
        device,
      );
      const setLeverageTimer = new TimerHelper(
        'Set Leverage',
        { ios: 13500, android: 13500 },
        device,
      );
      const closePositionTimer = new TimerHelper(
        'Close Position',
        { ios: 8500, android: 9500 },
        device,
      );
      await screensSetup(device);
      await login(device);

      // Perps requires independent account for each device to avoid clashes when running tests in parallel
      await selectAccountDevice(device, testInfo);

      await TabBarModal.tapActionButton();

      await selectPerpsMainScreenTimer.measure(() =>
        WalletActionModal.tapPerpsButton(),
      );

      // Skip tutorial
      await skipTutorialTimer.measure(() => PerpsTutorialScreen.tapSkip());

      // Selecting BTC market
      await selectMarketTimer.measure(() =>
        PerpsMarketListView.selectMarket('BTC'),
      );

      // TODO: Add a check to see if the position is open
      // If position open, fail the test
      if (await PerpsPositionDetailsView.isPositionOpen()) {
        throw new Error('Position is already open');
      }

      // Open Position
      await openOrderScreenTimer.measure(() =>
        PerpsMarketDetailsView.tapLongButton(),
      );

      // Set leverage to 40x
      await setLeverageTimer.measure(() => PerpsOrderView.setLeverage(40));

      await openPositionTimer.measure(() => PerpsOrderView.tapPlaceOrder());

      // Close Position
      await closePositionTimer.measure(() =>
        PerpsPositionDetailsView.closePositionWithRetry(),
      );

      performanceTracker.addTimers(
        selectPerpsMainScreenTimer,
        skipTutorialTimer,
        selectMarketTimer,
        openOrderScreenTimer,
        setLeverageTimer,
        openPositionTimer,
        closePositionTimer,
      );
      await performanceTracker.attachToTest(testInfo);
    },
  );
});
