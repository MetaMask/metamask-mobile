import { test as perfTest } from '../../framework/fixtures/playwright';
import {
  asPlaywrightElement,
  PlaywrightAssertions,
  PlaywrightGestures,
} from '../../framework';
import { withImplicitWait } from '../../framework/PlaywrightUtilities';
import TabBarComponent from '../../page-objects/wallet/TabBarComponent';
import TimerHelper, {
  type PlatformThreshold,
} from '../../framework/TimerHelper';
import { getPasswordForScenario } from '../../framework/utils/TestConstants.js';
import OnboardingView from '../../page-objects/Onboarding/OnboardingView';
import OnboardingSheet from '../../page-objects/Onboarding/OnboardingSheet';
import CreatePasswordView from '../../page-objects/Onboarding/CreatePasswordView';
import ProtectYourWalletView from '../../page-objects/Onboarding/ProtectYourWalletView';
import MetaMetricsOptInView from '../../page-objects/Onboarding/MetaMetricsOptInView';
import OnboardingInterestQuestionnaireView from '../../page-objects/Onboarding/OnboardingInterestQuestionnaireView';
import PushNotificationOnboardingView from '../../page-objects/Notifications/PushNotificationOnboardingView';
import {
  Performance,
  PerformanceOnboarding,
  System,
} from '../../tags.performance.js';

// Single source of truth for post-onboarding destinations. The count is used
// as the loop safety cap so adding a new destination automatically extends
// the cap.
const POST_ONBOARDING_DESTINATIONS = [
  'interest-questionnaire',
  'push-notification',
  'wallet',
] as const;

type PostOnboardingDestination = (typeof POST_ONBOARDING_DESTINATIONS)[number];

type PostOnboardingSource =
  | 'metametrics'
  | Exclude<PostOnboardingDestination, 'wallet'>;

const POST_ONBOARDING_THRESHOLD: PlatformThreshold = {
  ios: 5_000,
  android: 5_000,
};

const POST_ONBOARDING_DESTINATION_LABELS: Record<
  PostOnboardingDestination,
  string
> = {
  'interest-questionnaire': 'onboarding interest questionnaire',
  'push-notification': 'push notification sheet',
  wallet: 'usable wallet',
};

const POST_ONBOARDING_SOURCE_LABELS: Record<PostOnboardingSource, string> = {
  metametrics: '"Agree" on MetaMetrics',
  'interest-questionnaire': '"Skip" on the onboarding interest questionnaire',
  'push-notification': '"Not now" on the push notification sheet',
};

const DESTINATION_PROBE_IMPLICIT_WAIT_MS = 300;

const isCandidateVisible = async (
  getElement: () => ReturnType<typeof asPlaywrightElement>,
): Promise<boolean> => {
  try {
    const el = await getElement();
    return (await el.unwrap().isExisting()) && (await el.isVisible());
  } catch {
    return false;
  }
};

const waitForPostOnboardingDestination = async (
  appDriver: WebdriverIO.Browser,
  dismissedDestinations: ReadonlySet<PostOnboardingDestination>,
): Promise<PostOnboardingDestination> => {
  // Sheet destinations are listed before wallet so a still-open prompt wins
  // over the tab bar (which often remains mounted behind sheets).
  const candidates: {
    destination: PostOnboardingDestination;
    getElement: () => ReturnType<typeof asPlaywrightElement>;
  }[] = [
    {
      destination: 'interest-questionnaire',
      getElement: () =>
        asPlaywrightElement(OnboardingInterestQuestionnaireView.skipButton),
    },
    {
      destination: 'push-notification',
      getElement: () =>
        asPlaywrightElement(PushNotificationOnboardingView.title),
    },
    {
      // Tab-bar Wallet button (matches import-wallet.spec.ts): usable home,
      // not just wallet shell mount.
      destination: 'wallet',
      getElement: () => asPlaywrightElement(TabBarComponent.tabBarWalletButton),
    },
  ];

  const remaining = candidates.filter(
    (candidate) => !dismissedDestinations.has(candidate.destination),
  );

  if (remaining.length === 0) {
    throw new Error('No post-onboarding destinations remain to wait for');
  }

  // Last hop to wallet: skip multi-candidate polling and
  // wait on the single remaining element. Avoids expensive getPageSource dumps
  // that inflate cloud performance timers while the UI is already ready.
  if (remaining.length === 1) {
    const only = remaining[0];
    await PlaywrightAssertions.expectElementToBeVisible(only.getElement(), {
      description: `${POST_ONBOARDING_DESTINATION_LABELS[only.destination]} should be visible`,
    });
    return only.destination;
  }

  let visibleCandidate: (typeof candidates)[number] | undefined;

  // Probe concrete elements instead of getPageSource(): full hierarchy dumps
  // are multi-second Appium RTTs on BrowserStack/TestMu and were not fully
  // subtracted from TimerHelper (only the final probe is).
  await withImplicitWait(DESTINATION_PROBE_IMPLICIT_WAIT_MS, async () => {
    await appDriver.waitUntil(
      async () => {
        // Prefer any visible sheet over wallet — tab bar often stays mounted.
        for (const candidate of remaining) {
          if (candidate.destination === 'wallet') {
            continue;
          }
          if (await isCandidateVisible(candidate.getElement)) {
            visibleCandidate = candidate;
            return true;
          }
        }

        const walletCandidate = remaining.find(
          (candidate) => candidate.destination === 'wallet',
        );
        if (!walletCandidate) {
          return false;
        }
        if (!(await isCandidateVisible(walletCandidate.getElement))) {
          return false;
        }

        // Defer wallet while a remaining sheet is still in the hierarchy
        // (e.g. animating out after "Not now").
        for (const sheet of remaining) {
          if (sheet.destination === 'wallet') {
            continue;
          }
          try {
            const sheetEl = await sheet.getElement();
            if (await sheetEl.unwrap().isExisting()) {
              return false;
            }
          } catch {
            // ignore probe errors
          }
        }

        visibleCandidate = walletCandidate;
        return true;
      },
      {
        timeout: 30_000,
        interval: 250,
        timeoutMsg: 'No post-onboarding destination became visible',
      },
    );
  });

  const resolvedCandidate = visibleCandidate;
  if (!resolvedCandidate) {
    throw new Error('Post-onboarding destination was not resolved');
  }

  await PlaywrightAssertions.expectElementToBeVisible(
    resolvedCandidate.getElement(),
    {
      description: `${POST_ONBOARDING_DESTINATION_LABELS[resolvedCandidate.destination]} should be visible`,
    },
  );

  return resolvedCandidate.destination;
};

const measurePostOnboardingDestination = async (
  appDriver: WebdriverIO.Browser,
  timer: TimerHelper,
  dismissedDestinations: ReadonlySet<PostOnboardingDestination>,
): Promise<PostOnboardingDestination> => {
  let destination: PostOnboardingDestination | undefined;

  await timer.measure(async () => {
    destination = await waitForPostOnboardingDestination(
      appDriver,
      dismissedDestinations,
    );
  });

  if (!destination) {
    throw new Error('Post-onboarding destination was not resolved');
  }

  return destination;
};

const dismissPostOnboardingDestination = async (
  destination: Exclude<PostOnboardingDestination, 'wallet'>,
): Promise<void> => {
  switch (destination) {
    case 'interest-questionnaire':
      await OnboardingInterestQuestionnaireView.tapSkipButton();
      break;
    case 'push-notification':
      await PushNotificationOnboardingView.tapNotNowButton();
      break;
  }
};

/**
 * Once a later prompt appears, earlier ones in POST_ONBOARDING_DESTINATIONS
 * will not show. Mark them dismissed so later hops do not keep probing them
 * (failed isExisting with implicit wait was inflating the final wallet wait).
 */
const markSkippedDestinationsBefore = (
  dismissedDestinations: Set<PostOnboardingDestination>,
  reached: PostOnboardingDestination,
): void => {
  for (const destination of POST_ONBOARDING_DESTINATIONS) {
    if (destination === reached) {
      break;
    }
    dismissedDestinations.add(destination);
  }
};

/* TO-915: Fresh SRP wallet creation from onboarding to a usable wallet. */
perfTest.describe(`${Performance} ${System} ${PerformanceOnboarding}`, () => {
  perfTest(
    'Fresh SRP wallet creation performance',
    { tag: '@metamask-onboarding-team' },
    async ({ currentDeviceDetails, driver: appDriver, performanceTracker }) => {
      perfTest.setTimeout(10 * 60 * 1_000);

      // These are conservative initial guardrails to calibrate against CI
      // performance baselines once this coverage is running consistently.
      const onboardingSheetTimer = new TimerHelper(
        'Time since the user taps "Create a new wallet" until the onboarding sheet is visible',
        { ios: 1_500, android: 1_800 },
        currentDeviceDetails.platform,
      );
      const passwordScreenTimer = new TimerHelper(
        'Time since the user selects SRP wallet creation until the password fields are visible',
        { ios: 1_500, android: 2_000 },
        currentDeviceDetails.platform,
      );
      const walletCreationTimer = new TimerHelper(
        'Time since the user taps "Create Password" until the wallet backup screen is visible',
        { ios: 5_000, android: 7_000 },
        currentDeviceDetails.platform,
      );
      const backupSkipTimer = new TimerHelper(
        'Time since the user taps "Remind me later" until the MetaMetrics screen is visible',
        { ios: 2_000, android: 2_500 },
        currentDeviceDetails.platform,
      );

      await PlaywrightAssertions.expectElementToBeVisible(
        asPlaywrightElement(OnboardingView.newWalletButton),
        {
          timeout: 60_000,
          description: 'Fresh-install onboarding screen should be ready',
        },
      );

      await OnboardingView.tapCreateNewWalletButton();
      await onboardingSheetTimer.measure(async () => {
        await PlaywrightAssertions.expectElementToBeVisible(
          asPlaywrightElement(OnboardingSheet.importSeedButton),
        );
      });

      // Note: `IMPORT_SEED_BUTTON` is the testID name, but the underlying
      // component (app/components/Views/OnboardingSheet/index.tsx) toggles
      // its behavior on the `createWallet` prop. Because we entered via
      // "Create a new wallet", tapping this button fires `onPressCreate` and
      // navigates to ChoosePassword — i.e. it starts a fresh SRP creation,
      // not an import. The Page Object method name mirrors the testID.
      await OnboardingSheet.tapImportSeedButton();
      await passwordScreenTimer.measure(async () => {
        await CreatePasswordView.isVisible();
      });

      const password = getPasswordForScenario('onboarding') ?? '';
      await CreatePasswordView.enterPassword(password);
      await CreatePasswordView.reEnterPassword(password);
      await PlaywrightGestures.hideKeyboard();
      await CreatePasswordView.tapIUnderstandCheckBox();

      await CreatePasswordView.tapCreatePasswordButton();
      await walletCreationTimer.measure(async () => {
        await PlaywrightAssertions.expectElementToBeVisible(
          asPlaywrightElement(ProtectYourWalletView.remindMeLaterButton),
          {
            timeout: 30_000,
            description: 'Wallet backup screen should be visible',
          },
        );
      });

      await ProtectYourWalletView.tapRemindMeLater();
      await backupSkipTimer.measure(async () => {
        await PlaywrightAssertions.expectElementToBeVisible(
          asPlaywrightElement(MetaMetricsOptInView.screenTitle),
          {
            timeout: 30_000,
            description: 'MetaMetrics screen should be visible',
          },
        );
      });

      performanceTracker.addTimers(
        onboardingSheetTimer,
        passwordScreenTimer,
        walletCreationTimer,
        backupSkipTimer,
      );

      const postOnboardingTimers: TimerHelper[] = [];
      let source: PostOnboardingSource = 'metametrics';
      const dismissedDestinations = new Set<PostOnboardingDestination>();
      let destination: PostOnboardingDestination | undefined;

      await MetaMetricsOptInView.tapAgreeButton();

      // Safety cap derived from POST_ONBOARDING_DESTINATIONS so adding a
      // new destination extends the cap automatically.
      for (
        let hop = 1;
        hop <= POST_ONBOARDING_DESTINATIONS.length && destination !== 'wallet';
        hop += 1
      ) {
        const transitionTimer = new TimerHelper(
          `Fresh SRP post-onboarding transition ${hop}`,
          POST_ONBOARDING_THRESHOLD,
          currentDeviceDetails.platform,
        );
        destination = await measurePostOnboardingDestination(
          appDriver,
          transitionTimer,
          dismissedDestinations,
        );

        transitionTimer.changeName(
          `Time since the user taps ${POST_ONBOARDING_SOURCE_LABELS[source]} until ${POST_ONBOARDING_DESTINATION_LABELS[destination]} is visible`,
        );
        postOnboardingTimers.push(transitionTimer);

        if (destination === 'wallet') {
          break;
        }

        // Interest/push may never appear; once we land on a later sheet,
        // mark prior destinations skipped so the next hop short-circuits to
        // a single-element wallet wait instead of probing ghosts.
        markSkippedDestinationsBefore(dismissedDestinations, destination);
        await dismissPostOnboardingDestination(destination);
        dismissedDestinations.add(destination);
        source = destination;
      }

      // Assert on the resolved destination, not on the timer count or label
      // string — the loop must reach the usable wallet regardless of how many
      // post-onboarding prompts appeared along the way.
      if (destination !== 'wallet') {
        throw new Error(
          `Fresh SRP onboarding did not reach the usable wallet after ${postOnboardingTimers.length} post-onboarding transition(s)`,
        );
      }

      performanceTracker.addTimers(...postOnboardingTimers);
    },
  );
});
