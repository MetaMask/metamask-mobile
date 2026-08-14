import TimerHelper from '../../../framework/TimerHelper';
import { asPlaywrightElement, PlaywrightAssertions } from '../../../framework';
import OnboardingInterestQuestionnaireView from '../../../page-objects/Onboarding/OnboardingInterestQuestionnaireView';
import OnboardingSuccessView from '../../../page-objects/Onboarding/OnboardingSuccessView';
import PredictModalView from '../../../page-objects/Predict/PredictModalView';

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

const expectSuccessDoneVisible = async (): Promise<void> => {
  await PlaywrightAssertions.expectElementToBeVisible(
    asPlaywrightElement(OnboardingSuccessView.doneButton),
    {
      description: 'Onboarding success done button should be visible',
    },
  );
};

/**
 * After Create Password tap: measure Create Password → Onboarding Success Done.
 * Success-first (no survey): timer records the full create → success latency.
 * Questionnaire-first: skip is untimed after the race; timer is re-measured for
 * post-skip → success only (survey time is not kept in the recorded duration).
 */
export async function measureCreatePasswordToOnboardingSuccess(
  timer: TimerHelper,
): Promise<void> {
  let questionnaireFirst = false;

  await timer.measure(async () => {
    const next = await waitForFirstSuccessful([
      PlaywrightAssertions.expectElementToBeVisible(
        asPlaywrightElement(OnboardingInterestQuestionnaireView.skipButton),
        {
          description: 'Interest questionnaire Skip should be visible',
        },
      ).then(() => 'questionnaire' as const),
      expectSuccessDoneVisible().then(() => 'success' as const),
    ]);

    if (next === 'questionnaire') {
      questionnaireFirst = true;
    }
  });

  if (questionnaireFirst) {
    await OnboardingInterestQuestionnaireView.tapSkipButton();
    // Overwrites the race-to-questionnaire duration with post-skip → success only.
    await timer.measure(async () => {
      await expectSuccessDoneVisible();
    });
  }
}

/**
 * Measures Done → Predict GTM "Not now" when the modal appears.
 * Returns false when the modal is absent (flag/config off) without failing the test.
 * Does not pre-wait before measuring (avoids collapsing timer5 to ~0ms).
 */
export async function measurePredictGtmModalIfShown(
  timer: TimerHelper,
): Promise<boolean> {
  try {
    await timer.measure(async () => {
      await PlaywrightAssertions.expectElementToBeVisible(
        asPlaywrightElement(PredictModalView.notNowButton),
        {
          timeout: 10000,
          description: 'Predict modal should be visible',
        },
      );
    });
    return true;
  } catch {
    return false;
  }
}
