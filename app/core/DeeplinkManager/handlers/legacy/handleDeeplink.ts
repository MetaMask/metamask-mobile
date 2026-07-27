import { saveAttribution } from '../../../redux/slices/attribution';
import { attributionPayloadFromDeeplink } from '../../../redux/slices/attributionFromSources';
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
 * Time window during which an identical deeplink is treated as a duplicate and
 * ignored.
 *
 * On Android, a single user click on a deeplink can be delivered twice when the
 * app is resumed from the background: once through React Native `Linking`
 * (`url` event) and once through the Branch SDK (`branch.subscribe`). Without
 * de-duplication, both deliveries are processed and a dapp link opens two
 * browser tabs. iOS routes external URL opens through Branch only, so it is not
 * affected. The two deliveries happen back-to-back, so a short window is enough
 * to collapse them without interfering with genuine repeat navigations.
 */
const DUPLICATE_DEEPLINK_WINDOW_MS = 3000;

let lastHandledDeeplinkUri: string | null = null;
let lastHandledDeeplinkAt = 0;

/**
 * Reset the duplicate-deeplink suppression state. Exposed for tests.
 */
export function resetDeeplinkDeduplication(): void {
  lastHandledDeeplinkUri = null;
  lastHandledDeeplinkAt = 0;
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
      // Drop duplicate deliveries of the same deeplink (see
      // DUPLICATE_DEEPLINK_WINDOW_MS) so a single click does not, for example,
      // open a dapp in two browser tabs on Android.
      const now = Date.now();
      if (
        uri === lastHandledDeeplinkUri &&
        now - lastHandledDeeplinkAt < DUPLICATE_DEEPLINK_WINDOW_MS
      ) {
        Logger.log(`Deeplink: Ignoring duplicate deeplink: ${uri}`);
        return;
      }
      lastHandledDeeplinkUri = uri;
      lastHandledDeeplinkAt = now;

      AppStateEventProcessor.setCurrentDeeplink(uri, source);
      if (
        ReduxService.store.getState().security.dataCollectionForMarketing ===
        true
      ) {
        const payload = attributionPayloadFromDeeplink(uri);
        if (payload) {
          ReduxService.store.dispatch(saveAttribution(payload));
        }
      }
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
