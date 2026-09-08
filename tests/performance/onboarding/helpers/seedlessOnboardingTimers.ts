import TimerHelper, {
  type PlatformThreshold,
} from '../../../framework/TimerHelper';
import { AppiumAssertions } from '../../../framework';
import OnboardingInterestQuestionnaireView from '../../../page-objects/Onboarding/OnboardingInterestQuestionnaireView';
import OnboardingSheet from '../../../page-objects/Onboarding/OnboardingSheet';
import OnboardingSuccessView from '../../../page-objects/Onboarding/OnboardingSuccessView';
import OnboardingView from '../../../page-objects/Onboarding/OnboardingView';
import CreatePasswordView from '../../../page-objects/Onboarding/CreatePasswordView';
import SocialLoginView from '../../../page-objects/Onboarding/SocialLoginView';
import LoginView from '../../../page-objects/wallet/LoginView';

/**
 * Seedless onboarding CI timers — in-app TTC vs nav/flow steps.
 *
 * Sentry Onboarding Screen Time To Content = React mount → contentReady
 * (useScreenPerformance). On e2e/perf builds that duration is exposed via
 * ScreenTtcProbeHost; Appium reads it with addAppScreenTtcTimer / waitForAppScreenTtc.
 *
 * Separate timers:
 * - TTC [screen_id]: in-app mount→contentReady (Sentry-equivalent)
 * - nav: prior tap → destination UI visible (includes navigation)
 * - flow: OAuth / wallet create / wallet chrome
 */

export type SeedlessProvider = 'Google' | 'Apple' | 'Telegram';

export type SeedlessSheetProviderButton = 'google' | 'apple' | 'telegram';

/** Real Sentry onboarding screen_ids (see OnboardingScreenIds). */
export type OnboardingTtcScreenId =
  | 'onboarding_landing'
  | 'onboarding_sheet'
  | 'choose_pw'
  | 'social_login_success_new_user'
  | 'account_already_exists'
  | 'social_rehydrate'
  | 'onboarding_success';

export type PostOauthContent =
  | 'choose_pw'
  | 'social_login_success_new_user'
  | 'account_already_exists';

export const waitForFirstSuccessful = async <T>(
  promises: Promise<T>[],
): Promise<T> =>
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

/** Sentry `onboarding_landing` contentReady ≈ interactive Create CTA. */
export async function waitForOnboardingLandingContent(): Promise<void> {
  await AppiumAssertions.expectElementToBeVisible(
    OnboardingView.newWalletButton,
    {
      description:
        'Onboarding landing content: Create new wallet CTA should be visible',
    },
  );
}

/** Sentry `onboarding_sheet` — provider CTA proves the sheet painted. */
export async function waitForOnboardingSheetContent(
  provider: SeedlessSheetProviderButton,
): Promise<void> {
  const button =
    provider === 'google'
      ? OnboardingSheet.googleLoginButton
      : provider === 'apple'
        ? OnboardingSheet.appleLoginButton
        : OnboardingSheet.telegramLoginButton;

  await AppiumAssertions.expectElementToBeVisible(button, {
    description: `Onboarding sheet content: ${provider} login button should be visible`,
  });
}

/** Sentry `choose_pw` contentReady (form paints immediately). */
export async function waitForChoosePasswordContent(): Promise<void> {
  await CreatePasswordView.isVisible();
}

/** Sentry `social_login_success_new_user` (iOS post-OAuth success). */
export async function waitForSocialLoginNewUserContent(): Promise<void> {
  await SocialLoginView.isIosNewUserScreenVisible();
}

/** Sentry `account_already_exists`. */
export async function waitForAccountAlreadyExistsContent(): Promise<void> {
  await SocialLoginView.isAccountFoundScreenVisible();
}

export async function waitForPostOauthContent(options: {
  platform: 'ios' | 'android' | string;
}): Promise<PostOauthContent> {
  if (options.platform === 'ios') {
    return await waitForFirstSuccessful([
      waitForSocialLoginNewUserContent().then(
        () => 'social_login_success_new_user' as const,
      ),
      waitForAccountAlreadyExistsContent().then(
        () => 'account_already_exists' as const,
      ),
    ]);
  }

  return await waitForFirstSuccessful([
    waitForChoosePasswordContent().then(() => 'choose_pw' as const),
    waitForAccountAlreadyExistsContent().then(
      () => 'account_already_exists' as const,
    ),
  ]);
}

/** Sentry `social_rehydrate` — Login title (shared testIDs). */
export async function waitForSocialRehydrateContent(): Promise<void> {
  await LoginView.waitForScreenToDisplay();
}

/** Sentry `onboarding_success` — Done button. */
export async function waitForOnboardingSuccessContent(): Promise<void> {
  await AppiumAssertions.expectElementToBeVisible(
    OnboardingSuccessView.doneButton,
    {
      description: 'Onboarding success content: Done button should be visible',
    },
  );
}

/**
 * In-app TTC name — duration comes from useScreenPerformance via the probe.
 */
export function seedlessAppTtcTimerName(
  screenId: OnboardingTtcScreenId,
): string {
  return `TTC [${screenId}]: in-app mount→contentReady`;
}

/** Navigation step (prior tap → UI). Not Sentry TTC. */
export function seedlessNavTimerName(
  provider: SeedlessProvider,
  userFacingStep: string,
): string {
  return `${provider} nav: ${userFacingStep}`;
}

/** Flow step name — OAuth / wallet-create / wallet chrome (not TTC). */
export function seedlessFlowTimerName(
  provider: SeedlessProvider,
  userFacingStep: string,
): string {
  return `${provider} flow: ${userFacingStep}`;
}

/**
 * OAuth → first post-OAuth screen. Dominated by provider latency, so this is a
 * **flow** timer. After measure, renames with the real destination `screen_id`.
 */
export async function measurePostOauthToScreenContent(
  timer: TimerHelper,
  provider: SeedlessProvider,
  platform: string,
): Promise<PostOauthContent> {
  let content: PostOauthContent = 'choose_pw';

  await timer.measure(async () => {
    content = await waitForPostOauthContent({ platform });
  });

  timer.changeName(
    seedlessFlowTimerName(
      provider,
      `OAuth → [${content}] content visible (includes provider latency)`,
    ),
  );

  return content;
}

/**
 * Create Password → Onboarding Success Done.
 * **Flow** timer: includes wallet create (not mount TTC for onboarding_success).
 */
export async function measureCreatePasswordToOnboardingSuccess(
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
      waitForOnboardingSuccessContent().then(() => 'success' as const),
    ]);

    if (next === 'questionnaire') {
      questionnaireFirst = true;
    }
  });

  if (questionnaireFirst) {
    await OnboardingInterestQuestionnaireView.tapSkipButton();
    await timer.measure(async () => {
      await waitForOnboardingSuccessContent();
    });
  }
}

export interface SeedlessOnboardingTimers {
  /** nav: Create wallet → sheet UI */
  sheetNav: TimerHelper;
  /** Flow: OAuth → destination (renamed with real screen_id after measure) */
  postOauthFlow: TimerHelper;
  /** nav: iOS Set PIN → password fields */
  choosePasswordNav: TimerHelper;
  /** Flow: Create Password → success (wallet create) */
  createWalletFlow: TimerHelper;
  /** Flow: Done → wallet chrome (not HomepageReady / not onboarding TTC) */
  walletChromeFlow: TimerHelper;
  /** nav: Account Found Login → rehydrate UI */
  rehydrateNav: TimerHelper;
  /** Flow: Unlock → wallet chrome */
  existingWalletFlow: TimerHelper;
}

/** Generous until BrowserStack baselines for in-app TTC exist. */
export const SEEDLESS_APP_TTC_THRESHOLDS: Record<
  OnboardingTtcScreenId,
  PlatformThreshold
> = {
  onboarding_landing: { ios: 10_000, android: 12_000 },
  onboarding_sheet: { ios: 3_000, android: 4_000 },
  choose_pw: { ios: 3_000, android: 4_000 },
  social_login_success_new_user: { ios: 3_000, android: 4_000 },
  account_already_exists: { ios: 3_000, android: 4_000 },
  social_rehydrate: { ios: 3_000, android: 4_000 },
  onboarding_success: { ios: 3_000, android: 4_000 },
};

/**
 * Shared timer set for Google / Apple / Telegram seedless specs.
 * Nav/flow thresholds match prior seedless baselines (not newly tightened).
 */
export function createSeedlessOnboardingTimers(
  provider: SeedlessProvider,
  platform: 'ios' | 'android',
  thresholds: {
    sheet: PlatformThreshold;
    postOauth: PlatformThreshold;
    choosePassword: PlatformThreshold;
    createWallet: PlatformThreshold;
    walletChrome: PlatformThreshold;
    rehydrate: PlatformThreshold;
    existingWallet: PlatformThreshold;
  },
): SeedlessOnboardingTimers {
  return {
    sheetNav: new TimerHelper(
      seedlessNavTimerName(
        provider,
        'Create new wallet → sheet content visible',
      ),
      thresholds.sheet,
      platform,
    ),
    postOauthFlow: new TimerHelper(
      seedlessFlowTimerName(
        provider,
        'OAuth → post-OAuth content visible (destination stamped after measure)',
      ),
      thresholds.postOauth,
      platform,
    ),
    choosePasswordNav: new TimerHelper(
      seedlessNavTimerName(provider, 'iOS Set PIN → password fields visible'),
      thresholds.choosePassword,
      platform,
    ),
    createWalletFlow: new TimerHelper(
      seedlessFlowTimerName(
        provider,
        'Create Password → onboarding_success Done visible (includes wallet create)',
      ),
      thresholds.createWallet,
      platform,
    ),
    walletChromeFlow: new TimerHelper(
      seedlessFlowTimerName(
        provider,
        'Done → wallet chrome visible (not HomepageReady)',
      ),
      thresholds.walletChrome,
      platform,
    ),
    rehydrateNav: new TimerHelper(
      seedlessNavTimerName(
        provider,
        'Account Found Login → rehydrate/login content visible',
      ),
      thresholds.rehydrate,
      platform,
    ),
    existingWalletFlow: new TimerHelper(
      seedlessFlowTimerName(
        provider,
        'Unlock → wallet chrome visible (not HomepageReady)',
      ),
      thresholds.existingWallet,
      platform,
    ),
  };
}
