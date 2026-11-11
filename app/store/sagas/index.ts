import {
  fork,
  take,
  put,
  call,
  all,
  select,
  race,
  delay,
  join,
  spawn,
} from 'redux-saga/effects';
import NavigationService from '../../core/NavigationService';
import Routes from '../../constants/navigation/Routes';
import {
  setAppServicesReady,
  UserActionType,
  LoginAction,
  CheckForDeeplinkAction,
} from '../../actions/user';
import { NavigationActionType } from '../../actions/navigation';
import { Task } from 'redux-saga';
import Engine from '../../core/Engine';
import Logger from '../../util/Logger';
import AppLockService from '../../core/AppLock/AppLockService';
import {
  overrideXMLHttpRequest,
  restoreXMLHttpRequest,
} from './xmlHttpRequestOverride';
import EngineService from '../../core/EngineService';
import { AppStateEventProcessor } from '../../core/AppStateEventListener';
import SharedDeeplinkManager from '../../core/DeeplinkManager/DeeplinkManager';
import { consumeNextParseAppStartType } from '../../core/DeeplinkManager/utils/startupDeeplinkNavigation';
import { getUnlockAppStartType } from '../../core/Performance/unlockTraces';
import {
  markStartup,
  timeStartupStep,
} from '../../core/Performance/startupStageSpans';
import AppConstants from '../../core/AppConstants';
import {
  CLEAR_ONBOARDING,
  SET_COMPLETED_ONBOARDING,
  SetCompletedOnboardingAction,
} from '../../actions/onboarding';
import { selectCompletedOnboarding } from '../../selectors/onboarding';
import { applyVaultInitialization } from '../../util/generateSkipOnboardingState';
import { hydrateSocialTermsAcceptance } from '../../components/Views/SocialLeaderboard/terms/socialTermsAcceptance';
import SDKConnect from '../../core/SDKConnect/SDKConnect';
import WC2Manager from '../../core/WalletConnect/WalletConnectV2';
import { selectExistingUser } from '../../reducers/user';
import UrlParser from 'url-parse';
import { isSDKServiceDeeplink } from '../../core/DeeplinkManager/util/deeplinks';
import { rewardsBulkLinkSaga } from './rewardsBulkLinkAccountGroups';
import Authentication from '../../core/Authentication';
import { backfillSocialLoginMarketingConsentSaga } from './backfillSocialLoginMarketingConsent';
import { promptIosGoogleWarningSheetSaga } from './onboarding/legacyIosGoogleReminder';
import {
  watchMarketingAttributionOnClearOnboarding,
  watchMarketingAttributionOnConsentChange,
} from './marketingAttribution';
import { getDevAutoUnlockPassword } from '../../util/environment';
import { saveAttribution } from '../../core/redux/slices/attribution';
import { getUtmAttributesFromDeeplinkUrl } from '../../util/analytics/persistAttributionFromPendingDeeplink';
import {
  setPendingReferralCode,
  setReferralLinkPending,
} from '../../reducers/rewardsMoney';
import { parseMoneyReferralCodeFromUrl } from '../../components/UI/Rewards/utils/moneyReferralCode';

/**
 * Safety ceiling: if `MainNavigator` never mounts (e.g. the user stays on
 * the onboarding stack), parse the deeplink anyway. A late deeplink is
 * better than a silently dropped one.
 */
const MAIN_NAVIGATOR_READY_TIMEOUT_MS = 3000;

let hasMainNavigatorMounted = false;
let sdkServicesInitializationTask: Task<void> | undefined;
// The link a user opened before having a wallet. Wallet creation marks
// onboarding complete while onboarding screens can still follow, so this link
// waits for MainNavigator instead of the ready timeout.
let deeplinkOpenedBeforeWallet: string | null = null;
// Latest referral link parse. Only that parse ending releases
// `isReferralLinkPending`, so an older link cannot release a newer one.
let referralLinkParseId = 0;

export const __setMainNavigatorReadyForTesting = (isReady: boolean) => {
  hasMainNavigatorMounted = isReady;
};

export const __resetDeeplinkOpenedBeforeWalletForTesting = () => {
  deeplinkOpenedBeforeWallet = null;
};

export const __resetReferralLinkParseForTesting = () => {
  referralLinkParseId = 0;
};

export const __resetSDKServicesInitializationForTesting = () => {
  sdkServicesInitializationTask = undefined;
};

export function* startSDKServicesInitialization() {
  // Keep a single task so normal deeplinks can warm services in the background
  // and SDK/WC deeplinks can join that same work when they require it.
  if (!sdkServicesInitializationTask) {
    // Detached so callers that only want to warm SDK services are not blocked
    // by WC/SDK startup; SDK/WC deeplinks still join this task explicitly.
    sdkServicesInitializationTask = yield spawn(initializeSDKServices);
  }

  return sdkServicesInitializationTask;
}

export function* waitForSDKServicesInitialization() {
  const task: Task<void> = yield call(startSDKServicesInitialization);
  yield join(task);
}

export function* parseDeeplink(
  deeplink: string,
  origin: string,
  appStartType?: 'cold' | 'warm',
  onHandled?: () => void,
) {
  try {
    const accepted: boolean = yield call(
      [SharedDeeplinkManager, SharedDeeplinkManager.parse],
      deeplink,
      {
        origin,
        ...(appStartType === undefined ? {} : { appStartType }),
        ...(onHandled ? { onHandled } : {}),
      },
    );
    return accepted;
  } catch (error) {
    Logger.error(error as Error, 'parseDeeplink: failed to parse deeplink');
    return false;
  }
}

/**
 * Runtime-only latch for MainNavigator readiness.
 *
 * This deliberately lives in the saga module instead of Redux: the signal is
 * only valid for the current JS session and should never be persisted or
 * rehydrated. `parseDeeplinkAfterNavReady` still waits on the action itself,
 * while this latch preserves the fast path for hot-start deeplinks after
 * MainNavigator has already mounted once.
 */
export function* mainNavigatorReadyStateMachine() {
  while (true) {
    const action: {
      type: NavigationActionType.MAIN_NAVIGATOR_READY | UserActionType.LOGOUT;
    } = yield take([
      NavigationActionType.MAIN_NAVIGATOR_READY,
      UserActionType.LOGOUT,
    ]);

    hasMainNavigatorMounted =
      action.type === NavigationActionType.MAIN_NAVIGATOR_READY;
  }
}

/**
 * Waits until `MainNavigator` has mounted, i.e. post-login screens like
 * Wallet, RampTokenSelection, Swap, etc. are registered with React
 * Navigation, then parses the deeplink. Prevents cold-start deeplinks
 * from being silently dropped with "NAVIGATE was not handled by any
 * navigator" when `handleDeeplinkSaga` runs before the main screen stack
 * has rendered.
 */
export function* parseDeeplinkAfterNavReady(
  deeplink: string,
  origin: string,
  appStartType?: 'cold' | 'warm',
  onHandled?: () => void,
) {
  if (!hasMainNavigatorMounted) {
    const { timedOut } = yield race({
      ready: take(NavigationActionType.MAIN_NAVIGATOR_READY),
      timedOut: delay(MAIN_NAVIGATOR_READY_TIMEOUT_MS),
    });

    if (timedOut) {
      Logger.log(
        'parseDeeplinkAfterNavReady: MainNavigator did not mount within timeout, parsing anyway',
      );
    } else {
      hasMainNavigatorMounted = true;
    }
  }

  const accepted: boolean = yield call(
    parseDeeplink,
    deeplink,
    origin,
    appStartType,
    onHandled,
  );
  return accepted;
}

/**
 * Parses a link opened before the wallet existed once onboarding hands over
 * to `MainNavigator`. The remaining onboarding steps can take any amount of
 * time, and parsing before then drops main-stack targets such as Swap.
 *
 * An auto-lock in the meantime keeps the wait going: the pending link is
 * already cleared, so the post-unlock Home is what mounts `MainNavigator`.
 */
export function* parseDeeplinkAfterOnboarding(
  deeplink: string,
  origin: string,
  appStartType?: 'cold' | 'warm',
  onHandled?: () => void,
) {
  if (!hasMainNavigatorMounted) {
    const { walletReset } = yield race({
      ready: take(NavigationActionType.MAIN_NAVIGATOR_READY),
      walletReset: take(CLEAR_ONBOARDING),
    });

    if (walletReset) {
      // Drop the stale destination: a reset creates a new wallet and the old
      // swap/dapp/home target must not fire into it. Keep the referral code:
      // social-login/SRP retries call deleteWallet() -> CLEAR_ONBOARDING, and
      // the user should still be offered the code they opened the app with.
      const referralCode = parseMoneyReferralCodeFromUrl(deeplink);
      if (referralCode) {
        yield put(setPendingReferralCode(referralCode));
      }

      Logger.log(
        'parseDeeplinkAfterOnboarding: wallet reset before MainNavigator mounted, dropping deeplink destination',
      );
      return false;
    }

    hasMainNavigatorMounted = true;
  }

  const accepted: boolean = yield call(
    parseDeeplink,
    deeplink,
    origin,
    appStartType,
    onHandled,
  );
  return accepted;
}

type DeeplinkParser = (
  deeplink: string,
  origin: string,
  appStartType?: 'cold' | 'warm',
  onHandled?: () => void,
) => Generator;

/**
 * Runs the parse of a link carrying a Money referral code, then releases
 * `isReferralLinkPending`, which the caller set before forking. The invite
 * sheet and the push pre-prompt wait on it, so it is released however the
 * parse ends, including on cancellation.
 *
 * A parse that accepts the link returns before the interstitial is answered,
 * and the code is only captured on Continue. The release therefore waits for
 * `onHandled`, which the deeplink pipeline calls once that answer is known.
 */
export function* parseReferralDeeplink(
  parseId: number,
  parse: DeeplinkParser,
  deeplink: string,
  origin: string,
  appStartType?: 'cold' | 'warm',
) {
  let markHandled: () => void = () => undefined;
  const handled = new Promise<void>((resolve) => {
    markHandled = resolve;
  });
  try {
    const accepted: boolean = yield call(
      parse,
      deeplink,
      origin,
      appStartType,
      markHandled,
    );
    if (accepted) {
      yield call(() => handled);
    }
  } finally {
    if (parseId === referralLinkParseId) {
      yield put(setReferralLinkPending(false));
    }
  }
}

/**
 * Automatically requests authentication on app start.
 */
export function* requestAuthOnAppStart() {
  try {
    const devAutoUnlockPassword = getDevAutoUnlockPassword();
    if (devAutoUnlockPassword) {
      const { KeyringController } = Engine.context;
      if (!KeyringController.isUnlocked() && KeyringController.state?.vault) {
        yield call(Authentication.unlockWallet, {
          password: devAutoUnlockPassword,
        });
        return;
      }
    }

    yield call(Authentication.tryBiometricUnlock);
  } catch (_) {
    // If authentication fails, navigate to login screen
    // TODO: Consolidate error handling in future PRs. For now, we'll rely on the Login screen to handle triaging specific errors.
    NavigationService.navigation?.reset({
      routes: [{ name: Routes.ONBOARDING.LOGIN }],
    });
  }
}

/**
 * The state machine for detecting when the app is logged vs logged out.
 * `AppLockService` owns the background / foreground lifecycle (privacy screen,
 * auto-lock timer, and resume authentication); this saga only scopes its
 * auto-lock behavior to the logged-in session.
 */
export function* authStateMachine() {
  while (true) {
    yield take(UserActionType.LOGIN);
    AppLockService.start();
    yield take(UserActionType.LOGOUT);
    AppLockService.stop();
  }
}

export function* basicFunctionalityToggle() {
  while (true) {
    const { basicFunctionalityEnabled } = yield take(
      'TOGGLE_BASIC_FUNCTIONALITY',
    );

    if (basicFunctionalityEnabled) {
      restoreXMLHttpRequest();
    } else {
      // apply global blocklist
      overrideXMLHttpRequest();
    }
  }
}

function* initializeWalletConnectService() {
  try {
    yield call(() => WC2Manager.init({}));
  } catch (e) {
    Logger.log('Failed to initialize WalletConnect V2', e);
  }
}

function* initializeSDKConnectService() {
  try {
    yield call(() => SDKConnect.init({ context: 'Nav/App' }));
  } catch (e) {
    Logger.log('Failed to initialize SDKConnect', e);
  }
}

export function* initializeSDKServices() {
  // Init WC2 and SDKConnect in parallel; they are independent and each takes ~1-3 s on cold start.
  yield all([
    call(initializeWalletConnectService),
    call(initializeSDKConnectService),
  ]);
}

export function* handleDeeplinkSaga() {
  while (true) {
    // Cold-start deeplinks are consumed by Authentication before HomeNav is
    // displayed. This saga handles deeplinks received while the app is already
    // unlocked, plus onboarding deeplinks for new users.
    const value = (yield take([
      UserActionType.CHECK_FOR_DEEPLINK,
      SET_COMPLETED_ONBOARDING,
    ])) as CheckForDeeplinkAction | SetCompletedOnboardingAction;

    let completedOnboarding = false;

    // Check if triggering action is SET_COMPLETED_ONBOARDING
    if (value.type === SET_COMPLETED_ONBOARDING) {
      completedOnboarding = value.completedOnboarding;
    } else {
      completedOnboarding = yield select(selectCompletedOnboarding);
    }

    const existingUser: boolean = yield select(selectExistingUser);

    if (AppStateEventProcessor.pendingDeeplink) {
      const url = new UrlParser(AppStateEventProcessor.pendingDeeplink);
      const storedSource =
        AppStateEventProcessor.pendingDeeplinkSource ??
        AppConstants.DEEPLINKS.ORIGIN_DEEPLINK;

      // Persist UTM params for new users before pending deeplink may be cleared.
      if (!existingUser) {
        const utmPayload = getUtmAttributesFromDeeplinkUrl(url.href);
        if (utmPayload) {
          yield put(saveAttribution(utmPayload));
        }
        deeplinkOpenedBeforeWallet = AppStateEventProcessor.pendingDeeplink;
      }

      // try handle fast onboarding if mobile existingUser flag is false and 'onboarding' present in deeplink
      if (!existingUser && url.pathname === '/onboarding') {
        // New-user onboarding lives outside the post-login navigation tree.
        setTimeout(() => {
          SharedDeeplinkManager.parse(url.href, {
            origin: storedSource,
          });
        }, 200);
        AppStateEventProcessor.clearPendingDeeplink();
        continue;
      }
    }

    const { KeyringController } = Engine.context;
    const isUnlocked = KeyringController.isUnlocked();

    // App is locked or onboarding is not yet complete
    if (!isUnlocked || !completedOnboarding) {
      continue;
    }

    // Resume can deliver the URL while a lock decision is open or the unlock
    // prompt has not finished. Parsing now would clear the pending link, then
    // the lock or the post-unlock navigation would replace it.
    if (AppLockService.isAutoLockPending()) {
      continue;
    }

    // Password unlock dispatches SET_COMPLETED_ONBOARDING from the Login
    // screen, before navigateToPostUnlockHome reads the pending link.
    // Consuming it here clears the URL, then the home reset replaces any
    // navigation this parse managed to start. Resume biometric unlock is
    // covered by `isAutoLockPending` above, which stays set until that
    // prompt settles.
    const currentRouteName = NavigationService.getCurrentRoute()?.name;
    if (
      value.type === SET_COMPLETED_ONBOARDING &&
      currentRouteName === Routes.ONBOARDING.LOGIN
    ) {
      continue;
    }

    const deeplink = AppStateEventProcessor.pendingDeeplink;
    const deeplinkSource =
      AppStateEventProcessor.pendingDeeplinkSource ??
      AppConstants.DEEPLINKS.ORIGIN_DEEPLINK;

    if (deeplink) {
      if (isSDKServiceDeeplink(deeplink)) {
        yield call(waitForSDKServicesInitialization);
      }

      // SDK and WalletConnect requests only need an unlocked keychain, and a
      // dapp waiting on one may give up before onboarding ends.
      const shouldWaitForOnboarding =
        deeplink === deeplinkOpenedBeforeWallet &&
        !isSDKServiceDeeplink(deeplink);
      deeplinkOpenedBeforeWallet = null;

      const parse = shouldWaitForOnboarding
        ? parseDeeplinkAfterOnboarding
        : parseDeeplinkAfterNavReady;
      // Fallback captured here — inside parse, post-unlock nav has already cleared it.
      const appStartType =
        consumeNextParseAppStartType() ?? getUnlockAppStartType();

      // Fork so the loop keeps listening.
      if (parseMoneyReferralCodeFromUrl(deeplink)) {
        referralLinkParseId += 1;
        yield put(setReferralLinkPending(true));
        yield fork(
          parseReferralDeeplink,
          referralLinkParseId,
          parse,
          deeplink,
          deeplinkSource,
          appStartType,
        );
      } else {
        yield fork(parse, deeplink, deeplinkSource, appStartType);
      }
      AppStateEventProcessor.clearPendingDeeplink();
    }
  }
}

// Keep SDK warm-up independent from deeplink parsing. Normal app launches have
// no pending deeplink, but WalletConnect/SDKConnect still need to initialize
// after unlock; parsing pending links on LOGIN would race startup intents.
export function* initializeSDKServicesSaga() {
  while (true) {
    const value = (yield take([
      UserActionType.LOGIN,
      SET_COMPLETED_ONBOARDING,
    ])) as LoginAction | SetCompletedOnboardingAction;

    let completedOnboarding = false;
    if (value.type === SET_COMPLETED_ONBOARDING) {
      completedOnboarding = value.completedOnboarding;
    } else {
      completedOnboarding = yield select(selectCompletedOnboarding);
    }

    if (!completedOnboarding) {
      continue;
    }

    const { KeyringController } = Engine.context;
    if (!KeyringController.isUnlocked()) {
      continue;
    }

    yield call(startSDKServicesInitialization);
  }
}

/**
 * Handles updating the Snaps registry when the user has booted the app and is onboarded
 */
export function* handleSnapsRegistry() {
  while (true) {
    const result = (yield take([
      UserActionType.LOGIN,
      SET_COMPLETED_ONBOARDING,
    ])) as LoginAction | SetCompletedOnboardingAction;

    const state: boolean = yield select(selectCompletedOnboarding);
    const completedOnboarding =
      result.type === 'SET_COMPLETED_ONBOARDING'
        ? result.completedOnboarding
        : state;

    if (!completedOnboarding) {
      continue;
    }

    try {
      const { SnapController } = Engine.context;
      yield call([SnapController, SnapController.updateRegistry]);
    } catch {
      // Ignore
    }
  }
}

/**
 * Handles initializing app services on start up
 */
export function* startAppServices() {
  // Wait for persisted data to be loaded and navigation to be ready
  yield all([
    take(UserActionType.ON_PERSISTED_DATA_LOADED),
    take(NavigationActionType.ON_NAVIGATION_READY),
  ]);

  // Start Engine service
  yield call(EngineService.start);

  // Start DeeplinkManager and process branch deeplinks
  const stopDeeplinkManagerStart = timeStartupStep(
    'post_init_gap',
    'startup.post_init.deeplink_manager_ms',
  );
  SharedDeeplinkManager.start();
  stopDeeplinkManagerStart();

  // Start AppStateEventProcessor
  const stopAppStateProcessorStart = timeStartupStep(
    'post_init_gap',
    'startup.post_init.app_state_processor_ms',
  );
  AppStateEventProcessor.start();
  stopAppStateProcessorStart();

  // Apply vault initialization
  yield call(applyVaultInitialization);

  yield call(hydrateSocialTermsAcceptance);

  markStartup('servicesReady');
  // Unblock the ControllersGate
  yield put(setAppServicesReady());

  // Wait for the next frame to ensure that navigation stack is rendered.
  // This is needed to prevent a race condition where the navigation container is ready BUT the navigation stacks are not yet rendered.
  // TODO: Follow up on pre-rendering the navigation stacks.
  yield call(() => new Promise((resolve) => requestAnimationFrame(resolve)));

  // Request authentication on app start after the auth state machine is started
  yield call(requestAuthOnAppStart);
}

// Main generator function that initializes other sagas in parallel.
export function* rootSaga() {
  yield fork(startAppServices);
  yield fork(authStateMachine);
  yield fork(basicFunctionalityToggle);
  yield fork(mainNavigatorReadyStateMachine);
  yield fork(handleDeeplinkSaga);
  yield fork(initializeSDKServicesSaga);
  yield fork(rewardsBulkLinkSaga);

  // Send one-time analytics backfill for migrated social login users after
  // persisted state has been rehydrated and app services are available.
  yield fork(backfillSocialLoginMarketingConsentSaga);

  yield fork(watchMarketingAttributionOnConsentChange);
  yield fork(watchMarketingAttributionOnClearOnboarding);

  yield fork(promptIosGoogleWarningSheetSaga);
  yield fork(handleSnapsRegistry);
}
