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

perfTest.describe(`${Performance} ${PerformanceMoney}`, () => {
  perfTest(
    'Money Home after importing SRP with funded balance',
    { tag: '@mm-earn-team' },
    async (
      { currentDeviceDetails, driver: _driver, performanceTracker },
      testInfo,
    ) => {
      await onboardingFlowImportSRPPlaywright(process.env.TEST_SRP_2 ?? '');

      await PlaywrightAssertions.expectElementToBeVisible(
        asPlaywrightElement(TabBarComponent.tabBarMoneyButton),
        {
          description:
            'Money tab should be available for the funded-account scenario',
        },
      );

      // TODO: Run tests 5 times and average the results to set the timeout values.
      const balanceTimer = new TimerHelper(
        'Time since the user taps Money tab until Money Home balance is loaded',
        { ios: 1000, android: 1000 },
        currentDeviceDetails.platform,
      );

      const apyTimer = new TimerHelper(
        'Time since the user taps Money tab until Money Home APY is loaded',
        { ios: 1000, android: 1000 },
        currentDeviceDetails.platform,
      );

      const earningsTimer = new TimerHelper(
        'Time since the user taps Money tab until Money Home earnings are loaded',
        { ios: 2000, android: 2000 },
        currentDeviceDetails.platform,
      );

      const sendButtonTimer = new TimerHelper(
        'Time since the user taps Money tab until Money Home send button is enabled',
        { ios: 1000, android: 1000 },
        currentDeviceDetails.platform,
      );

      const onboardingCardTimer = new TimerHelper(
        'Time since the user taps Money tab until Money Home onboarding card is displayed',
        { ios: 1000, android: 1000 },
        currentDeviceDetails.platform,
      );

      // TODO: Uncomment once we determine how to populate the activity data.
      //   const activityTimer = new TimerHelper(
      //     'Time since the user taps Money tab until Money Home activity is loaded',
      //     { ios: 6000, android: 6000 },
      //     currentDeviceDetails.platform,
      //   );

      // Action before measure(); assertion inside measure();
      await TabBarComponent.tapMoney();

      // Measurement for each assertion for better granularity
      await balanceTimer.measure(async () => {
        await MoneyHomeView.waitForFundedBalance();
      });

      await apyTimer.measure(async () => {
        await MoneyHomeView.expectApyVisible();
      });

      await earningsTimer.measure(async () => {
        await MoneyHomeView.expectEarningsLoaded();
      });

      await sendButtonTimer.measure(async () => {
        await MoneyHomeView.expectSendButtonEnabled();
      });

      await onboardingCardTimer.measure(async () => {
        await MoneyHomeView.expectOnboardingCardStep2Title();
      });

      // TODO: Uncomment once we determine how to populate the activity data.
      // await activityTimer.measure(async () => {
      //   await MoneyHomeView.waitForResolvedFilledActivity();
      // });

      performanceTracker.addTimers(
        balanceTimer,
        apyTimer,
        earningsTimer,
        sendButtonTimer,
        onboardingCardTimer,
      );
    },
  );
});
