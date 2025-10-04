// Tracks "skipped" interstitial state and uses consolidated analytics
import {
  createDeepLinkModalNavDetails,
  DeepLinkModalParams,
} from '../../../components/UI/DeepLinkModal';
import { selectDeepLinkModalDisabled } from '../../../selectors/settings';
import { store } from '../../../store';
import NavigationService from '../../../core/NavigationService';
import { createDeepLinkUsedEventBuilder } from '../../../util/deeplinks/deepLinkAnalytics';
import {
  InterstitialState,
  SignatureStatus,
  DeepLinkRoute,
  DeepLinkAnalyticsContext,
} from '../types/deepLinkAnalytics.types';
import { MetaMetrics, MetaMetricsEvents } from '../../Analytics';
import { MetricsEventBuilder } from '../../Analytics/MetricsEventBuilder';
import generateDeviceAnalyticsMetaData from '../../../util/metrics';
import Logger from '../../../util/Logger';

const handleDeepLinkModalDisplay = async (
  params: DeepLinkModalParams,
  deepLinkContext?: DeepLinkAnalyticsContext,
) => {
  const deepLinkModalDisabled = selectDeepLinkModalDisabled(store.getState());

  if (params.linkType === 'private' && deepLinkModalDisabled) {
    // Skip interstitial if don't remind me again was toggled
    // Track the skipped interstitial state
    try {
      const eventBuilder = await createDeepLinkUsedEventBuilder({
        url: deepLinkContext?.url || '',
        route: deepLinkContext?.route || DeepLinkRoute.INVALID,
        urlParams: deepLinkContext?.urlParams || {},
        signatureStatus:
          deepLinkContext?.signatureStatus || SignatureStatus.MISSING,
        interstitialShown: false, // Modal was not shown
        interstitialDisabled: true, // User has disabled interstitials
        interstitialAction: InterstitialState.SKIPPED,
      });

      const metrics = MetaMetrics.getInstance();
      eventBuilder.addProperties(generateDeviceAnalyticsMetaData());
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
    ...createDeepLinkModalNavDetails({
      ...params,
      deepLinkContext,
    }),
  );
};

export default handleDeepLinkModalDisplay;
