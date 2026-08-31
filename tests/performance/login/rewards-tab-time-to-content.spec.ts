import { test as perfTest } from '../../framework/fixtures/playwright';
import TimerHelper from '../../framework/TimerHelper';
import { loginToAppPlaywright } from '../../flows/wallet.flow';
import { asPlaywrightElement, PlaywrightAssertions } from '../../framework';
import TabBarComponent from '../../page-objects/wallet/TabBarComponent';
import ToastModal from '../../page-objects/wallet/ToastModal';
import RewardsView from '../../page-objects/Rewards/RewardsView';
import {
  Performance,
  PerformanceLogin,
  PerformanceRewards,
} from '../../tags.performance.js';

const waitForFirstSuccessful = async <T>(promises: Promise<T>[]): Promise<T> =>
  await new Promise<T>((resolve, reject) => {
    let rejectedCount = 0;

    promises.forEach((promise) => {
      promise.then(resolve).catch(() => {
        rejectedCount += 1;
        if (rejectedCount === promises.length) {
          reject(
            new Error(
              'Rewards content was not visible: neither onboarding nor dashboard shell appeared',
            ),
          );
        }
      });
    });
  });

/*
 * Scenario: Rewards tab time-to-content
 *
 * Measures how long it takes after tapping Rewards until meaningful content is
 * visible for the account state:
 * - Not opted in → OnboardingMainStep (`onboarding-step-container`)
 * - Opted in → Rewards dashboard shell (`rewards-view-title`)
 *
 * Permanent dashboard body content is still evolving, so this gate intentionally
 * stops at the stable shell / onboarding surface rather than season/points UI.
 */
perfTest.describe(
  `${Performance} ${PerformanceLogin} ${PerformanceRewards}`,
  () => {
    perfTest(
      'Rewards tab time-to-content (onboarding or dashboard)',
      { tag: '@performance-team' },
      async ({ currentDeviceDetails, performanceTracker }) => {
        await loginToAppPlaywright();

        const rewardsContentTimer = new TimerHelper(
          'Time since the user taps Rewards until Rewards content is visible (onboarding or dashboard)',
          { ios: 8000, android: 5000 },
          currentDeviceDetails.platform,
        );

        await ToastModal.waitForToastToDismiss();
        await TabBarComponent.tapRewards();

        await rewardsContentTimer.measure(async () => {
          await waitForFirstSuccessful([
            PlaywrightAssertions.expectElementToBeVisible(
              asPlaywrightElement(RewardsView.onboardingStepContainer),
              {
                description: 'Rewards onboarding step should be visible',
              },
            ).then(() => 'onboarding' as const),
            PlaywrightAssertions.expectElementToBeVisible(
              asPlaywrightElement(RewardsView.title),
              {
                description: 'Rewards dashboard title should be visible',
              },
            ).then(() => 'dashboard' as const),
          ]);
        });

        performanceTracker.addTimer(rewardsContentTimer);
      },
    );
  },
);
