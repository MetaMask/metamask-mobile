import { AppState, AppStateStatus } from 'react-native';
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
import { captureAppInstallOnce } from '../util/analytics/appInstallEvent';
import AppConstants from './AppConstants';

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
 * Which system delivered the push. Both travel over FCM on Android, so this
 * names the producer rather than the transport: Braze is marketing, wallet is
 * the notification backend that sends on-chain activity.
 */
export enum AppOpenedPushProvider {
  Braze = 'braze',
  Wallet = 'wallet',
}

export interface PushOpenDetails {
  provider: AppOpenedPushProvider;
  /** Wallet notifications only; Braze payloads do not carry these. */
  notificationType?: string;
  notificationSubtype?: string;
}

/** Source-related properties attached to App Opened. */
interface AppOpenedSourceProperties {
  source: AppOpenedSource;
  push_provider?: AppOpenedPushProvider;
  notification_type?: string;
  notification_subtype?: string;
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
  private openedFromPushAt = 0;
  private openedFromPush: PushOpenDetails | null = null;
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

    // Record a first install so App Installed can be emitted after consent
    this.captureAppInstallOnce();

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

  /**
   * Record that the app was opened by a push notification tap.
   *
   * Push origin is otherwise only detectable via a deeplink on the payload, and
   * many notifications carry none — on-chain activity notifications commonly
   * have no CTA link. Reporting the tap directly means those opens are still
   * attributed to push rather than falling through to `direct`.
   *
   * Callers must only invoke this for genuine user taps, never for pushes that
   * were merely received.
   */
  public markOpenedFromPush(details: PushOpenDetails) {
    this.openedFromPushAt = Date.now();
    this.openedFromPush = details;
  }

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

  private captureAppInstallOnce = captureAppInstallOnce;

  // Push opens are only detectable via the deeplink on the push payload, so a
  // push without a deeplink is reported as direct.
  //
  // A deeplink older than DEEPLINK_ATTRIBUTION_TTL_MS did not cause this open —
  // it is a leftover from in-app navigation — so it also reports direct. This
  // deliberately does not gate processAttribution, which keeps its existing
  // behavior; only the reported source honors recency.
  private getAppOpenedSourceProperties = (): AppOpenedSourceProperties => {
    // A reported tap outranks the deeplink, which may be absent on the payload.
    const openedFromPush =
      this.openedFromPush !== null &&
      Date.now() - this.openedFromPushAt <= DEEPLINK_ATTRIBUTION_TTL_MS;
    if (openedFromPush && this.openedFromPush) {
      const { provider, notificationType, notificationSubtype } =
        this.openedFromPush;
      return {
        source: AppOpenedSource.PushNotification,
        push_provider: provider,
        ...(notificationType ? { notification_type: notificationType } : {}),
        ...(notificationSubtype
          ? { notification_subtype: notificationSubtype }
          : {}),
      };
    }
    const isStaleDeeplink =
      Date.now() - this.currentDeeplinkSetAt > DEEPLINK_ATTRIBUTION_TTL_MS;
    if (!this.currentDeeplink || isStaleDeeplink) {
      return { source: AppOpenedSource.Direct };
    }
    // A push-tagged deeplink with no reported tap still classifies as push, but
    // the provider is unknown here, so no push_provider is attached.
    return {
      source: this.isPushSource(this.currentDeeplinkSource)
        ? AppOpenedSource.PushNotification
        : AppOpenedSource.Deeplink,
    };
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
        ...this.getAppOpenedSourceProperties(),
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
      this.openedFromPushAt = 0;
      this.openedFromPush = null;
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
