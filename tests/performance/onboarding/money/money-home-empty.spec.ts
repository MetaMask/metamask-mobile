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
      await onboardingFlowImportSRPPlaywright(process.env.TEST_SRP_1 ?? '');

      await PlaywrightAssertions.expectElementToBeVisible(
        asPlaywrightElement(TabBarComponent.tabBarMoneyButton),
        {
          description:
            'Money tab should be available for the empty-account scenario',
        },
      );

      const balanceTimer = new TimerHelper(
        'Time since the user taps Money until the empty balance is visible',
        { ios: 6000, android: 6000 },
        currentDeviceDetails.platform,
      );
      const apyTimer = new TimerHelper(
        'Time since the user taps Money until the APY is visible',
        { ios: 1500, android: 1500 },
        currentDeviceDetails.platform,
      );
      const ctaTimer = new TimerHelper(
        'Time since the user taps Money until the onboarding card step 1 CTA is visible',
        { ios: 1500, android: 1500 },
        currentDeviceDetails.platform,
      );
      const sendButtonTimer = new TimerHelper(
        'Time since the user taps Money until the Send button is disabled',
        { ios: 1000, android: 1000 },
        currentDeviceDetails.platform,
      );

      // Action before measure(); assertion inside measure();
      await TabBarComponent.tapMoney();

      // Measurement for each assertion for better granularity
      await balanceTimer.measure(async () => {
        await MoneyHomeView.waitForEmptyBalance();
      });
      await apyTimer.measure(async () => {
        await MoneyHomeView.expectApyVisible();
      });
      await ctaTimer.measure(async () => {
        await MoneyHomeView.expectOnboardingCardStep1Title();
      });
      await sendButtonTimer.measure(async () => {
        await MoneyHomeView.expectSendButtonDisabled();
      });

      performanceTracker.addTimers(
        balanceTimer,
        apyTimer,
        ctaTimer,
        sendButtonTimer,
      );
    },
  );
});
