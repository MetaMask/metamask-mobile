import {
  type AnalyticsEventProperties,
  type AnalyticsUserTraits,
  analyticsControllerSelectors,
} from '@metamask/analytics-controller';
import Engine from '../../core/Engine/Engine';
import { whenEngineReady } from '../../core/Analytics/whenEngineReady';
import { getAnalyticsId as getAnalyticsIdFromStorage } from './analyticsId';
import { store } from '../../store';
import {
  selectAnalyticsEnabled,
  selectAnalyticsOptedIn,
} from '../../selectors/analyticsController';
import type { AnalyticsTrackingEvent } from './AnalyticsEventBuilder';
import { createAnalyticsQueueManager } from './queue';
import Logger from '../Logger';

/**
 * Analytics helper interface
 */
export interface AnalyticsHelper {
  trackEvent: (event: AnalyticsTrackingEvent) => void;
  trackView: (name: string, properties?: AnalyticsEventProperties) => void;
  identify: (traits?: AnalyticsUserTraits) => void;
  optIn: () => void;
  optOut: () => void;
  getAnalyticsId: () => Promise<string>;
  isEnabled: () => boolean;
  isOptedIn: () => Promise<boolean>;
}

/**
 * Create singleton queue manager instance
 */
const queueManager = createAnalyticsQueueManager({
  getEngineMessenger: () => Engine.controllerMessenger,
  whenEngineReady,
});

/**
 * Track an event
 *
 * @param event - AnalyticsTrackingEvent to track
 */
const trackEvent = (event: AnalyticsTrackingEvent): void => {
  queueManager.queueOperation('trackEvent', event).catch((error) => {
    Logger.log('Analytics: Unhandled error in trackEvent', error);
  });
};

/**
 * Track a screen view
 *
 * @param name - Screen name
 * @param properties - Screen data
 */
const trackView = (
  name: string,
  properties?: AnalyticsEventProperties,
): void => {
  queueManager.queueOperation('trackView', name, properties).catch((error) => {
    Logger.log('Analytics: Unhandled error in trackView', error);
  });
};

/**
 * Set user info
 *
 * @param traits - User data
 */
const identify = (traits?: AnalyticsUserTraits): void => {
  queueManager.queueOperation('identify', traits).catch((error) => {
    Logger.log('Analytics: Unhandled error in identify', error);
  });
};

/**
 * Opt in to analytics
 */
const optIn = (): void => {
  queueManager.queueOperation('optIn').catch((error) => {
    Logger.log('Analytics: Unhandled error in optIn', error);
  });
};

/**
 * Opt out of analytics
 */
const optOut = (): void => {
  queueManager.queueOperation('optOut').catch((error) => {
    Logger.log('Analytics: Unhandled error in optOut', error);
  });
};

/**
 * Get the analytics ID
 *
 * @returns Promise with the analytics ID (UUID string)
 * Always returns a valid UUIDv4 - generates a new one if none exists
 */
const getAnalyticsId = async (): Promise<string> =>
  await getAnalyticsIdFromStorage();

/**
 * Check if analytics is enabled
 *
 * Returns enabled state from controller using selector.
 *
 * @returns true if analytics is enabled, false if disabled or state not available
 */
const isEnabled = (): boolean => {
  try {
    const reduxState = store.getState();
    const enabled = selectAnalyticsEnabled(reduxState);
    // Also check Engine state directly as fallback (in case Redux hasn't synced yet)
    const engineState = Engine.state?.AnalyticsController;
    const engineEnabled =
      engineState && analyticsControllerSelectors.selectEnabled(engineState);

    // Use Engine state as fallback if Redux state is not available
    return enabled ?? engineEnabled ?? false;
  } catch (error) {
    Logger.log(
      'Analytics: Failed to check if analytics is enabled - returning false',
      error,
    );
    return false;
  }
};

/**
 * Check if user opted in
 *
 * @returns Promise with true if opted in, false otherwise
 */
const isOptedIn = async (): Promise<boolean> => {
  try {
    const optedIn = selectAnalyticsOptedIn(store.getState());
    return optedIn ?? false;
  } catch (error) {
    // Default return false - analytics state check failures should not break the app
    Logger.log(
      'Analytics: Failed to check if user has opted in - returning false',
      error,
    );
    return false;
  }
};

/**
 * Analytics helper
 * Queues operations when Engine is not ready and runs them when ready
 * TODO: replace MetaMetrics later when all features are migrated to new analytics
 */
export const analytics: AnalyticsHelper = {
  trackEvent,
  trackView,
  identify,
  optIn,
  optOut,
  getAnalyticsId,
  isEnabled,
  isOptedIn,
};
