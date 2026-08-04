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

/**
 * Untimed: after Create Password, skip the interest questionnaire if it appears.
 * Returns immediately when Onboarding Success Done is already visible (no 3s burn).
 */
export async function dismissInterestQuestionnaireIfPresent(): Promise<void> {
  try {
    const next = await waitForFirstSuccessful([
      PlaywrightAssertions.expectElementToBeVisible(
        asPlaywrightElement(OnboardingInterestQuestionnaireView.skipButton),
        {
          description: 'Interest questionnaire Skip should be visible',
        },
      ).then(() => 'questionnaire' as const),
      PlaywrightAssertions.expectElementToBeVisible(
        asPlaywrightElement(OnboardingSuccessView.doneButton),
        {
          description: 'Onboarding success done button should be visible',
        },
      ).then(() => 'success' as const),
    ]);

    if (next === 'questionnaire') {
      await OnboardingInterestQuestionnaireView.tapSkipButton();
    }
  } catch {
    // Neither screen within assertion timeouts — timer4 will surface the failure.
  }
}

/**
 * Measures Create Password → Onboarding Success Done only.
 * Call {@link dismissInterestQuestionnaireIfPresent} first (untimed) so the
 * optional survey is not included in this timer.
 */
export async function measureCreatePasswordToOnboardingSuccess(
  timer: TimerHelper,
): Promise<void> {
  await timer.measure(async () => {
    await PlaywrightAssertions.expectElementToBeVisible(
      asPlaywrightElement(OnboardingSuccessView.doneButton),
      {
        description: 'Onboarding success done button should be visible',
      },
    );
  });
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
