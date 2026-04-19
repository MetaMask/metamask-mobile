import { test } from '../../framework/fixture';

import TimerHelper from '../../framework/TimerHelper';
import { PerformancePreps } from '../../tags.performance.js';
import {
  loginToAppPlaywright,
  selectAccountByDevice,
} from '../../flows/wallet.flow';
import TabBarComponent from '../../page-objects/wallet/TabBarComponent';
import WalletActionsBottomSheet from '../../page-objects/wallet/WalletActionsBottomSheet';
import PerpsOnboarding from '../../page-objects/Perps/PerpsOnboarding';
import PerpsMarketListView from '../../page-objects/Perps/PerpsMarketListView';
import PerpsMarketDetailsView from '../../page-objects/Perps/PerpsMarketDetailsView';
import PerpsOrderView from '../../page-objects/Perps/PerpsOrderView';
import { isPositionOpen } from '../../flows/perps.flow';
import PlaywrightAssertions from '../../framework/PlaywrightAssertions';
import { asPlaywrightElement } from '../../framework/EncapsulatedElement';

/* Scenario 5: Perps onboarding + add funds 10 USD ARB.USDC + Open Position + Close Position */
test.describe(PerformancePreps, () => {
  test(
    'Perps open position and close it',
    { tag: '@mm-perps-engineering-team' },
    async ({ currentDeviceDetails, driver, performanceTracker }, testInfo) => {
      const timeoutMinutes = currentDeviceDetails.platform === 'ios' ? 15 : 10;
      test.setTimeout(timeoutMinutes * 60 * 1000);

      const selectPerpsMainScreenTimer = new TimerHelper(
        'Perps tutorial screen visible',
        { ios: 2000, android: 2000 },
        currentDeviceDetails.platform,
      );

      const selectMarketTimer = new TimerHelper(
        'Market list screen visible',
        { ios: 7500, android: 7500 },
        currentDeviceDetails.platform,
      );
      const openOrderScreenTimer = new TimerHelper(
        'Open Order Screen',
        { ios: 3000, android: 3000 },
        currentDeviceDetails.platform,
      );
      const openPositionTimer = new TimerHelper(
        'Position opened',
        { ios: 10500, android: 20000 },
        currentDeviceDetails.platform,
      );

      const MarketDetailsScreenTimer = new TimerHelper(
        'Market Details Screen',
        { ios: 10000, android: 10000 },
        currentDeviceDetails.platform,
      );

      await loginToAppPlaywright();

      // Perps requires independent account for each device to avoid clashes when running tests in parallel
      await selectAccountByDevice(currentDeviceDetails.deviceName);

      await TabBarComponent.tapActions();
      await WalletActionsBottomSheet.tapPerpsButton();
      await selectPerpsMainScreenTimer.measure(async () => {
        await PlaywrightAssertions.expectElementToBeVisible(
          await asPlaywrightElement(PerpsOnboarding.tutorialTitle),
        );
      });

      await PerpsOnboarding.tapSkipButton();
      await selectMarketTimer.measure(async () => {
        await PlaywrightAssertions.expectElementToBeVisible(
          await asPlaywrightElement(PerpsMarketListView.header),
        );
      });

      await PerpsMarketListView.tapMarketRowItemBTC();

      await MarketDetailsScreenTimer.measure(async () => {
        await PlaywrightAssertions.expectElementToBeVisible(
          await asPlaywrightElement(PerpsMarketDetailsView.header),
        );
      });
      // Check if there's an existing position and close it before continuing
      if (await isPositionOpen()) {
        console.log(
          '⚠️ Position already open, closing it before continuing with the test...',
        );
        try {
          await PerpsMarketDetailsView.closePositionWithRetry();
          console.log('✅ Existing position closed successfully');
        } catch (error) {
          console.error('❌ Error closing existing position:', error);
        }
      }
      await PerpsMarketDetailsView.tapLongButton();
      // Open Position
      await openOrderScreenTimer.measure(async () => {
        await PlaywrightAssertions.expectElementToBeVisible(
          await asPlaywrightElement(PerpsOrderView.placeOrderButton),
        );
      });

      await PerpsOrderView.setLeverageAppium(40);
      await PerpsOrderView.setAmountUSD('10');
      await PerpsOrderView.tapPlaceOrder();

      await openPositionTimer.measure(async () => {
        await PlaywrightAssertions.expectElementToBeVisible(
          await asPlaywrightElement(PerpsMarketDetailsView.closeButton),
        );
      });

      try {
        await PerpsMarketDetailsView.closePositionWithRetry();
        console.log('✅ Position closed successfully');
      } catch (error) {
        console.error('❌ Error closing position:', error);
      }

      performanceTracker.addTimers(
        selectPerpsMainScreenTimer,
        selectMarketTimer,
        openOrderScreenTimer,
        openPositionTimer,
        MarketDetailsScreenTimer,
      );
    },
  );
});
