import {
  createLogger,
  AppiumAssertions,
  sleep,
  type AppiumElement,
} from '../../../framework';
import {
  withImplicitWait,
  isOverheadTrackingActive,
  recordInfrastructureCommand,
  recordFailedPollCommand,
  addOverheadSleep,
} from '../../../framework/AppiumUtilities';
import TabBarComponent from '../../../page-objects/wallet/TabBarComponent';
import TimerHelper, {
  type PlatformThreshold,
} from '../../../framework/TimerHelper';
import MetaMetricsOptInView from '../../../page-objects/Onboarding/MetaMetricsOptInView';
import OnboardingInterestQuestionnaireView from '../../../page-objects/Onboarding/OnboardingInterestQuestionnaireView';
import PushNotificationOnboardingView from '../../../page-objects/Notifications/PushNotificationOnboardingView';
import { closePredictModal } from '../../../flows/wallet.flow';

/*
 * Post-onboarding hops of fresh-srp-wallet-creation.spec.ts (MetaMetrics
 * "Agree" -> optional questionnaire / push sheets -> usable wallet), shared by
 * the spec and its scenario.
 */
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
  'push-notification-existing-user',
  'wallet',
] as const;

type PostOnboardingDestination = (typeof POST_ONBOARDING_DESTINATIONS)[number];

type PostOnboardingSource =
  | 'metametrics'
  | Exclude<PostOnboardingDestination, 'wallet'>;

// Bases from Pixel 8 Pro dev-build runs on 2026-11-11. The gate adds 15%.
// The new-user push sheet did not appear; it uses the same base as the
// existing-user sheet, which is the same kind of transition.
const POST_ONBOARDING_THRESHOLDS: Record<
  PostOnboardingDestination,
  PlatformThreshold
> = {
  'interest-questionnaire': { ios: 2_500, android: 3_000 },
  'push-notification': { ios: 10_000, android: 10_000 },
  'push-notification-existing-user': { ios: 10_000, android: 10_000 },
  wallet: { ios: 3_500, android: 4_000 },
};

const POST_ONBOARDING_DESTINATION_LABELS: Record<
  PostOnboardingDestination,
  string
> = {
  'interest-questionnaire': 'onboarding interest questionnaire',
  'push-notification': 'push notification sheet',
  'push-notification-existing-user': 'personalized alerts sheet',
  wallet: 'usable wallet',
};

const POST_ONBOARDING_SOURCE_LABELS: Record<PostOnboardingSource, string> = {
  metametrics: '"Agree" on MetaMetrics',
  'interest-questionnaire': '"Skip" on the onboarding interest questionnaire',
  'push-notification': '"Not now" on the push notification sheet',
  'push-notification-existing-user':
    '"Not now" on the personalized alerts sheet',
};

// 0ms implicit wait: non-existent elements return immediately (just Appium RTT)
// instead of blocking for 300ms per probe. This matters on cloud Appium where
// each isExisting() call at 300ms + RTT inflates the timer by several seconds.
const DESTINATION_PROBE_IMPLICIT_WAIT_MS = 0;
const DESTINATION_POLL_INTERVAL_MS = 250;
const DESTINATION_POLL_TIMEOUT_MS = 30_000;
const OPTIONAL_DESTINATION_PROBE_TIMEOUT_MS = 1_000;

const isCandidatePresent = async (
  getElement: () => Promise<AppiumElement>,
  requireDisplayed: boolean,
): Promise<boolean> => {
  try {
    const el = await getElement();
    if (!(await el.unwrap().isExisting())) {
      return false;
    }
    // Bottom-sheet titles stay in the hierarchy while reporting
    // isDisplayed=false. Requiring displayed charges that wait to the timer.
    if (!requireDisplayed) {
      return true;
    }
    return await el.isVisible();
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
    getElement: () => Promise<AppiumElement>;
  }[] = [
    {
      destination: 'interest-questionnaire',
      getElement: () => OnboardingInterestQuestionnaireView.skipButton,
    },
    {
      destination: 'push-notification',
      getElement: () => PushNotificationOnboardingView.title,
    },
    {
      destination: 'push-notification-existing-user',
      getElement: () => PushNotificationOnboardingView.existingUserTitle,
    },
    {
      // Tab-bar Wallet button (matches import-wallet.spec.ts): usable home,
      // not just wallet shell mount.
      destination: 'wallet',
      getElement: () => TabBarComponent.tabBarWalletButton,
    },
  ];

  const remaining = candidates.filter(
    (candidate) => !dismissedDestinations.has(candidate.destination),
  );
  const optionalDestinationProbeStartedAt = new Map<
    Exclude<PostOnboardingDestination, 'wallet'>,
    number
  >();

  if (remaining.length === 0) {
    throw new Error('No post-onboarding destinations remain to wait for');
  }

  // Single remaining element: use AppiumAssertions for proper overhead
  // tracking instead of the multi-candidate polling loop.
  if (remaining.length === 1) {
    const only = remaining[0];
    const description = `${POST_ONBOARDING_DESTINATION_LABELS[only.destination]} should be visible`;
    if (only.destination === 'wallet') {
      await AppiumAssertions.expectElementToBeVisible(only.getElement(), {
        description,
      });
    } else {
      await AppiumAssertions.expectElementToExist(only.getElement(), {
        description,
      });
    }
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
        const probeStartedAt =
          optionalDestinationProbeStartedAt.get(candidate.destination) ??
          Date.now();
        optionalDestinationProbeStartedAt.set(
          candidate.destination,
          probeStartedAt,
        );
        if (
          Date.now() - probeStartedAt >=
          OPTIONAL_DESTINATION_PROBE_TIMEOUT_MS
        ) {
          // Optional sheet did not appear within its probe window.
          definitivelyAbsent.add(candidate.destination);
          continue;
        }

        const t0 = Date.now();
        const visible = await isCandidatePresent(candidate.getElement, false);
        if (!visible) {
          if (tracking) {
            // These optional UI probes are known infrastructure lookups when
            // absent. TestMu can spend several seconds resolving a
            // missing native element, so do not charge that RTT to the app.
            recordInfrastructureCommand(Date.now() - t0);
          }
          if (
            Date.now() - probeStartedAt >=
            OPTIONAL_DESTINATION_PROBE_TIMEOUT_MS
          ) {
            definitivelyAbsent.add(candidate.destination);
          }
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
      const walletVisible = await isCandidatePresent(
        walletCandidate.getElement,
        true,
      );
      const walletElapsed = Date.now() - walletT0;

      if (!walletVisible) {
        if (tracking) recordFailedPollCommand(walletElapsed);
        if (tracking) addOverheadSleep(DESTINATION_POLL_INTERVAL_MS);
        await sleep(DESTINATION_POLL_INTERVAL_MS);
        continue;
      }

      // Wallet is visible and no optional sheet was visible during the sheet
      // probes above. Avoid re-querying every sheet here: each extra Appium
      // command can add seconds to the measured transition on cloud devices.
      visibleCandidate = walletCandidate;
      break;
    }
  });

  const resolvedCandidate = visibleCandidate;
  if (!resolvedCandidate) {
    throw new Error('No post-onboarding destination became visible');
  }

  // Final confirmation via AppiumAssertions provides probe RTT calibration
  // used to cap all preceding recordFailedPollCommand entries.
  // Sheets are confirmed by existence: a bottom sheet can be on screen while
  // isDisplayed stays false.
  const description = `${POST_ONBOARDING_DESTINATION_LABELS[resolvedCandidate.destination]} should be visible`;
  if (resolvedCandidate.destination === 'wallet') {
    await AppiumAssertions.expectElementToBeVisible(
      resolvedCandidate.getElement(),
      { description },
    );
  } else {
    await AppiumAssertions.expectElementToExist(
      resolvedCandidate.getElement(),
      { description },
    );
  }

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
    case 'push-notification-existing-user':
      await PushNotificationOnboardingView.tapExistingUserNotNowButton();
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

/**
 * Taps "Agree" on MetaMetrics and measures each post-onboarding transition.
 * Post-onboarding sheets (questionnaire / push / Predict) are A/B and
 * optional: core measured steps end at MetaMetrics, so failing to land on the
 * wallet here never fails the test. Timers are added only when it is reached.
 */
export async function measureFreshSrpPostOnboarding(
  performanceTracker: { addTimers(...timers: TimerHelper[]): void },
  platform: 'ios' | 'android',
): Promise<void> {
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
      hop <= POST_ONBOARDING_DESTINATIONS.length && destination !== 'wallet';
      hop += 1
    ) {
      // Predict is optional. Probe without waiting so an absent modal
      // cannot delay the start of the measured transition.
      await closePredictModal({ timeoutMs: 1_000 });

      const transitionTimer = new TimerHelper(
        `Fresh SRP post-onboarding transition ${hop}`,
        undefined,
        platform,
      );
      destination = await measurePostOnboardingDestination(
        transitionTimer,
        dismissedDestinations,
      );
      transitionTimer.changeThreshold(POST_ONBOARDING_THRESHOLDS[destination]);

      // The modal can appear while the measured destination is becoming
      // visible. Close it after the timer as well, without adding another
      // measurement for the modal.
      await closePredictModal({ timeoutMs: 1_000 });

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
      // Only one push sheet is shown. Skip the other variant.
      if (destination === 'push-notification') {
        dismissedDestinations.add('push-notification-existing-user');
      }
      if (destination === 'push-notification-existing-user') {
        dismissedDestinations.add('push-notification');
      }
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
}
