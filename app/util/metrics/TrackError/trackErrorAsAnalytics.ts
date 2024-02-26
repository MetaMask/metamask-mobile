import { EVENT_NAME, MetaMetrics } from '../../../core/Analytics';
import { InteractionManager } from 'react-native';

/**
 * This functions logs errors to Metametrics instead of Sentry log service.
 * The goal is to log errors (that are not errors from our side) like “Invalid Password”.
 * An error like this generally means a user inserted the wrong password, so logging to sentry doesn't make sense.
 * But we still want to log this to analytics to be aware of a rapid increase which may mean it's an error from our side, for example, an error with the encryption library.
 * @param event the original event to track
 * @param errorMessage the error message for the original event
 * @param otherInfo other info to be logged
 */
const trackErrorAsAnalytics = (
  type: string,
  errorMessage: string,
  otherInfo?: string,
) => {
  InteractionManager.runAfterInteractions(async () => {
    MetaMetrics.getInstance().trackEvent(
      { category: EVENT_NAME.ERROR },
      {
        error: true,
        type,
        errorMessage,
        ...(otherInfo && { otherInfo }),
      },
    );
  });
};

export default trackErrorAsAnalytics;
