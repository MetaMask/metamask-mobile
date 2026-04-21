import { checkForDeeplink } from '../../../../actions/user';
import Logger from '../../../../util/Logger';
import { AppStateEventProcessor } from '../../../AppStateEventListener';
import ReduxService from '../../../redux';
import SDKConnectV2 from '../../../SDKConnectV2';
import { analytics } from '../../../../util/analytics/analytics';
import { AnalyticsEventBuilder } from '../../../../util/analytics/AnalyticsEventBuilder';
import { MetaMetricsEvents } from '../../../Analytics/MetaMetrics.events';
import {
  DeepLinkRoute,
  SignatureStatus,
} from '../../types/deepLinkAnalytics.types';
import { detectAppInstallation } from '../../util/deeplinks/deepLinkAnalytics';

/**
 * On Android, a single user intent (e.g. tapping a `link.metamask.io/buy?...`
 * link) is routinely delivered through multiple native channels (RN `Linking`,
 * `branch.subscribe`, `branch.getLatestReferringParams`, FCM, etc.). Without
 * deduplication, each delivery drives its own navigation, producing a visible
 * flash such as "Buy → Select Token" when an already-nested ramp navigation
 * is re-applied and RN briefly falls back to the nested navigator's
 * `initialRouteName`.
 *
 * We remember recently-seen URIs for a short window and drop exact duplicates.
 * The window is long enough to cover the saga's 200ms parse delay plus any
 * staggered callback latency, and short enough that a genuine re-tap by the
 * user (which realistically takes longer) still goes through.
 */
const DEEPLINK_DEDUP_WINDOW_MS = 3000;
const recentDeeplinks = new Map<string, number>();

function isDuplicateDeeplink(uri: string): boolean {
  const now = Date.now();

  for (const [key, ts] of recentDeeplinks) {
    if (now - ts > DEEPLINK_DEDUP_WINDOW_MS) {
      recentDeeplinks.delete(key);
    }
  }

  const last = recentDeeplinks.get(uri);
  if (last !== undefined && now - last <= DEEPLINK_DEDUP_WINDOW_MS) {
    return true;
  }

  recentDeeplinks.set(uri, now);
  return false;
}

/**
 * Test-only helper to reset the dedup state between tests. Production code
 * must not call this.
 */
export function __resetDeeplinkDedupForTests(): void {
  recentDeeplinks.clear();
}

export function handleDeeplink(opts: { uri?: string; source?: string }) {
  // This is the earliest JS entry point for deeplinks. We must handle SDKConnectV2
  // links here immediately to establish the WebSocket connection as fast as possible,
  // without waiting for the app to be unlocked or fully onboarded.
  if (SDKConnectV2.isMwpDeeplink(opts.uri)) {
    trackMwpDeepLinkUsed();
    SDKConnectV2.handleMwpDeeplink(opts.uri);
    // By returning here, we bypass the standard saga-based deeplink flow below,
    // which would otherwise wait for a LOGIN or ONBOARDING_COMPLETED action.
    // Those are also handled, but within the SDKConnectV2 logic.
    return;
  }

  const { dispatch } = ReduxService.store;
  const { uri, source } = opts;
  try {
    if (uri && typeof uri === 'string') {
      if (isDuplicateDeeplink(uri)) {
        Logger.log(
          `Deeplink: ignoring duplicate delivery within ${DEEPLINK_DEDUP_WINDOW_MS}ms window: ${uri}`,
        );
        return;
      }
      AppStateEventProcessor.setCurrentDeeplink(uri, source);
      dispatch(checkForDeeplink());
    }
  } catch (e) {
    Logger.error(e as Error, `Deeplink: Error parsing deeplink`);
  }
}

/**
 * Fire DEEP_LINK_USED for MWP deeplinks asynchronously so the WebSocket
 * handshake is never blocked by analytics work.
 */
function trackMwpDeepLinkUsed(): void {
  detectAppInstallation()
    .then((wasAppInstalled) => {
      const event = AnalyticsEventBuilder.createEventBuilder(
        MetaMetricsEvents.DEEP_LINK_USED,
      )
        .addProperties({
          route: DeepLinkRoute.MMC_MWP,
          signature: SignatureStatus.MISSING,
          was_app_installed: wasAppInstalled,
        })
        .build();
      analytics.trackEvent(event);
    })
    .catch((error) => {
      Logger.error(
        error as Error,
        'DeepLinkAnalytics: Failed to track MWP deep link event',
      );
    });
}
