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
import { enableHermesAppProfiling } from '../helpers/appProfiling';

const waitForFirstSuccessful = async <T>(promises: Promise<T>[]): Promise<T> =>
  await new Promise<T>((resolve, reject) => {
    let rejectedCount = 0;

    promises.forEach((promise) => {
      promise.then(resolve).catch(() => {
        rejectedCount += 1;
        if (rejectedCount === promises.length) {
          reject(
            new Error(
              'Rewards content was not visible: dashboard title and modal were both absent',
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
 * visible for the account state. Opted-in and not-yet-joined accounts both
 * land on the Rewards dashboard shell (`rewards-view-title`).
 *
 * Permanent dashboard body content is still evolving, so this gate intentionally
 * stops at the stable shell rather than season/points UI.
 */
perfTest.describe(
  `${Performance} ${PerformanceLogin} ${PerformanceRewards}`,
  () => {
    perfTest(
      'Rewards tab time-to-content',
      { tag: '@performance-team' },
      async ({ currentDeviceDetails, performanceTracker }) => {
        await loginToAppPlaywright();

        const rewardsContentTimer = new TimerHelper(
          'Time since the user taps Rewards until Rewards content is visible',
          { ios: 8000, android: 3000 },
          currentDeviceDetails.platform,
        );

        await ToastModal.waitForToastToDismiss();
        await enableHermesAppProfiling();
        await TabBarComponent.tapRewards();

        await rewardsContentTimer.measure(async () => {
          await waitForFirstSuccessful([
            // Dashboard shell title, including accounts that have not joined.
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
