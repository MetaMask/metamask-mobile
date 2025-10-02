// Tracks "skipped" interstitial state and uses consolidated analytics
import {
  createDeepLinkModalNavDetails,
  DeepLinkModalParams,
} from '../../../components/UI/DeepLinkModal';
import { selectDeepLinkModalDisabled } from '../../../selectors/settings';
import { store } from '../../../store';
import NavigationService from '../../../core/NavigationService';
import { createDeepLinkUsedEvent } from '../../../util/deeplinks/deepLinkAnalytics';
import {
  InterstitialState,
  SignatureStatus,
  DeepLinkRoute,
} from '../types/deepLinkAnalytics';
import { MetaMetrics, MetaMetricsEvents } from '../../Analytics';
import { MetricsEventBuilder } from '../../Analytics/MetricsEventBuilder';
import generateDeviceAnalyticsMetaData from '../../../util/metrics';
import Logger from '../../../util/Logger';

const handleDeepLinkModalDisplay = async (params: DeepLinkModalParams) => {
  const deepLinkModalDisabled = selectDeepLinkModalDisabled(store.getState());

  if (params.linkType === 'private' && deepLinkModalDisabled) {
    // Skip interstitial if don't remind me again was toggled
    // Track the skipped interstitial state
    try {
      const eventProperties = await createDeepLinkUsedEvent({
        url: '', // URL not available in this context
        route: DeepLinkRoute.INVALID, // Will be determined by the calling context
        urlParams: {},
        signatureStatus: SignatureStatus.MISSING, // Default for modal context
        interstitialShown: false, // Modal was not shown
        interstitialDisabled: true, // User has disabled interstitials
        interstitialAction: InterstitialState.SKIPPED,
      });

      const metrics = MetaMetrics.getInstance();
      const eventBuilder = MetricsEventBuilder.createEventBuilder(
        MetaMetricsEvents.DEEP_LINK_USED,
      );
      const { sensitiveProperties, ...regularProperties } = eventProperties;
      eventBuilder.addProperties({
        ...generateDeviceAnalyticsMetaData(),
        ...regularProperties,
      });
      eventBuilder.addSensitiveProperties(sensitiveProperties || {});

      metrics.trackEvent(eventBuilder.build());
    } catch (error) {
      Logger.error(
        error as Error,
        'handleDeepLinkModalDisplay: Error tracking skipped interstitial',
      );
    }

    params.onContinue();
    return;
  }
  NavigationService.navigation.navigate(
    ...createDeepLinkModalNavDetails(params),
  );
};

export default handleDeepLinkModalDisplay;
