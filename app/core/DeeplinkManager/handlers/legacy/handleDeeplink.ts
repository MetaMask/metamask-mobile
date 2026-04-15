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

export function handleDeeplink(opts: { uri?: string; source?: string }) {
  // This is the earliest JS entry point for deeplinks. We must handle SDKConnectV2
  // links here immediately to establish the WebSocket connection as fast as possible,
  // without waiting for the app to be unlocked or fully onboarded.
  if (SDKConnectV2.isMwpDeeplink(opts.uri)) {
    trackMwpDeepLinkUsed(opts.uri);
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
function trackMwpDeepLinkUsed(url: string): void {
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
