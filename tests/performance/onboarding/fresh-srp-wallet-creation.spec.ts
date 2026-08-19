import { test as perfTest } from '../../framework/fixtures/playwright';
import {
  asPlaywrightElement,
  createLogger,
  PlaywrightAssertions,
  PlaywrightGestures,
  sleep,
} from '../../framework';
import {
  withImplicitWait,
  isOverheadTrackingActive,
  recordFailedPollCommand,
  addOverheadSleep,
} from '../../framework/PlaywrightUtilities';
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
import { closePredictModal } from '../../flows/wallet.flow';
import {
  Performance,
  PerformanceOnboarding,
  System,
} from '../../tags.performance.js';

const logger = createLogger({
  name: 'FreshSrpWalletCreation',
});

// Single source of truth for post-onboarding destinations. The count is used
// as the loop safety cap so adding a new destination automatically extends
// the cap. Predict is dismissed outside performance measurements because it
// is an optional onboarding modal, not a measured destination.
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
  android: 6_000,
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

// 0ms implicit wait: non-existent elements return immediately (just Appium RTT)
// instead of blocking for 300ms per probe. This matters on cloud Appium where
// each isExisting() call at 300ms + RTT inflates the timer by several seconds.
const DESTINATION_PROBE_IMPLICIT_WAIT_MS = 0;
const DESTINATION_POLL_INTERVAL_MS = 250;
const DESTINATION_POLL_TIMEOUT_MS = 30_000;
const INTEREST_QUESTIONNAIRE_PROBE_TIMEOUT_MS = 1_000;

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
  const interestQuestionnaireProbeDeadline =
    Date.now() + INTEREST_QUESTIONNAIRE_PROBE_TIMEOUT_MS;

  if (remaining.length === 0) {
    throw new Error('No post-onboarding destinations remain to wait for');
  }

  // Single remaining element: use PlaywrightAssertions for proper overhead
  // tracking instead of the multi-candidate polling loop.
  if (remaining.length === 1) {
    const only = remaining[0];
    await PlaywrightAssertions.expectElementToBeVisible(only.getElement(), {
      description: `${POST_ONBOARDING_DESTINATION_LABELS[only.destination]} should be visible`,
    });
    return only.destination;
  }

  let visibleCandidate: (typeof candidates)[number] | undefined;

  // Multi-candidate polling: use a manual while-loop instead of
  // appDriver.waitUntil so every failed probe and sleep can be recorded as
  // infrastructure overhead. This prevents cloud Appium RTTs (~300-500 ms per
  // isExisting() call) from inflating the performance timer.
  //
  // DESTINATION_PROBE_IMPLICIT_WAIT_MS = 0 ensures absent elements return
  // immediately (just RTT) rather than blocking for 300 ms each.
  //
  // definitivelyAbsent tracks destinations that have timed out or been
  // confirmed absent so the defer check does not keep probing them.
  const definitivelyAbsent = new Set<PostOnboardingDestination>();
  const loopStart = Date.now();

  await withImplicitWait(DESTINATION_PROBE_IMPLICIT_WAIT_MS, async () => {
    while (Date.now() - loopStart < DESTINATION_POLL_TIMEOUT_MS) {
      const tracking = isOverheadTrackingActive();

      // Check sheet candidates first; sheets take priority over tab bar.
      let sheetFound = false;
      for (const candidate of remaining) {
        if (candidate.destination === 'wallet') continue;
        if (definitivelyAbsent.has(candidate.destination)) continue;
        if (
          candidate.destination === 'interest-questionnaire' &&
          Date.now() >= interestQuestionnaireProbeDeadline
        ) {
          // Interest questionnaire did not appear within its window; skip all
          // future probes (including the defer check) for this destination.
          definitivelyAbsent.add('interest-questionnaire');
          continue;
        }

        const t0 = Date.now();
        const visible = await isCandidateVisible(candidate.getElement);
        if (!visible) {
          if (tracking) recordFailedPollCommand(Date.now() - t0);
        } else {
          visibleCandidate = candidate;
          sheetFound = true;
          break;
        }
      }

      if (sheetFound) break;

      const walletCandidate = remaining.find(
        (candidate) => candidate.destination === 'wallet',
      );
      if (!walletCandidate) break;

      const walletT0 = Date.now();
      const walletVisible = await isCandidateVisible(walletCandidate.getElement);
      const walletElapsed = Date.now() - walletT0;

      if (!walletVisible) {
        if (tracking) recordFailedPollCommand(walletElapsed);
        if (tracking) addOverheadSleep(DESTINATION_POLL_INTERVAL_MS);
        await sleep(DESTINATION_POLL_INTERVAL_MS);
        continue;
      }

      // Wallet is visible. Defer if a sheet element is still in the hierarchy
      // (e.g. animating out after "Not now").
      let deferred = false;
      for (const sheet of remaining) {
        if (sheet.destination === 'wallet') continue;
        if (definitivelyAbsent.has(sheet.destination)) continue;
        const t0 = Date.now();
        try {
          const sheetEl = await sheet.getElement();
          const exists = await sheetEl.unwrap().isExisting();
          if (tracking) recordFailedPollCommand(Date.now() - t0);
          if (exists) {
            deferred = true;
            break;
          }
        } catch {
          // ignore probe errors
        }
      }

      if (!deferred) {
        // Wallet is confirmed visible with no sheets blocking.
        // recordFailedPollCommand for the wallet check is intentionally skipped
        // here — PlaywrightAssertions.expectElementToBeVisible below will
        // record success poll and probe RTT for overhead calibration.
        visibleCandidate = walletCandidate;
        break;
      }

      if (tracking) addOverheadSleep(DESTINATION_POLL_INTERVAL_MS);
      await sleep(DESTINATION_POLL_INTERVAL_MS);
    }
  });

  const resolvedCandidate = visibleCandidate;
  if (!resolvedCandidate) {
    throw new Error('No post-onboarding destination became visible');
  }

  // Final confirmation via PlaywrightAssertions provides probe RTT calibration
  // used to cap all preceding recordFailedPollCommand entries.
  await PlaywrightAssertions.expectElementToBeVisible(
    resolvedCandidate.getElement(),
    {
      description: `${POST_ONBOARDING_DESTINATION_LABELS[resolvedCandidate.destination]} should be visible`,
    },
  );

  return resolvedCandidate.destination;
};

const measurePostOnboardingDestination = async (
  timer: TimerHelper,
  dismissedDestinations: ReadonlySet<PostOnboardingDestination>,
): Promise<PostOnboardingDestination> => {
  let destination: PostOnboardingDestination | undefined;

  await timer.measure(async () => {
    destination = await waitForPostOnboardingDestination(dismissedDestinations);
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

      // Post-onboarding sheets (questionnaire / push / Predict) are A/B and
      // optional for this perf scenario. Core measured steps end at MetaMetrics;
      // failure to land on wallet here must not fail the test.
      const postOnboardingTimers: TimerHelper[] = [];
      let source: PostOnboardingSource = 'metametrics';
      const dismissedDestinations = new Set<PostOnboardingDestination>();
      let destination: PostOnboardingDestination | undefined;

      try {
        await MetaMetricsOptInView.tapAgreeButton();

        // Safety cap derived from POST_ONBOARDING_DESTINATIONS so adding a
        // new destination extends the cap automatically.
        for (
          let hop = 1;
          hop <= POST_ONBOARDING_DESTINATIONS.length &&
          destination !== 'wallet';
          hop += 1
        ) {
          // Predict is optional. Probe without waiting so an absent modal
          // cannot delay the start of the measured transition.
          await closePredictModal({ timeoutMs: 0 });

          const transitionTimer = new TimerHelper(
            `Fresh SRP post-onboarding transition ${hop}`,
            POST_ONBOARDING_THRESHOLD,
            currentDeviceDetails.platform,
          );
          destination = await measurePostOnboardingDestination(
            transitionTimer,
            dismissedDestinations,
          );

          // The modal can appear while the measured destination is becoming
          // visible. Close it after the timer as well, without adding another
          // measurement for the modal.
          await closePredictModal();

          transitionTimer.changeName(
            `Time since the user taps ${POST_ONBOARDING_SOURCE_LABELS[source]} until ${POST_ONBOARDING_DESTINATION_LABELS[destination]} is visible`,
          );
          postOnboardingTimers.push(transitionTimer);

          if (destination === 'wallet') {
            break;
          }

          // Interest/push may never appear; once we land on a later sheet,
          // mark prior destinations skipped so the next hop
          // short-circuits to a single-element wallet wait instead of
          // probing ghosts.
          markSkippedDestinationsBefore(dismissedDestinations, destination);
          await dismissPostOnboardingDestination(destination);
          dismissedDestinations.add(destination);
          source = destination;
        }

        if (destination === 'wallet') {
          performanceTracker.addTimers(...postOnboardingTimers);
        } else {
          logger.warn(
            `Fresh SRP post-onboarding did not reach wallet after ${postOnboardingTimers.length} hop(s); core MetaMetrics steps already passed`,
          );
        }
      } catch (error) {
        logger.warn(
          `Fresh SRP post-onboarding skipped (A/B sheets may hide wallet home): ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    },
  );
});
