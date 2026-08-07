import { test as perfTest } from '../../../framework/fixtures/playwright/index.js';
import TimerHelper from '../../../framework/TimerHelper.js';
import {
  asPlaywrightElement,
  PlaywrightAssertions,
} from '../../../framework/index.js';
import {
  loginToAppPlaywright,
  onboardingFlowImportSRPPlaywright,
} from '../../../flows/wallet.flow.js';
import MoneyHomeView from '../../../page-objects/Money/MoneyHomeView.js';
import TabBarComponent from '../../../page-objects/wallet/TabBarComponent.js';
import { Performance, PerformanceMoney } from '../../../tags.performance.js';
import { MONEY_FUNDED_USER_SRP } from '../../../constants/money.js';

perfTest.describe(`${Performance} ${PerformanceMoney}`, () => {
  perfTest(
    'Money Home after importing SRP with funded balance',
    { tag: '@mm-earn-team' },
    async ({ currentDeviceDetails, driver: _driver, performanceTracker }) => {
      await onboardingFlowImportSRPPlaywright(MONEY_FUNDED_USER_SRP);

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
        await MoneyHomeView.waitForFundedBalanceLoaded();
        await MoneyHomeView.waitForEarningsValuesLoaded();
        await MoneyHomeView.waitForApyLoaded();
      });

      // Only include data fetching assertions in measure().
      // Each assertion carries overhead and can inflate results.
      await MoneyHomeView.expectOnboardingCardTitleVisible();
      await MoneyHomeView.expectSendButtonEnabled();
      await MoneyHomeView.expectEarningsSectionVisible();

      performanceTracker.addTimers(timer);
    },
  );
});
