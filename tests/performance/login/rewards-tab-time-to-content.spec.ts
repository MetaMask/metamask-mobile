import { test as perfTest } from '../../framework/fixtures/playwright';
import TimerHelper from '../../framework/TimerHelper';
import { loginToAppPlaywright } from '../../flows/wallet.flow';
import { AppiumAssertions } from '../../framework';
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
              'Rewards content was not visible: onboarding step, dashboard title, and modal were all absent',
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
            // Non-opted-in path: onboarding surface
            AppiumAssertions.expectElementToBeVisible(
              RewardsView.onboardingStepContainer,
              {
                description: 'Rewards onboarding step should be visible',
              },
            ).then(() => 'onboarding' as const),

            // Opted-in path: dashboard shell title
            AppiumAssertions.expectElementToBeVisible(RewardsView.title, {
              description: 'Rewards dashboard title should be visible',
            }).then(() => 'dashboard' as const),

            // Opted-in with unlinked accounts: "Don't miss out" bottom-sheet modal.
            // This modal appears on the first visit and blocks iOS accessibility to
            // the underlying content. Detecting it here ensures the timer stops as
            // soon as any rewards UI is interactive.
            AppiumAssertions.expectElementToBeVisible(
              RewardsView.dontMissOutModalButton,
              {
                description:
                  'Rewards modal confirm button should be visible (Add accounts)',
              },
            ).then(() => 'modal' as const),
          ]);
        });

        performanceTracker.addTimer(rewardsContentTimer);
      },
    );
  },
);
