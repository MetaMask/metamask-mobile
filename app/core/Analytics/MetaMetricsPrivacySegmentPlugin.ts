import {
  EventType,
  Plugin,
  PluginType,
  SegmentClient,
  SegmentEvent,
} from '@segment/analytics-react-native';
import METAMETRICS_ANONYMOUS_ID from './MetaMetrics.constants';

/**
 * Plugin to replace the user id with anonymous id for anonymous events
 *
 * The "enrichment" type makes it execute as the first level of event processing.
 *
 * @example
 * const segmentClient = createClient(config);
 * segmentClient?.add({plugin: new MetaMetricsPrivacySegmentPlugin()});
 */
class MetaMetricsPrivacySegmentPlugin extends Plugin {
  type = PluginType.enrichment;

  configure(analytics: SegmentClient) {
    super.configure(analytics);
  }

  /**
   * This method is called for every event that is sent to Segment.
   *
   * It updates user ID only when we track anonymous events.
   *
   * @param event the event that is piped through this plugin
   */
  async execute(event: SegmentEvent): Promise<SegmentEvent> {
    // Set anonymousId to be our own "all zeros" id for all events
    // Segment SDK already sets anonymousId for all events,
    // see https://segment.com/docs/connections/spec/best-practices-identify/#anonymousid-generation
    // but segment anonymous id has a different meaning than ours:
    // - ours is used to have an identical id for all users when we want events to be anonymous
    // - segment's is used to identify a user when they are not logged in and allows to merge events when they log in
    // We need to set it to our own anonymous value to make sure Segment SDK never uses it's own random UUID.
    this.analytics?.userInfo.set({ anonymousId: METAMETRICS_ANONYMOUS_ID });

    // We only update user id in track events, otherwise return event as is.
    if (event.type !== EventType.TrackEvent) {
      return event;
    }

    if (event.properties?.anonymous) {
      event.userId = METAMETRICS_ANONYMOUS_ID;
    }
    // We remove the anonymous property from the event properties once we have read it
    // so that it is not sent to Segment
    delete event.properties?.anonymous;
    return event;
  }
}

export default MetaMetricsPrivacySegmentPlugin;
