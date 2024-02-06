import {
  EVENT_NAME,
  IMetaMetricsEvent,
  MetaMetrics,
} from '../../../core/Analytics';
import Logger from '../../Logger';
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
  event: IMetaMetricsEvent,
  errorMessage: string,
  otherInfo?: string,
) => {
  try {
    InteractionManager.runAfterInteractions(async () => {
      MetaMetrics.getInstance().trackEvent(EVENT_NAME.ERROR, {
        error: true,
        event: event.category,
        errorMessage,
        ...(otherInfo && { otherInfo }),
      });
    });
  } catch (error) {
    Logger.error(error, 'Error logging analytics - trackErrorAsAnalytics');
  }
};

export default trackErrorAsAnalytics;
