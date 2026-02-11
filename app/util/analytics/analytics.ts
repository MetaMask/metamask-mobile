import {
  type AnalyticsEventProperties,
  type AnalyticsUserTraits,
  analyticsControllerSelectors,
} from '@metamask/analytics-controller';
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
  optIn: () => Promise<void>;
  optOut: () => Promise<void>;
  getAnalyticsId: () => Promise<string>;
  isEnabled: () => boolean;
  isOptedIn: () => Promise<boolean>;
}

/**
 * Lazy import Engine to avoid circular dependencies
 * Engine is only accessed at runtime, not at module load time
 */
const getEngine = () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('../../core/Engine/Engine').default;

/**
 * Create singleton queue manager instance
 */
const queueManager = createAnalyticsQueueManager({
  getEngineMessenger: () => getEngine().controllerMessenger,
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
 * Returns a promise that resolves when the opt-in operation has been processed
 */
const optIn = async (): Promise<void> => {
  try {
    await queueManager.queueOperation('optIn');
    // Wait for state to propagate after optIn is processed
    // This ensures isEnabled() returns true before subsequent trackEvent calls
    await new Promise((resolve) => setTimeout(resolve, 0));
  } catch (error) {
    Logger.log('Analytics: Unhandled error in optIn', error);
  }
};

/**
 * Opt out of analytics
 * Returns a promise that resolves when the opt-out operation has been processed
 */
const optOut = async (): Promise<void> => {
  try {
    await queueManager.queueOperation('optOut');
    // Wait for state to propagate after optOut is processed
    await new Promise((resolve) => setTimeout(resolve, 0));
  } catch (error) {
    Logger.log('Analytics: Unhandled error in optOut', error);
  }
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
    const engineState = getEngine().state?.AnalyticsController;
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
