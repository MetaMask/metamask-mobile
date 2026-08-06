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
    'Money Home after fresh wallet creation with empty balance',
    { tag: '@mm-earn-team' },
    async ({ currentDeviceDetails, driver: _driver, performanceTracker }) => {
      // We use TEST_SRP_1 for the unfunded Money account.
      await onboardingFlowImportSRPPlaywright(process.env.TEST_SRP_1 ?? '');

      await PlaywrightAssertions.expectElementToBeVisible(
        asPlaywrightElement(TabBarComponent.tabBarMoneyButton),
        {
          description:
            'Money tab should be available for the empty-account scenario',
        },
      );

      const timer = new TimerHelper(
        'Time since the user taps Money until content is visible',
        { ios: 2000, android: 2000 },
        currentDeviceDetails.platform,
      );

      // Best practice: action before measure() with assertions inside measure();
      await TabBarComponent.tapMoney();

      // Measure data load times.
      await timer.measure(async () => {
        await MoneyHomeView.waitForEmptyBalanceLoaded();
      });

      // Don't include regular assertions in measure().
      // Each assertion carries overhead and can skew the results.
      await MoneyHomeView.expectApyVisible();
      await MoneyHomeView.expectOnboardingCardTitleVisible();
      await MoneyHomeView.expectSendButtonDisabled();

      performanceTracker.addTimers(timer);
    },
  );
});
