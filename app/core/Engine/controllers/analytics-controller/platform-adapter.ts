import type {
  AnalyticsPlatformAdapter,
  AnalyticsEventProperties,
  AnalyticsUserTraits,
} from '@metamask/analytics-controller';
import {
  createClient,
  Config,
  CountFlushPolicy,
  TimerFlushPolicy,
  type SegmentClient,
} from '@segment/analytics-react-native';
import { segmentPersistor } from '../../../Analytics/SegmentPersistor';
import Logger from '../../../../util/Logger';
import MetaMetricsPrivacySegmentPlugin from '../../../Analytics/MetaMetricsPrivacySegmentPlugin';

const getSegmentClient = (): SegmentClient => {
  const config: Config = {
    writeKey: process.env.SEGMENT_WRITE_KEY as string,
    proxy: process.env.SEGMENT_PROXY_URL as string,
    debug: __DEV__,
    // Use custom persistor to bridge Segment SDK with app's storage system
    storePersistor: segmentPersistor,
    // Use flush policies for better control and to avoid timeout issues
    // CountFlushPolicy: triggers when reaching a certain number of events
    // TimerFlushPolicy: triggers on an interval (expects milliseconds)
    // Environment variables are in seconds for backward compatibility
    // Both are configurable via environment variables in .js.env
    // If not set, sensible defaults are used (20 events, 30 seconds)
    flushPolicies: [
      new CountFlushPolicy(
        parseInt(process.env.SEGMENT_FLUSH_EVENT_LIMIT || '20', 10),
      ),
      new TimerFlushPolicy(
        parseInt(process.env.SEGMENT_FLUSH_INTERVAL || '30', 10) * 1000,
      ),
    ],
  };

  return createClient(config);
};

/**
 * Platform adapter for the AnalyticsController.
 */
export const createPlatformAdapter = (): AnalyticsPlatformAdapter => {
  // Initialize Segment client
  const client = getSegmentClient();

  Logger.log('Analytics Adapter: Segment client initialized');

  return {
    track(eventName: string, properties?: AnalyticsEventProperties): void {
      if (properties) {
        client.track(eventName, properties);
      } else {
        client.track(eventName);
      }
    },

    identify(userId: string, traits?: AnalyticsUserTraits): void {
      if (traits !== undefined) {
        client.identify(userId, traits);
      } else {
        client.identify(userId);
      }
    },

    view(name: string, properties?: AnalyticsEventProperties): void {
      if (properties !== undefined) {
        client.screen(name, properties);
      } else {
        client.screen(name);
      }
    },

    onSetupCompleted(analyticsId: string): void {
      // Add privacy plugin with analytics ID after controller is initialized
      client.add({
        plugin: new MetaMetricsPrivacySegmentPlugin(analyticsId),
      });
      Logger.log('Analytics Adapter: Privacy plugin added to Segment client', {
        analyticsId,
      });
    },
  };
};
