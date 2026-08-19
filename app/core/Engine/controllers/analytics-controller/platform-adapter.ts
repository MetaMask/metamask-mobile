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
  type Plugin,
} from '@segment/analytics-react-native';
import { segmentPersistor } from '../../../../util/analytics/SegmentPersistor';
import Logger from '../../../../util/Logger';
import MetaMetricsPrivacySegmentPlugin from '../../../../util/analytics/privacySegmentPlugin';

/**
 * Strips trailing `=` padding from every query-param value in a URL.
 *
 * @segment/analytics-react-native ≥2.23.0 introduced a strict `validateURL`
 * regex that only allows `[a-zA-Z0-9_.-]` in query-param values, which rejects
 * the standard base64 `=` padding characters present in the Segment proxy write
 * key. Stripping the padding is safe – base64 decoders always infer it from the
 * data length, and the proxy server accepts both forms.
 *
 * TODO: remove once upstream fixes the regex to accept all RFC 3986 query chars.
 * See: https://github.com/segmentio/analytics-react-native/pull/1157
 */
export const normalizeProxyUrl = (
  url: string | undefined,
): string | undefined => {
  if (!url) return undefined;
  // Replace any run of `=` that is followed by `&` (next param) or end-of-string
  // (end of query). This strips base64 padding without touching `=` separators.
  return url.replace(/[=]+(?=&|$)/g, '');
};

const getSegmentClient = (): SegmentClient => {
  const config: Config = {
    writeKey: process.env.SEGMENT_WRITE_KEY as string,
    proxy: normalizeProxyUrl(process.env.SEGMENT_PROXY_URL),
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
 *
 * @param segmentPlugins - Optional Segment plugins to add to the client.
 */
export const createPlatformAdapter = (
  segmentPlugins?: Plugin[],
): AnalyticsPlatformAdapter => {
  const client = getSegmentClient();

  Logger.log('Analytics Adapter: Segment client initialized');

  segmentPlugins?.forEach((plugin) => {
    client.add({ plugin });
  });

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
      client.add({
        plugin: new MetaMetricsPrivacySegmentPlugin(analyticsId),
      });
      Logger.log('Analytics Adapter: Privacy plugin added to Segment client', {
        analyticsId,
      });
    },
  };
};
