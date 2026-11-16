import { AppState, type AppStateStatus } from 'react-native';
import performance from 'react-native-performance';
import { getClient } from '@sentry/react-native';
import {
  getCachedConsent,
  getPerformanceTimestampOffset,
  TraceName,
  TraceOperation,
} from '../../util/trace';
import Logger from '../../util/Logger';
import StorageWrapper from '../../store/storage-wrapper';
import Routes from '../../constants/navigation/Routes';
import { STARTUP_JS_RELOAD } from '../../constants/storage';
import type { CredentialReadTimings } from '../SecureKeychain';
import { sendFinishedTransaction } from './finishedTransaction';
import {
  flagNextStartupAsJsReload,
  flushStartupStageSpans,
  getStartupKind,
  markStartup,
  noteStartupControllerInit,
  noteStartupCredentialRequest,
  noteStartupHandBack,
  noteStartupLeg2Ended,
  noteStartupRouteChange,
  noteStartupSeedlessPrecheck,
  resetStartupStageSpansForTesting,
  setStartupPersistedStateStats,
  setStartupStageData,
  setStartupStageTag,
  timeStartupStep,
  type StartupMark,
} from './startupStageSpans';

/** `Date.now()` while `performance.now()` reads 0. The fake timers move both. */
const mockClockBase = 1_700_000_000_000;
let mockFrozenNow: number | undefined;
let mockNativeMarks: Record<string, number> = {};
let mockReduxState: Record<string, unknown> = {};

jest.mock('react-native-performance', () => ({
  __esModule: true,
  default: {
    now: () => mockFrozenNow ?? Date.now() - mockClockBase,
    getEntriesByName: (name: string) =>
      mockNativeMarks[name] === undefined
        ? []
        : [{ startTime: mockNativeMarks[name] }],
  },
}));

jest.mock('../../util/trace', () => ({
  ...jest.requireActual('../../util/trace'),
  getCachedConsent: jest.fn(),
  getPerformanceTimestampOffset: jest.fn(),
}));

jest.mock('./finishedTransaction', () => ({
  sendFinishedTransaction: jest.fn(),
}));

jest.mock('../redux', () => ({
  __esModule: true,
  default: {
    get store() {
      return { getState: () => mockReduxState };
    },
  },
}));

jest.mock('../../util/Logger', () => ({
  error: jest.fn(),
  log: jest.fn(),
}));

const mockSend = jest.mocked(sendFinishedTransaction);
const mockGetCachedConsent = jest.mocked(getCachedConsent);
const mockGetOffset = jest.mocked(getPerformanceTimestampOffset);
const mockGetClient = jest.mocked(getClient);
const mockLoggerError = jest.mocked(Logger.error);
const mockLoggerLog = jest.mocked(Logger.log);
const mockStorage = jest.mocked(StorageWrapper);
const mockRemoveAppStateListener = jest.fn();

const OFFSET = 1_000_000;

const NATIVE_MARKS = {
  nativeLaunchStart: 100,
  nativeLaunchEnd: 400,
  runJsBundleStart: 450,
  runJsBundleEnd: 1_200,
};

/** The native marks on a clock that ran on for `aheadMs` while the device slept. */
const getNativeMarksAhead = (aheadMs: number) =>
  Object.fromEntries(
    Object.entries(NATIVE_MARKS).map(([name, time]) => [name, time + aheadMs]),
  );

type PerformanceWithStartupTiming = typeof globalThis.performance & {
  rnStartupTiming?: unknown;
};

/** What React Native reports as the bundle start on the `performance.now()` clock. */
const setJsClockBundleStart = (
  executeJavaScriptBundleEntryPointStart: number,
) =>
  Object.defineProperty(globalThis.performance, 'rnStartupTiming', {
    configurable: true,
    value: { executeJavaScriptBundleEntryPointStart },
  });

type TimedMark = readonly [StartupMark, number];

/** A cold start up to the splash fade-out, in the order startup reaches each mark. */
const MARKS_UP_TO_SPLASH: readonly TimedMark[] = [
  ['storeInitStart', 1_250],
  ['persistStart', 1_300],
  ['persistComplete', 1_600],
  ['navInitStart', 1_650],
  ['navReady', 1_800],
  ['engineStart', 1_850],
  ['nativeSplashHidden', 1_900],
  ['controllerStateLoaded', 2_000],
  ['engineEnd', 2_800],
  ['servicesReady', 2_850],
  ['appFirstCommit', 2_950],
];
const SPLASH_GONE_AT = 3_300;

/** The stages of that cold start with their start and end. */
const COLD_START_STAGES: readonly (readonly [TraceName, number, number])[] = [
  [TraceName.StartupNativeLaunch, 100, 400],
  [TraceName.StartupHostSetup, 400, 450],
  [TraceName.StartupJsBundleLoad, 450, 1_200],
  [TraceName.StartupPostBundleGap, 1_200, 1_250],
  [TraceName.StartupStoreInitialization, 1_250, 1_600],
  [TraceName.StartupReduxPersistRehydration, 1_300, 1_600],
  [TraceName.StartupPostStoreGap, 1_600, 1_650],
  [TraceName.StartupNavigationInitialization, 1_650, 1_800],
  [TraceName.StartupControllerStateRehydration, 1_850, 2_000],
  [TraceName.StartupEngineInitialization, 2_000, 2_800],
  [TraceName.StartupPostInitGap, 2_800, 2_850],
  [TraceName.StartupRootNavigatorFirstRender, 2_850, 2_950],
  [TraceName.StartupSplashRevealTax, 2_950, 3_300],
];

/** Tags on the root and every stage of a completed cold start. */
const SEGMENT_TAGS = {
  'startup.schema': '1',
  'startup.kind': 'cold',
  'startup.outcome': 'completed',
  'startup.legs_overlap': false,
  'wallet.account_bucket': '2-5',
};

let appStateListener: ((state: AppStateStatus) => void) | undefined;

const setCurrentAppState = (state: AppStateStatus) => {
  Object.defineProperty(AppState, 'currentState', {
    configurable: true,
    value: state,
    writable: true,
  });
};

const setWalletState = ({
  existingUser = true,
  isUnlocked = false,
  accountCount = 3,
} = {}) => {
  mockReduxState = {
    user: { existingUser },
    engine: {
      backgroundState: {
        KeyringController: { isUnlocked },
        AccountsController: {
          internalAccounts: {
            accounts: Object.fromEntries(
              Array.from({ length: accountCount }, (_, index) => [
                `account-${index}`,
                {},
              ]),
            ),
          },
        },
      },
    },
  };
};

const createClient = (enabled: boolean) =>
  ({ getOptions: () => ({ enabled }) }) as unknown as ReturnType<
    typeof getClient
  >;

/** Moves `performance.now()` to `time`, running the timers due on the way. */
const advanceTo = (time: number) => {
  jest.advanceTimersByTime(time - performance.now());
};

/** Runs `action` at `time`, then the evaluation it scheduled. */
const runAt = (time: number, action: () => void) => {
  advanceTo(time);
  action();
  jest.advanceTimersByTime(0);
};

const runMarks = (marks: readonly TimedMark[]) => {
  for (const [mark, time] of marks) {
    runAt(time, () => markStartup(mark));
  }
};

const reachSplashGone = () => {
  runMarks(MARKS_UP_TO_SPLASH);
  runAt(SPLASH_GONE_AT, () => markStartup('splashGone'));
};

const requestCredentialAt = (time: number): CredentialReadTimings => {
  const read: CredentialReadTimings = { requestedAt: time };
  runAt(time, () => noteStartupCredentialRequest(read));
  return read;
};

/** The native read returns; the recorder learns of it on its next evaluation. */
const returnCredentialAt = (
  read: CredentialReadTimings,
  time: number,
  empty = false,
) => {
  advanceTo(time);
  Object.assign(read, { returnedAt: time, empty });
};

const routeAt = (route: string, time: number) =>
  runAt(time, () => noteStartupRouteChange(['NavigationChildren', route]));

const changeAppStateAt = (state: AppStateStatus, time: number) =>
  runAt(time, () => appStateListener?.(state));

/** The unlock had its password at `handBackAt` and starts Unlock To Homepage Ready at `time`. */
const startUnlockToHomepageReadyAt = (time: number, handBackAt: number) =>
  runAt(time, () =>
    noteStartupHandBack(handBackAt, { leg2Started: true, leg2InFlight: true }),
  );

const endUnlockToHomepageReadyAt = (time: number) =>
  runAt(time, () => noteStartupLeg2Ended());

/**
 * The keychain read starts before the splash is gone and returns a password,
 * and the unlock's Unlock To Homepage Ready ends at 4.2s.
 */
const runKeychainUnlock = () => {
  runMarks(MARKS_UP_TO_SPLASH);
  const read = requestCredentialAt(3_100);
  runAt(SPLASH_GONE_AT, () => markStartup('splashGone'));
  returnCredentialAt(read, 3_500);
  startUnlockToHomepageReadyAt(3_550, 3_500);
  endUnlockToHomepageReadyAt(4_200);
};

/** The app lands on the Login screen after the splash. */
const runLoginStartup = () => {
  reachSplashGone();
  routeAt(Routes.ONBOARDING.LOGIN, 3_400);
};

const findRoot = () => mockSend.mock.calls[0]?.[0];
const getRoot = () => {
  const root = findRoot();
  if (!root) {
    throw new Error('The startup was not sent');
  }
  return root;
};
const getStages = () => mockSend.mock.calls[0]?.[1] ?? [];
const getStage = (name: TraceName) =>
  getStages().find((stage) => stage.name === name);

describe('startupStageSpans', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.useFakeTimers({ now: mockClockBase });
    resetStartupStageSpansForTesting();
    mockFrozenNow = undefined;
    mockNativeMarks = { ...NATIVE_MARKS };
    setWalletState();
    setCurrentAppState('active');
    appStateListener = undefined;
    jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation((_event, listener) => {
        appStateListener = listener;
        return { remove: mockRemoveAppStateListener };
      });
    mockGetCachedConsent.mockReturnValue(true);
    mockGetOffset.mockReturnValue(OFFSET);
    mockGetClient.mockReturnValue(createClient(true));
    mockStorage.getItemSync.mockReturnValue(null);
    mockStorage.removeItem.mockResolvedValue(undefined);
    mockStorage.setItem.mockResolvedValue(undefined);
  });

  afterEach(() => {
    resetStartupStageSpansForTesting();
    delete (globalThis.performance as PerformanceWithStartupTiming)
      .rnStartupTiming;
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('sent spans', () => {
    it('sends the startup as a root span from the native launch', () => {
      runKeychainUnlock();

      expect(getRoot()).toEqual({
        name: TraceName.StartupColdStartToUnlockReady,
        op: TraceOperation.StartupColdStart,
        startTime: OFFSET + 100,
        endTime: OFFSET + SPLASH_GONE_AT,
        tags: {
          ...SEGMENT_TAGS,
          'startup.end_bound_by': 'splash',
          'startup.awaiting_user_via': 'credential_request',
          'startup.credential_read': 'returned',
          'startup.leg2': 'started',
        },
        data: {
          'startup.duration_ms': 3_200,
          'startup.unattributed_ms': 50,
          'startup.stage.native_launch_ms': 300,
          'startup.stage.host_setup_ms': 50,
          'startup.stage.js_bundle_load_ms': 750,
          'startup.stage.post_bundle_gap_ms': 50,
          'startup.stage.store_initialization_ms': 350,
          'startup.stage.redux_persist_rehydration_ms': 300,
          'startup.stage.post_store_gap_ms': 50,
          'startup.stage.navigation_initialization_ms': 150,
          'startup.stage.controller_state_rehydration_ms': 150,
          'startup.stage.engine_initialization_ms': 800,
          'startup.stage.post_init_gap_ms': 50,
          'startup.stage.root_navigator_first_render_ms': 100,
          'startup.stage.splash_reveal_tax_ms': 350,
          'startup.stage.unlock_prompt_delay_ms': 0,
          'startup.js_bundle_run_ms': 750,
          'startup.native_splash_hidden_ms': 1_800,
          'startup.services_ready_ms': 2_750,
          'startup.splash_gone_ms': 3_200,
          'startup.credential_requested_ms': 3_000,
          'startup.awaiting_user_ms': 3_000,
          'startup.hand_back_ms': 3_400,
          'startup.auth_handoff_ms': 250,
          'wallet.account_count': 3,
          'startup.clock_drift_ms': 0,
        },
      });
    });

    it('sends one child span per stage between its marks, nested under its parent stage', () => {
      runKeychainUnlock();

      const storeInitializationIndex = COLD_START_STAGES.findIndex(
        ([name]) => name === TraceName.StartupStoreInitialization,
      );
      expect(getStages()).toEqual(
        COLD_START_STAGES.map(([name, start, end]) => ({
          name,
          op: TraceOperation.StartupStage,
          startTime: OFFSET + start,
          endTime: OFFSET + end,
          tags: SEGMENT_TAGS,
          data: {},
          parent:
            name === TraceName.StartupReduxPersistRehydration
              ? storeInitializationIndex
              : undefined,
        })),
      );
    });

    it('converts the marks with the trace clock offset read when it sends the startup', () => {
      reachSplashGone();
      mockGetOffset.mockReturnValue(OFFSET + 40);

      routeAt(Routes.ONBOARDING.LOGIN, 3_400);

      expect(getRoot()).toEqual(
        expect.objectContaining({
          startTime: OFFSET + 40 + 100,
          endTime: OFFSET + 40 + 3_400,
          data: expect.objectContaining({ 'startup.clock_drift_ms': 40 }),
        }),
      );
    });

    it('sends the startup once and ignores later calls', () => {
      runKeychainUnlock();
      mockSend.mockClear();

      runAt(5_000, () => markStartup('splashGone'));
      routeAt(Routes.ONBOARDING.HOME_NAV, 5_100);
      runAt(5_200, () =>
        noteStartupHandBack(5_200, { leg2Started: true, leg2InFlight: false }),
      );
      flushStartupStageSpans();
      advanceTo(60_000);

      expect(mockSend).not.toHaveBeenCalled();
      expect(jest.getTimerCount()).toBe(0);
      expect(mockRemoveAppStateListener).toHaveBeenCalledTimes(1);
    });
  });

  describe('end of startup', () => {
    it('ends when a keychain read still pending after 2 seconds started, after the splash', () => {
      reachSplashGone();
      requestCredentialAt(3_600);

      advanceTo(5_599);
      expect(findRoot()).toBeUndefined();
      advanceTo(5_600);

      expect(getRoot().tags).toEqual(
        expect.objectContaining({
          'startup.outcome': 'completed',
          'startup.end_bound_by': 'awaiting_user',
          'startup.awaiting_user_via': 'credential_request',
          'startup.credential_read': 'unresolved',
          'startup.leg2': 'not_applicable',
        }),
      );
      expect(getRoot().data).toEqual(
        expect.objectContaining({
          'startup.duration_ms': 3_500,
          'startup.stage.unlock_prompt_delay_ms': 300,
        }),
      );
      expect(getStage(TraceName.StartupUnlockPromptDelay)?.startTime).toBe(
        OFFSET + SPLASH_GONE_AT,
      );
      expect(getRoot().endTime).toBe(OFFSET + 3_600);
    });

    it('ends at the route that follows an empty keychain read', () => {
      reachSplashGone();
      const read = requestCredentialAt(3_400);
      returnCredentialAt(read, 3_450, true);

      routeAt(Routes.ONBOARDING.LOGIN, 3_500);

      expect(getRoot().tags).toEqual(
        expect.objectContaining({
          'startup.end_bound_by': 'awaiting_user',
          'startup.awaiting_user_via': 'route:Login',
          'startup.credential_read': 'empty',
          'startup.first_route': 'Login',
        }),
      );
      expect(getRoot().data).toEqual(
        expect.objectContaining({
          'startup.duration_ms': 3_400,
          'startup.empty_read_ms': 50,
          'startup.credential_requested_ms': 3_300,
          'startup.awaiting_user_ms': 3_400,
          'startup.first_route_ms': 3_400,
          'startup.first_route_vs_splash_ms': 200,
          'startup.auth_handoff_ms': 650,
          'startup.stage.unlock_prompt_delay_ms': 200,
        }),
      );
    });

    it('ends at the keychain request when no route follows an empty read within 2 seconds', () => {
      reachSplashGone();
      const read = requestCredentialAt(3_400);
      returnCredentialAt(read, 3_450, true);

      advanceTo(5_449);
      expect(findRoot()).toBeUndefined();
      advanceTo(5_450);

      expect(getRoot().tags).toEqual(
        expect.objectContaining({
          'startup.awaiting_user_via': 'credential_request',
          'startup.credential_read': 'empty',
        }),
      );
      expect(getRoot().data).toEqual(
        expect.objectContaining({ 'startup.duration_ms': 3_300 }),
      );
    });

    it('ends at the first route for a new user', () => {
      setWalletState({ existingUser: false, accountCount: 0 });
      reachSplashGone();

      routeAt(Routes.ONBOARDING.ROOT_NAV, 3_350);

      expect(getRoot().tags).toEqual(
        expect.objectContaining({
          'startup.outcome': 'new_user',
          'startup.awaiting_user_via': 'route:OnboardingRootNav',
          'startup.first_route': 'OnboardingRootNav',
          'startup.credential_read': 'none',
          'startup.leg2': 'not_applicable',
          'wallet.account_bucket': '0',
        }),
      );
      expect(getRoot().data).toEqual(
        expect.objectContaining({
          'startup.duration_ms': 3_250,
          'wallet.account_count': 0,
        }),
      );
    });

    it('skips the splash route when finding the first route', () => {
      runMarks(MARKS_UP_TO_SPLASH);
      runAt(3_050, () => {
        noteStartupRouteChange(['NavigationChildren', Routes.FOX_LOADER]);
        noteStartupRouteChange(['NavigationChildren']);
      });
      routeAt(Routes.ONBOARDING.LOGIN, 3_100);

      runAt(SPLASH_GONE_AT, () => markStartup('splashGone'));

      expect(getRoot().tags).toEqual(
        expect.objectContaining({
          'startup.end_bound_by': 'splash',
          'startup.awaiting_user_via': 'route:Login',
          'startup.first_route': 'Login',
        }),
      );
      expect(getRoot().data).toEqual(
        expect.objectContaining({
          'startup.first_route_ms': 3_000,
          'startup.first_route_vs_splash_ms': -200,
        }),
      );
    });

    it('ends as an auth timeout when the app does not wait on the user within 15 seconds of the splash', () => {
      reachSplashGone();

      advanceTo(18_299);
      expect(findRoot()).toBeUndefined();
      advanceTo(18_300);

      expect(getRoot().tags).toEqual(
        expect.objectContaining({
          'startup.outcome': 'auth_timeout',
          'startup.awaiting_user_via': 'timeout',
          'startup.end_bound_by': 'splash',
        }),
      );
      expect(getRoot().data).not.toHaveProperty('startup.awaiting_user_ms');
      expect(getRoot().endTime).toBe(OFFSET + SPLASH_GONE_AT);
    });

    it('sends the startup when its deadline fires even if the clock reads earlier', () => {
      reachSplashGone();
      mockFrozenNow = SPLASH_GONE_AT;

      jest.advanceTimersByTime(15_000);

      expect(getRoot().tags).toEqual(
        expect.objectContaining({ 'startup.outcome': 'auth_timeout' }),
      );
      expect(jest.getTimerCount()).toBe(0);
    });
  });

  describe('Unlock To Homepage Ready', () => {
    it('waits for Unlock To Homepage Ready to end before sending the startup', () => {
      runMarks(MARKS_UP_TO_SPLASH);
      const read = requestCredentialAt(3_100);
      runAt(SPLASH_GONE_AT, () => markStartup('splashGone'));
      returnCredentialAt(read, 3_500);
      startUnlockToHomepageReadyAt(3_550, 3_500);

      advanceTo(4_199);
      expect(findRoot()).toBeUndefined();
      endUnlockToHomepageReadyAt(4_200);

      expect(getRoot().tags).toEqual(
        expect.objectContaining({ 'startup.leg2': 'started' }),
      );
    });

    it('waits for the hand-back once the keychain returned a password', () => {
      runMarks(MARKS_UP_TO_SPLASH);
      const read = requestCredentialAt(3_100);
      returnCredentialAt(read, 3_200);
      runAt(SPLASH_GONE_AT, () => markStartup('splashGone'));

      advanceTo(3_400);
      expect(findRoot()).toBeUndefined();
      startUnlockToHomepageReadyAt(3_400, 3_200);
      endUnlockToHomepageReadyAt(3_900);

      expect(getRoot().tags).toEqual(
        expect.objectContaining({ 'startup.legs_overlap': true }),
      );
      expect(getRoot().data).toEqual(
        expect.objectContaining({ 'startup.hand_back_ms': 3_100 }),
      );
    });

    it('stops waiting for Unlock To Homepage Ready after 15 seconds', () => {
      runMarks(MARKS_UP_TO_SPLASH);
      const read = requestCredentialAt(3_100);
      runAt(SPLASH_GONE_AT, () => markStartup('splashGone'));
      returnCredentialAt(read, 3_500);
      startUnlockToHomepageReadyAt(3_550, 3_500);

      advanceTo(18_549);
      expect(findRoot()).toBeUndefined();
      advanceTo(18_550);

      expect(getRoot().tags).toEqual(
        expect.objectContaining({ 'startup.leg2': 'started' }),
      );
      expect(getRoot().endTime).toBe(OFFSET + SPLASH_GONE_AT);
    });

    it.each([
      { keyring: 'unlocked', isUnlocked: true, leg2: 'missing' },
      { keyring: 'locked', isUnlocked: false, leg2: 'not_applicable' },
    ])(
      'tags a startup without Unlock To Homepage Ready and a $keyring keyring as $leg2',
      ({ isUnlocked, leg2 }) => {
        setWalletState({ isUnlocked });

        reachSplashGone();
        routeAt(Routes.ONBOARDING.HOME_NAV, 3_400);

        expect(getRoot().tags).toEqual(
          expect.objectContaining({ 'startup.leg2': leg2 }),
        );
      },
    );
  });

  describe('backgrounded', () => {
    it('ends a startup that went to the background before the splash was gone', () => {
      runMarks(MARKS_UP_TO_SPLASH);

      changeAppStateAt('background', 3_100);

      expect(getRoot().tags).toEqual(
        expect.objectContaining({
          'startup.outcome': 'backgrounded',
          'startup.end_bound_by': 'background',
          'startup.backgrounded_during': 'startup',
          'startup.open_stages': 'splash_reveal_tax',
          'startup.awaiting_user_via': 'none',
          'startup.credential_read': 'none',
          'startup.leg2': 'not_applicable',
        }),
      );
      expect(getRoot().data).toEqual(
        expect.objectContaining({ 'startup.duration_ms': 3_000 }),
      );
      expect(getRoot().data).not.toHaveProperty(
        'startup.stage.splash_reveal_tax_ms',
      );
      expect(getStage(TraceName.StartupSplashRevealTax)).toBeUndefined();
      expect(getRoot().endTime).toBe(OFFSET + 3_100);
      expect(mockRemoveAppStateListener).toHaveBeenCalledTimes(1);
    });

    it('notes a background during the keychain read before the splash was gone', () => {
      runMarks(MARKS_UP_TO_SPLASH);
      requestCredentialAt(3_100);

      changeAppStateAt('background', 3_200);

      expect(getRoot().tags).toEqual(
        expect.objectContaining({
          'startup.outcome': 'backgrounded',
          'startup.backgrounded_during': 'credential_read',
          'startup.credential_read': 'unresolved',
        }),
      );
    });

    it('counts the Android device credential screen as waiting on the user', () => {
      reachSplashGone();
      requestCredentialAt(3_400);

      changeAppStateAt('background', 3_500);

      expect(getRoot().tags).toEqual(
        expect.objectContaining({
          'startup.outcome': 'completed',
          'startup.end_bound_by': 'awaiting_user',
          'startup.awaiting_user_via': 'credential_request',
        }),
      );
      expect(getRoot().tags).not.toHaveProperty('startup.backgrounded_during');
      expect(getRoot().endTime).toBe(OFFSET + 3_400);
    });

    it('keeps waiting while the app is inactive behind a biometric prompt', () => {
      reachSplashGone();
      requestCredentialAt(3_400);

      changeAppStateAt('inactive', 3_450);
      advanceTo(5_399);
      expect(findRoot()).toBeUndefined();
      advanceTo(5_400);

      expect(getRoot().tags).toEqual(
        expect.objectContaining({ 'startup.outcome': 'completed' }),
      );
    });
  });

  describe('startup kind', () => {
    it('reports cold before startup is recorded', () => {
      expect(getStartupKind()).toBe('cold');
    });

    it('is a background launch when the app was not in the foreground before its services were ready', () => {
      setCurrentAppState('background');
      runMarks(MARKS_UP_TO_SPLASH);
      expect(getStartupKind()).toBe('background_launch');

      changeAppStateAt('active', 5_000);
      runAt(5_300, () => markStartup('splashGone'));
      routeAt(Routes.ONBOARDING.LOGIN, 5_400);

      expect(getRoot().tags).toEqual(
        expect.objectContaining({ 'startup.kind': 'background_launch' }),
      );
      expect(getStartupKind()).toBe('background_launch');
    });

    it('is cold when the app came to the foreground before its services were ready', () => {
      setCurrentAppState('background');
      const [firstMark, ...laterMarks] = MARKS_UP_TO_SPLASH;
      runMarks([firstMark]);
      changeAppStateAt('active', 1_260);
      runMarks(laterMarks);
      runAt(SPLASH_GONE_AT, () => markStartup('splashGone'));

      routeAt(Routes.ONBOARDING.LOGIN, 3_400);

      expect(getRoot().tags).toEqual(
        expect.objectContaining({ 'startup.kind': 'cold' }),
      );
    });

    it('is a JS reload when the previous runtime flagged one', () => {
      mockStorage.getItemSync.mockReturnValue(String(mockClockBase));

      runLoginStartup();

      expect(mockStorage.getItemSync).toHaveBeenCalledWith(STARTUP_JS_RELOAD);
      expect(mockStorage.removeItem).toHaveBeenCalledWith(STARTUP_JS_RELOAD);
      expect(getRoot()).toEqual(
        expect.objectContaining({
          startTime: OFFSET + 1_250,
          tags: expect.objectContaining({ 'startup.kind': 'js_reload' }),
          data: expect.objectContaining({ 'startup.duration_ms': 2_150 }),
        }),
      );
      expect(getRoot().tags).not.toHaveProperty('startup.anchor_suspect');
      expect(getRoot().data).not.toHaveProperty(
        'startup.stage.native_launch_ms',
      );
      expect(getStages()[0]?.name).toBe(TraceName.StartupStoreInitialization);
      expect(getStartupKind()).toBe('js_reload');
    });

    it('ignores a reload flag older than a minute', () => {
      mockStorage.getItemSync.mockReturnValue(String(mockClockBase - 60_000));

      runLoginStartup();

      expect(mockStorage.removeItem).toHaveBeenCalledWith(STARTUP_JS_RELOAD);
      expect(getRoot().tags).toEqual(
        expect.objectContaining({ 'startup.kind': 'cold' }),
      );
    });

    it('flags the next startup as a JS reload', () => {
      advanceTo(4_000);

      flagNextStartupAsJsReload();

      expect(mockStorage.setItem).toHaveBeenCalledWith(
        STARTUP_JS_RELOAD,
        String(mockClockBase + 4_000),
      );
    });
  });

  describe('native marks', () => {
    it('starts at the first JS mark when native marks are missing', () => {
      mockNativeMarks = { nativeLaunchStart: 100 };

      runLoginStartup();

      expect(getRoot()).toEqual(
        expect.objectContaining({
          startTime: OFFSET + 1_250,
          tags: expect.objectContaining({
            'startup.anchor_suspect': 'missing_native_marks',
          }),
          data: expect.objectContaining({ 'startup.duration_ms': 2_150 }),
        }),
      );
      expect(getStages()[0]?.name).toBe(TraceName.StartupStoreInitialization);
    });

    it('moves native marks onto the performance.now() clock with the bundle start React Native reports', () => {
      mockNativeMarks = getNativeMarksAhead(50_000);
      setJsClockBundleStart(NATIVE_MARKS.runJsBundleStart);

      runKeychainUnlock();

      expect(getRoot()).toEqual(
        expect.objectContaining({
          startTime: OFFSET + 100,
          data: expect.objectContaining({
            'startup.duration_ms': 3_200,
            'startup.unattributed_ms': 50,
            'startup.native_clock_offset_ms': 50_000,
            'startup.stage.native_launch_ms': 300,
            'startup.stage.js_bundle_load_ms': 750,
          }),
        }),
      );
      expect(getRoot().tags).not.toHaveProperty('startup.anchor_suspect');
      expect(getStage(TraceName.StartupJsBundleLoad)).toEqual(
        expect.objectContaining({
          startTime: OFFSET + 450,
          endTime: OFFSET + 1_200,
        }),
      );
    });

    it('starts at the first JS mark when the bundle seems to start after it', () => {
      mockNativeMarks = getNativeMarksAhead(50_000);

      runLoginStartup();

      expect(getRoot()).toEqual(
        expect.objectContaining({
          startTime: OFFSET + 1_250,
          tags: expect.objectContaining({
            'startup.anchor_suspect': 'native_marks_after_js',
          }),
          data: expect.objectContaining({ 'startup.duration_ms': 2_150 }),
        }),
      );
      expect(getRoot().data).not.toHaveProperty('startup.js_bundle_run_ms');
      expect(getStages()[0]?.name).toBe(TraceName.StartupStoreInitialization);
    });

    it('keeps the native marks as recorded when React Native cannot report the bundle start', () => {
      Object.defineProperty(globalThis.performance, 'rnStartupTiming', {
        configurable: true,
        get: () => {
          throw new Error('NativePerformance is unavailable');
        },
      });

      runLoginStartup();

      expect(getRoot().startTime).toBe(OFFSET + 100);
      expect(getRoot().data).not.toHaveProperty(
        'startup.native_clock_offset_ms',
      );
      expect(mockLoggerError).not.toHaveBeenCalled();
    });

    it('ends the bundle stage where the store starts when the store starts first', () => {
      mockNativeMarks = { ...NATIVE_MARKS, runJsBundleEnd: 1_400 };

      runKeychainUnlock();

      expect(getStage(TraceName.StartupJsBundleLoad)).toEqual(
        expect.objectContaining({
          startTime: OFFSET + 450,
          endTime: OFFSET + 1_250,
        }),
      );
      expect(getStage(TraceName.StartupPostBundleGap)).toBeUndefined();
      expect(getRoot().tags).not.toHaveProperty('startup.anchor_suspect');
      expect(getRoot().tags).not.toHaveProperty('startup.order_violations');
      expect(getRoot().data).toEqual(
        expect.objectContaining({
          'startup.stage.js_bundle_load_ms': 800,
          'startup.stage.post_bundle_gap_ms': 0,
          'startup.js_bundle_run_ms': 950,
          'startup.unattributed_ms': 50,
        }),
      );
    });

    it('flags native marks that are out of order and the stages they break', () => {
      mockNativeMarks = { ...NATIVE_MARKS, nativeLaunchEnd: 500 };

      runLoginStartup();

      expect(getRoot().tags).toEqual(
        expect.objectContaining({
          'startup.anchor_suspect': 'native_marks_out_of_order',
          'startup.order_violations': 'host_setup,js_bundle_load',
        }),
      );
      expect(getRoot().data).toEqual(
        expect.objectContaining({
          'startup.stage.native_launch_ms': 400,
          'startup.stage.host_setup_ms': 0,
        }),
      );
    });

    it('flags a host setup over 30 seconds, as after an iOS prewarm', () => {
      mockNativeMarks = {
        ...NATIVE_MARKS,
        nativeLaunchStart: -40_000,
        nativeLaunchEnd: -39_700,
      };

      runLoginStartup();

      expect(getRoot()).toEqual(
        expect.objectContaining({
          startTime: OFFSET - 40_000,
          tags: expect.objectContaining({
            'startup.anchor_suspect': 'host_setup_over_30s',
          }),
          data: expect.objectContaining({
            'startup.stage.host_setup_ms': 40_150,
          }),
        }),
      );
    });
  });

  describe('stage details', () => {
    it('adds step timings and tags to their stage, keeping the first value', () => {
      const [firstMark, ...laterMarks] = MARKS_UP_TO_SPLASH;
      runMarks([firstMark]);
      setStartupStageData(
        'store_initialization',
        'startup.store.configure_ms',
        12.4,
      );
      setStartupStageData(
        'store_initialization',
        'startup.store.configure_ms',
        99,
      );
      const stopRootSaga = timeStartupStep(
        'store_initialization',
        'startup.store.root_saga_ms',
      );
      advanceTo(1_280);
      stopRootSaga();
      setStartupStageTag(
        'splash_reveal_tax',
        'startup.splash.example',
        'first',
      );
      setStartupStageTag(
        'splash_reveal_tax',
        'startup.splash.example',
        'second',
      );
      runMarks(laterMarks);
      runAt(SPLASH_GONE_AT, () => markStartup('splashGone'));
      routeAt(Routes.ONBOARDING.LOGIN, 3_400);

      expect(getStage(TraceName.StartupStoreInitialization)?.data).toEqual({
        'startup.store.configure_ms': 12,
        'startup.store.root_saga_ms': 30,
      });
      expect(getStage(TraceName.StartupSplashRevealTax)?.tags).toEqual({
        ...SEGMENT_TAGS,
        'startup.splash.example': 'first',
      });
      expect(getStage(TraceName.StartupNavigationInitialization)?.tags).toEqual(
        SEGMENT_TAGS,
      );
    });

    it('adds the persisted state to controller state rehydration', () => {
      runMarks(MARKS_UP_TO_SPLASH.slice(0, 6));
      setStartupPersistedStateStats({
        chars: 2_500_000,
        parseMs: 42.6,
        controllers: 40,
        largestController: 'TransactionController',
        largestChars: 1_200_000,
      });
      setStartupPersistedStateStats({
        chars: 1,
        parseMs: 1,
        controllers: 1,
        largestChars: 1,
      });
      runMarks(MARKS_UP_TO_SPLASH.slice(6));
      runAt(SPLASH_GONE_AT, () => markStartup('splashGone'));
      routeAt(Routes.ONBOARDING.LOGIN, 3_400);

      const stage = getStage(TraceName.StartupControllerStateRehydration);
      expect(stage?.data).toEqual({
        'startup.persisted_state.chars': 2_500_000,
        'startup.persisted_state.parse_ms': 43,
        'startup.persisted_state.controllers': 40,
        'startup.persisted_state.largest_chars': 1_200_000,
      });
      expect(stage?.tags).toEqual({
        ...SEGMENT_TAGS,
        'startup.state_size_bucket': '1MB-5MB',
        'startup.persisted_state.largest_controller': 'TransactionController',
      });
      expect(getRoot().tags).toEqual(
        expect.objectContaining({ 'startup.state_size_bucket': '1MB-5MB' }),
      );
    });

    it('adds the slowest controller inits of the engine start to engine initialization', () => {
      runMarks(MARKS_UP_TO_SPLASH.slice(0, 5));
      noteStartupControllerInit('BeforeEngineStart', 500);
      runMarks(MARKS_UP_TO_SPLASH.slice(5, 8));
      for (let index = 0; index < 10; index += 1) {
        noteStartupControllerInit(`Controller${index}`, (index + 1) * 10);
      }
      runMarks(MARKS_UP_TO_SPLASH.slice(8));
      noteStartupControllerInit('AfterEngineEnd', 900);
      runAt(SPLASH_GONE_AT, () => markStartup('splashGone'));
      routeAt(Routes.ONBOARDING.LOGIN, 3_400);

      expect(getStage(TraceName.StartupEngineInitialization)?.data).toEqual({
        'startup.engine.controllers': 10,
        'startup.engine.controllers_ms': 550,
        'startup.engine.controller.Controller9_ms': 100,
        'startup.engine.controller.Controller8_ms': 90,
        'startup.engine.controller.Controller7_ms': 80,
        'startup.engine.controller.Controller6_ms': 70,
        'startup.engine.controller.Controller5_ms': 60,
        'startup.engine.controller.Controller4_ms': 50,
        'startup.engine.controller.Controller3_ms': 40,
        'startup.engine.controller.Controller2_ms': 30,
      });
    });

    it('adds the seedless precheck once it has both marks', () => {
      runMarks(MARKS_UP_TO_SPLASH);
      noteStartupSeedlessPrecheck({ startedAt: 2_860 });
      noteStartupSeedlessPrecheck({ startedAt: 2_860, endedAt: 2_905.4 });
      noteStartupSeedlessPrecheck({ startedAt: 0, endedAt: 1_000 });
      runAt(SPLASH_GONE_AT, () => markStartup('splashGone'));

      routeAt(Routes.ONBOARDING.LOGIN, 3_400);

      expect(getRoot().data).toEqual(
        expect.objectContaining({ 'startup.seedless_precheck_ms': 45 }),
      );
    });

    it('keeps the first time startup reaches a mark', () => {
      runMarks(MARKS_UP_TO_SPLASH);
      runAt(3_100, () => markStartup('navReady'));
      runAt(SPLASH_GONE_AT, () => markStartup('splashGone'));

      routeAt(Routes.ONBOARDING.LOGIN, 3_400);

      expect(getRoot().data).toEqual(
        expect.objectContaining({
          'startup.stage.navigation_initialization_ms': 150,
        }),
      );
    });
  });

  describe('consent', () => {
    it('holds the startup until consent is known, then sends it once', () => {
      mockGetCachedConsent.mockReturnValue(null);
      runKeychainUnlock();
      flushStartupStageSpans();
      expect(mockSend).not.toHaveBeenCalled();

      mockGetCachedConsent.mockReturnValue(true);
      flushStartupStageSpans();
      flushStartupStageSpans();

      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('drops the startup when consent is declined', () => {
      mockGetCachedConsent.mockReturnValue(false);
      runKeychainUnlock();

      mockGetCachedConsent.mockReturnValue(true);
      flushStartupStageSpans();

      expect(mockSend).not.toHaveBeenCalled();
    });

    it.each([
      { state: 'not set up', client: undefined },
      { state: 'disabled', client: createClient(false) },
    ])('holds the startup while the Sentry client is $state', ({ client }) => {
      mockGetClient.mockReturnValue(client);
      runKeychainUnlock();
      expect(mockSend).not.toHaveBeenCalled();

      mockGetClient.mockReturnValue(createClient(true));
      flushStartupStageSpans();

      expect(findRoot()).toBeDefined();
    });
  });

  describe('failures', () => {
    it('logs instead of throwing when sending the startup fails', () => {
      const error = new Error('Sentry failed');
      mockSend.mockImplementation(() => {
        throw error;
      });

      expect(runKeychainUnlock).not.toThrow();
      expect(mockLoggerError).toHaveBeenCalledWith(
        error,
        'Startup stage spans failed',
      );
    });

    it('logs instead of throwing on unexpected input', () => {
      expect(() =>
        noteStartupRouteChange(undefined as unknown as string[]),
      ).not.toThrow();
      expect(mockLoggerError).toHaveBeenCalledWith(
        expect.any(TypeError),
        'Startup stage spans failed',
      );
    });
  });

  describe('summary', () => {
    const devGlobal = global as unknown as { __DEV__: boolean };
    const isDev = devGlobal.__DEV__;

    afterEach(() => {
      devGlobal.__DEV__ = isDev;
    });

    it('prints the stages in dev builds', () => {
      devGlobal.__DEV__ = true;

      runKeychainUnlock();

      expect(mockLoggerLog).toHaveBeenCalledTimes(1);
      const [summary] = mockLoggerLog.mock.calls[0];
      expect(summary).toContain(
        '[startup] Cold Start To Unlock Ready: 3200ms (kind: cold, outcome: completed, ends at: splash)',
      );
      expect(summary).toContain('\n  native_launch: 300ms');
      expect(summary).toContain('\n    redux_persist_rehydration: 300ms');
      expect(summary).toContain('\n  unattributed: 50ms');
    });

    it('prints nothing in release builds', () => {
      devGlobal.__DEV__ = false;

      runKeychainUnlock();

      expect(mockLoggerLog).not.toHaveBeenCalled();
    });
  });
});
