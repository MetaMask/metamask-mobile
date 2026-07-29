import { AppState, AppStateStatus } from 'react-native';
import branch from 'react-native-branch';
import Logger from '../util/Logger';
import { MetaMetricsEvents } from './Analytics';
import { AnalyticsEventBuilder } from '../util/analytics/AnalyticsEventBuilder';
import { analytics } from '../util/analytics/analytics';
import { processAttribution } from './processAttribution';
import { saveAttribution } from './redux/slices/attribution';
import { attributionPayloadFromProcessAttribution } from './redux/slices/attributionFromSources';
import DevLogger from './SDKConnect/utils/DevLogger';
import ReduxService from './redux';
import generateDeviceAnalyticsMetaData from '../util/metrics';
import generateUserSettingsAnalyticsMetaData from '../util/metrics/UserSettingsAnalyticsMetaData/generateUserProfileAnalyticsMetaData';
import { UserProfileProperty } from '../util/metrics/UserSettingsAnalyticsMetaData/UserProfileAnalyticsMetaData.types';
import {
  selectExistingUser,
  selectAppInstallEventFired,
} from '../reducers/user/selectors';
import { setAppInstallEventFired } from '../actions/user';
import AppConstants from './AppConstants';

/** Prevents parallel start() calls from double-firing before Redux persists. */
let trackAppInstallInFlight = false;

/** Delay so an incoming deeplink can land before App Opened fires. */
const APP_OPENED_DEEPLINK_DELAY_MS = 2000;

/**
 * How recently a deeplink must have arrived to explain the current open.
 *
 * `setCurrentDeeplink` is also reached by in-app navigation — Rewards CTAs call
 * `handleDeeplink` directly — and those values live until the next App Opened
 * event consumes them. Without a recency check, tapping an in-app CTA and later
 * resuming from the icon reports `source: deeplink` for a plainly direct open.
 *
 * Comfortably above APP_OPENED_DEEPLINK_DELAY_MS so every externally-delivered
 * deeplink still classifies, including the slowest Branch resolutions.
 */
const DEEPLINK_ATTRIBUTION_TTL_MS = 5000;

export enum AppOpenedType {
  ColdStart = 'cold_start',
  WarmStart = 'warm_start',
}

export enum AppOpenedSource {
  PushNotification = 'push_notification',
  Deeplink = 'deeplink',
  Direct = 'direct',
}

/**
 * Fire the App Installed analytics event exactly once on first install.
 * Mirrors the extension's addAppInstalledEvent / onInstall logic:
 * - Sets InstallDateMobile user trait (yyyy-mm-dd)
 * - Adds install_source + deeplink_path when app was opened via a Branch
 * deferred deeplink (+is_first_session && +clicked_branch_link)
 * - The analytics queue handles pre-opt-in buffering automatically
 */
export async function trackAppInstallOnce() {
  if (trackAppInstallInFlight) {
    return;
  }

  trackAppInstallInFlight = true;
  try {
    const state = ReduxService.store.getState();
    const existingUser = selectExistingUser(state);
    const alreadyFired = selectAppInstallEventFired(state);

    if (existingUser || alreadyFired) {
      return;
    }

    // Set install date trait (yyyy-mm-dd), mirrors InstallDateExt on extension
    const installDate = new Date().toISOString().split('T')[0];
    analytics.identify({
      [UserProfileProperty.INSTALL_DATE_MOBILE]: installDate,
    });

    // Detect deferred deeplink install via Branch
    const branchParams = await branch.getLatestReferringParams();
    const isFirstSession = branchParams?.['+is_first_session'] as
      | boolean
      | undefined;
    const clickedBranchLink = branchParams?.['+clicked_branch_link'] as
      | boolean
      | undefined;

    const isDeferredDeeplinkInstall =
      isFirstSession === true && clickedBranchLink === true;

    const eventBuilder = AnalyticsEventBuilder.createEventBuilder(
      MetaMetricsEvents.APP_INSTALLED,
    );

    if (isDeferredDeeplinkInstall) {
      const deeplinkPath = branchParams?.$deeplink_path as string | undefined;
      eventBuilder.addProperties({
        install_source: 'deeplink',
        ...(deeplinkPath ? { deeplink_path: deeplinkPath } : {}),
      });
    }

    analytics.trackEvent(eventBuilder.build());

    // Only persist after tracking succeeds so a failed attempt can retry
    ReduxService.store.dispatch(setAppInstallEventFired());
  } catch (error) {
    Logger.error(
      error as Error,
      'AppStateManager: Error tracking app install event',
    );
  } finally {
    trackAppInstallInFlight = false;
  }
}

export class AppStateEventListener {
  private appStateSubscription:
    | ReturnType<typeof AppState.addEventListener>
    | undefined = undefined;
  // TODO: The AppStateEventListener should be feature agnostic and shouldn't include deeplinks. Abstract this into a deeplink service instead
  public currentDeeplink: string | null = null;
  public pendingDeeplink: string | null = null;
  public pendingDeeplinkSource: string | null = null;
  private currentDeeplinkSource: string | null = null;
  // When currentDeeplink was recorded, for DEEPLINK_ATTRIBUTION_TTL_MS.
  private currentDeeplinkSetAt = 0;
  private lastAppState: AppStateStatus = AppState.currentState;

  constructor() {
    this.lastAppState = AppState.currentState;
  }

  start() {
    if (this.appStateSubscription) {
      // Already started
      return;
    }
    this.appStateSubscription = AppState.addEventListener(
      'change',
      this.handleAppStateChange,
    );

    // Identify user on app launch
    // This ensures user is identified with full traits including chain_id_list when the app starts
    this.identifyUserOnAppStart();

    // Fire App Installed event once on first install
    this.trackAppInstallOnce();

    setTimeout(() => {
      this.processAppStateChange(AppOpenedType.ColdStart);
    }, APP_OPENED_DEEPLINK_DELAY_MS);
  }

  public setCurrentDeeplink(deeplink: string | null, source?: string) {
    this.currentDeeplink = deeplink;
    if (source || !this.isPushSource(this.currentDeeplinkSource)) {
      this.currentDeeplinkSource = source ?? null;
    }
    this.currentDeeplinkSetAt = Date.now();
    this.pendingDeeplink = deeplink;
    this.pendingDeeplinkSource = source ?? null;
  }

  private isPushSource = (source: string | null): boolean =>
    source === AppConstants.DEEPLINKS.ORIGIN_PUSH_NOTIFICATION ||
    source === AppConstants.DEEPLINKS.ORIGIN_BRAZE;

  public promoteCurrentDeeplinkSource(uri: string, source?: string) {
    if (
      this.currentDeeplink === uri &&
      this.isPushSource(source ?? null) &&
      !this.isPushSource(this.currentDeeplinkSource)
    ) {
      this.currentDeeplinkSource = source ?? null;
    }
  }

  public clearPendingDeeplink() {
    this.pendingDeeplink = null;
    this.pendingDeeplinkSource = null;
  }

  private handleAppStateChange = (nextAppState: AppStateStatus) => {
    // Only fire APP_OPENED when transitioning from background to active.
    // Transitioning from inactive (e.g. system permission dialogs, incoming calls)
    // back to active should NOT count as the user opening the app.
    if (nextAppState === 'active' && this.lastAppState === 'background') {
      // delay to allow time for the deeplink to be set
      setTimeout(() => {
        this.processAppStateChange(AppOpenedType.WarmStart);
      }, APP_OPENED_DEEPLINK_DELAY_MS);
    }
    // On iOS, returning from background passes through an intermediate 'inactive'
    // state before reaching 'active'. Don't overwrite 'background' with 'inactive'
    // so the subsequent 'active' check above still sees the original 'background' state.
    if (!(nextAppState === 'inactive' && this.lastAppState === 'background')) {
      this.lastAppState = nextAppState;
    }
  };

  private identifyUserOnAppStart = () => {
    try {
      // Identify user with full traits on app start
      // This ensures all traits including chain_id_list are sent on initial launch
      const consolidatedTraits = {
        ...generateDeviceAnalyticsMetaData(),
        ...generateUserSettingsAnalyticsMetaData(),
      };
      analytics.identify(consolidatedTraits);
    } catch (error) {
      Logger.error(
        error as Error,
        'AppStateManager: Error identifying user on app start',
      );
    }
  };

  private trackAppInstallOnce = trackAppInstallOnce;

  // Push opens are only detectable via the deeplink on the push payload, so a
  // push without a deeplink is reported as direct.
  //
  // A deeplink older than DEEPLINK_ATTRIBUTION_TTL_MS did not cause this open —
  // it is a leftover from in-app navigation — so it also reports direct. This
  // deliberately does not gate processAttribution, which keeps its existing
  // behavior; only the reported source honors recency.
  private getAppOpenedSource = (): AppOpenedSource => {
    const isStaleDeeplink =
      Date.now() - this.currentDeeplinkSetAt > DEEPLINK_ATTRIBUTION_TTL_MS;
    if (!this.currentDeeplink || isStaleDeeplink) {
      return AppOpenedSource.Direct;
    }
    return this.isPushSource(this.currentDeeplinkSource)
      ? AppOpenedSource.PushNotification
      : AppOpenedSource.Deeplink;
  };

  private processAppStateChange = (appOpenedType: AppOpenedType) => {
    try {
      const attribution = processAttribution({
        currentDeeplink: this.currentDeeplink,
        store: ReduxService.store,
      });
      if (attribution) {
        const persistedPayload =
          attributionPayloadFromProcessAttribution(attribution);
        if (persistedPayload) {
          ReduxService.store.dispatch(saveAttribution(persistedPayload));
        }
      }
      const appOpenedEventBuilder = AnalyticsEventBuilder.createEventBuilder(
        MetaMetricsEvents.APP_OPENED,
      ).addProperties({
        type: appOpenedType,
        source: this.getAppOpenedSource(),
      });
      if (attribution) {
        const { attributionId, ...utmParams } = attribution;
        DevLogger.log(
          `AppStateManager:: processAppStateChange:: sending event 'APP_OPENED' attributionId=${attribution.attributionId}`,
          utmParams,
        );
        appOpenedEventBuilder.addProperties(attribution);
      }
      analytics.trackEvent(appOpenedEventBuilder.build());
      // One-shot use for attribution: keeping currentDeeplink causes every
      // background→active cycle to re-save and reset capturedAt (TTL).
      this.currentDeeplink = null;
      this.currentDeeplinkSource = null;
      this.currentDeeplinkSetAt = 0;
    } catch (error) {
      Logger.error(
        error as Error,
        'AppStateManager: Error processing app state change',
      );
    }
  };

  public cleanup() {
    this.appStateSubscription?.remove();
    this.appStateSubscription = undefined;
  }
}

export const AppStateEventProcessor = new AppStateEventListener();
