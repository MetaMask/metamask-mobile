import { test } from '../../framework/fixture/index.js';

import TimerHelper from '../../framework/TimerHelper.js';
import { Performance, PerformancePreps } from '../../tags.performance.js';
import {
  loginToAppPlaywright,
  onboardingFlowImportSRPPlaywright,
  selectAccountByDevice,
} from '../../flows/wallet.flow.js';
import TabBarComponent from '../../page-objects/wallet/TabBarComponent.js';
import WalletActionsBottomSheet from '../../page-objects/wallet/WalletActionsBottomSheet.js';
import PerpsOnboarding from '../../page-objects/Perps/PerpsOnboarding.js';
import PerpsMarketListView from '../../page-objects/Perps/PerpsMarketListView.js';
import PerpsMarketDetailsView from '../../page-objects/Perps/PerpsMarketDetailsView.js';
import PerpsOrderView from '../../page-objects/Perps/PerpsOrderView.js';
import {
  dismissPerpsOnboardingTutorialIfPresent,
  isPositionOpen,
  resolvePerpsGtmOnboardingModalEnabled,
} from '../../flows/perps.flow.js';
import PlaywrightAssertions from '../../framework/PlaywrightAssertions.js';
import { asPlaywrightElement } from '../../framework/EncapsulatedElement.js';
import { fetchProductionFeatureFlags } from '../feature-flag-helper.js';
const testEnvironment = process.env.E2E_PERFORMANCE_BUILD_VARIANT || '';
/* Scenario 5: Perps onboarding + add funds 10 USD ARB.USDC + Open Position + Close Position */
test.describe(`${Performance} ${PerformancePreps}`, () => {
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
        { ios: 7500, android: 2000 },
        currentDeviceDetails.platform,
      );
      const openOrderScreenTimer = new TimerHelper(
        'Open Order Screen',
        { ios: 3000, android: 4000 },
        currentDeviceDetails.platform,
      );
      const openPositionTimer = new TimerHelper(
        'Position opened',
        { ios: 10500, android: 13000 },
        currentDeviceDetails.platform,
      );

      const MarketDetailsScreenTimer = new TimerHelper(
        'Market Details Screen',
        { ios: 10000, android: 2500 },
        currentDeviceDetails.platform,
      );

      //await loginToAppPlaywright();
      await onboardingFlowImportSRPPlaywright(process.env.TEST_SRP_4 ?? '');
      // Perps requires independent account for each device to avoid clashes when running tests in parallel
      await selectAccountByDevice(currentDeviceDetails.deviceName);

      await TabBarComponent.tapActions();
      await WalletActionsBottomSheet.checkModalVisibility();
      await WalletActionsBottomSheet.tapPerpsButton();
      const productionFeatureFlags = await fetchProductionFeatureFlags(
        'main',
        testEnvironment,
      );

      const perpsGtmOnboardingModalEnabled =
        await resolvePerpsGtmOnboardingModalEnabled(productionFeatureFlags);

      if (perpsGtmOnboardingModalEnabled) {
        await selectPerpsMainScreenTimer.measure(async () => {
          await PlaywrightAssertions.expectElementToBeVisible(
            await asPlaywrightElement(PerpsOnboarding.tutorialTitle),
          );
        });
      }

      await dismissPerpsOnboardingTutorialIfPresent();

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
          { timeout: 30000 },
        );
      });

      try {
        await PerpsMarketDetailsView.closePositionWithRetry();
        console.log('✅ Position closed successfully');
      } catch (error) {
        console.error('❌ Error closing position:', error);
      }

      if (perpsGtmOnboardingModalEnabled) {
        performanceTracker.addTimer(selectPerpsMainScreenTimer);
      }
      performanceTracker.addTimers(
        selectMarketTimer,
        openOrderScreenTimer,
        openPositionTimer,
        MarketDetailsScreenTimer,
      );
    },
  );
});
