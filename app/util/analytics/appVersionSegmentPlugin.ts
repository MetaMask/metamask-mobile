import {
  Plugin,
  PluginType,
  SegmentClient,
  SegmentEvent,
} from '@segment/analytics-react-native';
import getAnalyticsAppVersion from '../metrics/getAnalyticsAppVersion';

/**
 * Enrichment plugin that overrides Segment `context.app.version` with the
 * analytics App Version (environment-suffixed for non-production builds).
 *
 * Maps to Mixpanel `app_version_string`. Does not change native bundle version.
 *
 * @example
 * createPlatformAdapter([getBrazePlugin(), new AppVersionSegmentPlugin()]);
 */
class AppVersionSegmentPlugin extends Plugin {
  type = PluginType.enrichment;

  configure(analytics: SegmentClient) {
    super.configure(analytics);
  }

  async execute(event: SegmentEvent): Promise<SegmentEvent> {
    const analyticsAppVersion = getAnalyticsAppVersion();
    const existingContext = event.context ?? {};
    const existingApp =
      existingContext.app && typeof existingContext.app === 'object'
        ? existingContext.app
        : {};

    event.context = {
      ...existingContext,
      app: {
        ...existingApp,
        version: analyticsAppVersion,
      },
    };

    return event;
  }
}

export default AppVersionSegmentPlugin;
