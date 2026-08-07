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
import { MONEY_NEW_USER_SRP } from '../../../constants/money.js';

perfTest.describe(`${Performance} ${PerformanceMoney}`, () => {
  perfTest(
    'Money Home after fresh wallet creation with empty balance',
    { tag: '@mm-earn-team' },
    async ({ currentDeviceDetails, driver: _driver, performanceTracker }) => {
      await onboardingFlowImportSRPPlaywright(MONEY_NEW_USER_SRP);

      await PlaywrightAssertions.expectElementToBeVisible(
        asPlaywrightElement(TabBarComponent.tabBarMoneyButton),
        {
          description:
            'Money tab should be available for the empty-account scenario',
        },
      );

      const timer = new TimerHelper(
        'Time since the user taps Money until content is visible',
        { ios: 60_000, android: 60_000 },
        currentDeviceDetails.platform,
      );

      // Best practice: action before measure() with assertions inside measure();
      await TabBarComponent.tapMoney();

      // Measure data load times.
      await timer.measure(async () => {
        await MoneyHomeView.waitForEmptyBalanceLoaded();
        await MoneyHomeView.waitForApyLoaded();
      });

      // Don't include regular assertions in measure().
      // Each assertion carries overhead and can skew the results.
      await MoneyHomeView.expectOnboardingCardTitleVisible();
      await MoneyHomeView.expectSendButtonDisabled();
      await MoneyHomeView.expectEarningsSectionNotVisible();

      performanceTracker.addTimers(timer);
    },
  );
});
