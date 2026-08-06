import { test as perfTest } from '../../../framework/fixtures/playwright/index.js';
import TimerHelper from '../../../framework/TimerHelper.js';
import {
  asPlaywrightElement,
  PlaywrightAssertions,
} from '../../../framework/index.js';
import { onboardingFlowImportSRPPlaywright } from '../../../flows/wallet.flow.js';
import MoneyHomeView from '../../../page-objects/Money/MoneyHomeView.js';
import TabBarComponent from '../../../page-objects/wallet/TabBarComponent.js';
import { Performance, PerformanceMoney } from '../../../tags.performance.js';

perfTest.describe(`${Performance} ${PerformanceMoney}`, () => {
  perfTest(
    'Money Home after importing SRP with funded balance',
    { tag: '@mm-earn-team' },
    async ({ currentDeviceDetails, driver: _driver, performanceTracker }) => {
      // We use TEST_SRP_2 for the funded Money account.
      await onboardingFlowImportSRPPlaywright(process.env.TEST_SRP_2 ?? '');

      await PlaywrightAssertions.expectElementToBeVisible(
        asPlaywrightElement(TabBarComponent.tabBarMoneyButton),
        {
          description:
            'Money tab should be available for the funded-account scenario',
        },
      );

      const timer = new TimerHelper(
        'Time since the user taps Money tab until content is visible',
        { ios: 2000, android: 2000 },
        currentDeviceDetails.platform,
      );

      // Best practice: action before measure() with assertions inside measure();
      await TabBarComponent.tapMoney();

      // Measure data load times.
      await timer.measure(async () => {
        await MoneyHomeView.waitForEarningsDataLoaded();
        await MoneyHomeView.waitForFundedBalanceLoaded();
      });

      // Don't include regular assertions in measure().
      // Each assertion carries overhead and can skew the results.
      await MoneyHomeView.expectOnboardingCardTitleVisible();
      await MoneyHomeView.expectSendButtonEnabled();
      await MoneyHomeView.expectApyVisible();
      await MoneyHomeView.expectEarningsSectionRendered();

      performanceTracker.addTimers(timer);
    },
  );
});
