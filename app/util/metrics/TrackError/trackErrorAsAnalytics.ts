import { EVENT_NAME } from '../../../core/Analytics';
import { AnalyticsEventBuilder } from '../../../util/analytics/AnalyticsEventBuilder';
import { analytics } from '../../../util/analytics/analytics';
import { InteractionManager } from 'react-native';
import { shouldTrackExpectedErrors } from '../shouldTrackExpectedErrors/shouldTrackExpectedErrors';

/**
 * This functions logs errors to analytics instead of Sentry log service.
 * The goal is to log errors (that are not errors from our side) like "Invalid Password".
 * An error like this generally means a user inserted the wrong password, so logging to sentry doesn't make sense.
 * But we still want to log this to analytics to be aware of a rapid increase which may mean it's an error from our side, for example, an error with the encryption library.
 * @param type the original event name to track
 * @param errorMessage the error message for the original event
 * @param otherInfo other info to be logged
 */
const trackErrorAsAnalytics = async (
  type: string,
  errorMessage: string,
  otherInfo?: string,
) => {
  const shouldTrack = await shouldTrackExpectedErrors();
  if (!shouldTrack) return;

  InteractionManager.runAfterInteractions(async () => {
    analytics.trackEvent(
      AnalyticsEventBuilder.createEventBuilder({ category: EVENT_NAME.ERROR })
        .addProperties({
          error: true,
          type,
          errorMessage,
          ...(otherInfo && { otherInfo }),
        })
        .build(),
    );
  });
};

export default trackErrorAsAnalytics;
