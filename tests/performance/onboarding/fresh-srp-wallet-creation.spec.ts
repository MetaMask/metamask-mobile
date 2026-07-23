import { test as perfTest } from '../../framework/fixtures/playwright';
import {
  addOverhead,
  asPlaywrightElement,
  isOverheadTrackingActive,
  PlaywrightAssertions,
  PlaywrightGestures,
} from '../../framework';
import { OnboardingInterestQuestionnaireTestIds } from '../../../app/components/Views/OnboardingInterestQuestionnaire/OnboardingInterestQuestionnaire.testIds';
import { NewUserSheetSelectorsIDs } from '../../../app/components/Views/Notifications/PushNotificationOnboarding/NewUserSheet/NewUserSheet.testIds';
import { TabBarSelectorIDs } from '../../../app/components/Nav/Main/TabBar.testIds';
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

const waitForPostOnboardingDestination = async (
  appDriver: WebdriverIO.Browser,
  dismissedDestinations: ReadonlySet<PostOnboardingDestination>,
): Promise<PostOnboardingDestination> => {
  const candidates: {
    destination: PostOnboardingDestination;
    marker: string;
    getElement: () => ReturnType<typeof asPlaywrightElement>;
  }[] = [
    {
      destination: 'interest-questionnaire',
      marker: OnboardingInterestQuestionnaireTestIds.SKIP_BUTTON,
      getElement: () =>
        asPlaywrightElement(OnboardingInterestQuestionnaireView.skipButton),
    },
    {
      destination: 'push-notification',
      marker: NewUserSheetSelectorsIDs.TITLE,
      getElement: () =>
        asPlaywrightElement(PushNotificationOnboardingView.title),
    },
    {
      // Wait on the tab-bar Wallet button (matches import-wallet.spec.ts) so
      // the timer stops when the home experience is actually usable, not
      // just when the wallet shell mounts.
      destination: 'wallet',
      marker: TabBarSelectorIDs.WALLET,
      getElement: () => asPlaywrightElement(TabBarComponent.tabBarWalletButton),
    },
  ];

  let visibleCandidate: (typeof candidates)[number] | undefined;

  await appDriver.waitUntil(
    async () => {
      const probeStartedAt = Date.now();
      const pageSource = await appDriver.getPageSource();
      // Every getPageSource poll is Appium round-trip work, not app work —
      // account for the full probe so cumulative polling latency doesn't
      // inflate the measured transition duration. The `waitForDisplayed`
      // check below adds its own bounded probe on top.
      if (isOverheadTrackingActive()) {
        addOverhead(Date.now() - probeStartedAt);
      }
      visibleCandidate = candidates.find(
        (candidate) =>
          !dismissedDestinations.has(candidate.destination) &&
          pageSource.includes(candidate.marker),
      );
      return Boolean(visibleCandidate);
    },
    {
      timeout: 30_000,
      interval: 250,
      timeoutMsg: 'No post-onboarding destination became visible',
    },
  );

  const resolvedCandidate = visibleCandidate;
  if (!resolvedCandidate) {
    throw new Error('Post-onboarding destination was not resolved');
  }

  // `pageSource.includes(marker)` matches any occurrence in the hierarchy —
  // a mounted-but-covered route (e.g. Wallet behind a sheet) can win before
  // the topmost sheet is dismissed. Assert the specific candidate element is
  // actually displayed to guard against selecting a covered screen.
  // Note: expectElementToBeVisible internally accounts for probe overhead
  // where appropriate; do not wrap it in addOverhead here — that would also
  // subtract legitimate UI-wait time and under-report the transition.
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
