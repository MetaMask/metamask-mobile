import TimerHelper from '../../../framework/TimerHelper';
import { AppiumAssertions } from '../../../framework';
import OnboardingInterestQuestionnaireView from '../../../page-objects/Onboarding/OnboardingInterestQuestionnaireView';
import WalletView from '../../../page-objects/wallet/WalletView';

const waitForFirstSuccessful = async <T>(promises: Promise<T>[]): Promise<T> =>
  await new Promise<T>((resolve, reject) => {
    let rejectedCount = 0;

    promises.forEach((promise) => {
      promise.then(resolve).catch(() => {
        rejectedCount += 1;
        if (rejectedCount === promises.length) {
          reject(new Error('All screen detection promises failed'));
        }
      });
    });
  });

const expectWalletHomeVisible = async (): Promise<void> => {
  await AppiumAssertions.expectElementToBeVisible(WalletView.accountIcon, {
    description: 'Wallet main screen should be visible',
  });
};

/**
 * After Create Password tap: measure Create Password → wallet home.
 * Home-first (no survey): timer records the full create → home latency.
 * Questionnaire-first: skip is untimed after the race; timer is re-measured for
 * post-skip → home only (survey time is not kept in the recorded duration).
 */
export async function measureCreatePasswordToWalletHome(
  timer: TimerHelper,
): Promise<void> {
  let questionnaireFirst = false;

  await timer.measure(async () => {
    const next = await waitForFirstSuccessful([
      AppiumAssertions.expectElementToBeVisible(
        OnboardingInterestQuestionnaireView.skipButton,
        {
          description: 'Interest questionnaire Skip should be visible',
        },
      ).then(() => 'questionnaire' as const),
      expectWalletHomeVisible().then(() => 'home' as const),
    ]);

    if (next === 'questionnaire') {
      questionnaireFirst = true;
    }
  });

  if (questionnaireFirst) {
    await OnboardingInterestQuestionnaireView.tapSkipButton();
    // Overwrites the race-to-questionnaire duration with post-skip → home only.
    await timer.measure(async () => {
      await expectWalletHomeVisible();
    });
  }
}
