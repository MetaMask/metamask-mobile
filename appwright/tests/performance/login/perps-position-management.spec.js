import { test } from '../../../fixtures/performance-test.js';

import TimerHelper from '../../../utils/TimersHelper.js';
import OnboardingSheet from '../../../../wdio/screen-objects/Onboarding/OnboardingSheet.js';
import ImportFromSeedScreen from '../../../../wdio/screen-objects/Onboarding/ImportFromSeedScreen.js';
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
import { login } from '../../../utils/Flows.js';

async function screensSetup(device) {
  const screens = [
    OnboardingSheet,
    ImportFromSeedScreen,
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
test('Perps open position and close it', async ({
  device,
  performanceTracker,
}, testInfo) => {
  test.setTimeout(10 * 60 * 1000); // 10 minutes

  const selectPerpsMainScreenTimer = new TimerHelper(
    'Select Perps Main Screen',
  );
  const skipTutorialTimer = new TimerHelper('Skip Tutorial');
  const selectMarketTimer = new TimerHelper('Select Market ETH');
  const openPositionTimer = new TimerHelper('Open Long Position');
  const setLeverageTimer = new TimerHelper('Set Leverage');
  const closePositionTimer = new TimerHelper('Close Position');
  await screensSetup(device);
  await login(device);

  await TabBarModal.tapActionButton();
  selectPerpsMainScreenTimer.start();
  await WalletActionModal.tapPerpsButton();
  selectPerpsMainScreenTimer.stop();
  performanceTracker.addTimer(selectPerpsMainScreenTimer);

  // Skip tutorial
  skipTutorialTimer.start();
  await PerpsTutorialScreen.tapSkip();
  skipTutorialTimer.stop();
  performanceTracker.addTimer(skipTutorialTimer);

  selectMarketTimer.start();
  // Selecting BTC market
  await PerpsMarketListView.selectMarket('BTC');
  selectMarketTimer.stop();
  performanceTracker.addTimer(selectMarketTimer);

  // TODO: Add a check to see if the position is open
  // If position open, fail the test
  if (await PerpsPositionDetailsView.isPositionOpen()) {
    throw new Error('Position is already open');
  }

  // Open Position
  openPositionTimer.start();
  await PerpsMarketDetailsView.tapLongButton();
  // Set leverage to 40x
  setLeverageTimer.start();
  await PerpsOrderView.setLeverage(40);
  setLeverageTimer.stop();
  performanceTracker.addTimer(setLeverageTimer);

  await PerpsOrderView.tapPlaceOrder();
  openPositionTimer.stop();
  performanceTracker.addTimer(openPositionTimer);

  // Close Position
  closePositionTimer.start();
  await PerpsPositionDetailsView.closePositionWithRetry();
  closePositionTimer.stop();
  performanceTracker.addTimer(closePositionTimer);

  await performanceTracker.attachToTest(testInfo);
});
