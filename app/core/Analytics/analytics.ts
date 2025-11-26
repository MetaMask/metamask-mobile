import type {
  AnalyticsEventProperties,
  AnalyticsUserTraits,
  AnalyticsTrackingEvent,
} from '@metamask/analytics-controller';
import Engine from '../Engine/Engine';
import type { RootExtendedMessenger } from '../Engine/types';
import { whenEngineReady } from './whenEngineReady';
import Logger from '../../util/Logger';
import type { AnalyticsHelper, AnalyticsDefaults } from './analytics.types';
import ReduxService from '../redux/ReduxService';
import {
  selectAnalyticsId,
  selectAnalyticsEnabled,
  selectAnalyticsOptedInForRegularAccount,
  selectAnalyticsOptedInForSocialAccount,
} from '../../selectors/analyticsController';
import { v4 as uuidv4 } from 'uuid';
import StorageWrapper from '../../store/storage-wrapper';
import {
  ANALYTICS_ID,
  ANALYTICS_OPTED_IN_REGULAR,
  ANALYTICS_OPTED_IN_SOCIAL,
} from '../../constants/storage';

// Export AnalyticsEventBuilder for creating events compatible with this analytics module
export { AnalyticsEventBuilder } from './AnalyticsEventBuilder';

/**
 * Queued analytics operation
 */
interface QueuedOperation {
  action: string;
  args: unknown[];
}

/**
 * Private state for analytics module
 */
let messenger: RootExtendedMessenger | null = null;
let messengerReady: Promise<void> | null = null;
const queue: QueuedOperation[] = [];
let processing = false;

/**
 * Run a queued operation
 *
 * @param messengerInstance - The messenger to use
 * @param action - The action name
 * @param args - The action arguments
 */
const executeQueuedOperation = (
  messengerInstance: RootExtendedMessenger,
  action: string,
  args: unknown[],
): void => {
  switch (action) {
    case 'trackEvent': {
      const [event] = args as [AnalyticsTrackingEvent];
      messengerInstance.call('AnalyticsController:trackEvent', event);
      break;
    }
    case 'trackView': {
      const [name, properties] = args as [string, AnalyticsEventProperties?];
      messengerInstance.call('AnalyticsController:trackView', name, properties);
      break;
    }
    case 'identify': {
      const [traits] = args as [AnalyticsUserTraits?];
      messengerInstance.call('AnalyticsController:identify', traits);
      break;
    }
    case 'optInForRegularAccount':
      messengerInstance.call('AnalyticsController:optInForRegularAccount');
      break;
    case 'optOutForRegularAccount':
      messengerInstance.call('AnalyticsController:optOutForRegularAccount');
      break;
    case 'optInForSocialAccount':
      messengerInstance.call('AnalyticsController:optInForSocialAccount');
      break;
    case 'optOutForSocialAccount':
      messengerInstance.call('AnalyticsController:optOutForSocialAccount');
      break;
    default:
      // Unknown action is a programming error - log to Sentry for investigation
      Logger.error(
        new Error(`Unknown analytics action: ${action}`),
        'Analytics: Attempted to execute unknown action',
      );
  }
};

/**
 * Process queued analytics operations
 */
const processQueue = async (): Promise<void> => {
  if (processing || queue.length === 0 || !messenger) {
    return;
  }

  processing = true;
  const messengerInstance = messenger;

  while (queue.length > 0) {
    const operation = queue.shift();
    if (!operation) {
      continue;
    }

    try {
      executeQueuedOperation(
        messengerInstance,
        operation.action,
        operation.args,
      );
    } catch (error) {
      // Queue processing failures are non-critical - analytics should not break the app
      // Log to Sentry for monitoring but continue processing other queued operations
      Logger.error(
        new Error(String(error)),
        `Analytics: Failed to process queued operation '${operation.action}' - continuing with next operation`,
      );
    }
  }

  processing = false;
};

/**
 * Wait for Engine to be ready
 */
const ensureMessengerReady = async (): Promise<void> => {
  if (messengerReady) {
    return messengerReady;
  }

  messengerReady = (async () => {
    await whenEngineReady();
    messenger = Engine.controllerMessenger;
    // Process any queued operations
    processQueue();
  })();

  return messengerReady;
};

/**
 * Add an operation to the queue
 * Runs it now if messenger is ready, or waits for Engine to be ready
 *
 * @param action - The action name
 * @param args - The action arguments
 */
const queueOperation = (action: string, ...args: unknown[]): void => {
  queue.push({ action, args });
  // Try to process queue if Engine is ready
  if (messenger) {
    processQueue();
  } else {
    // Ensure Engine is ready (will process queue when ready)
    ensureMessengerReady().catch((error) => {
      Logger.error(
        new Error(String(error)),
        'Analytics: Failed to initialize messenger - operations will remain queued',
      );
    });
  }
};

/**
 * Track an event
 *
 * @param event - Analytics tracking event
 */
const trackEvent = (event: AnalyticsTrackingEvent): void => {
  queueOperation('trackEvent', event);
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
  queueOperation('trackView', name, properties);
};

/**
 * Set user info
 *
 * @param traits - User data
 */
const identify = (traits?: AnalyticsUserTraits): void => {
  queueOperation('identify', traits);
};

/**
 * Opt in to analytics for regular account
 */
const optInForRegularAccount = (): void => {
  queueOperation('optInForRegularAccount');
};

/**
 * Opt out of analytics for regular account
 */
const optOutForRegularAccount = (): void => {
  queueOperation('optOutForRegularAccount');
};

/**
 * Opt in to analytics for social account
 */
const optInForSocialAccount = (): void => {
  queueOperation('optInForSocialAccount');
};

/**
 * Opt out of analytics for social account
 */
const optOutForSocialAccount = (): void => {
  queueOperation('optOutForSocialAccount');
};

/**
 * Get the analytics ID
 *
 * @returns Promise with the analytics ID (UUID string)
 * Returns empty string if not available
 */
const getAnalyticsId = async (): Promise<string> => {
  try {
    const analyticsId = selectAnalyticsId(ReduxService.store.getState());

    if (!analyticsId) {
      Logger.error(
        new Error(
          `AnalyticsController state has invalid analytics ID: expected UUIDv4 string, got ${JSON.stringify(analyticsId)}`,
        ),
        'Analytics: Failed to get analytics ID - state returned invalid value',
      );
      return '';
    }
    return analyticsId;
  } catch (error) {
    Logger.error(
      new Error(String(error)),
      'Analytics: Failed to get analytics ID from state',
    );
    return '';
  }
};

/**
 * Check if analytics is enabled
 *
 * Returns enabled state from AnalyticsController via Redux selector.
 *
 * @returns true if analytics is enabled, false if disabled or state unavailable
 */
const isEnabled = (): boolean => {
  try {
    return selectAnalyticsEnabled(ReduxService.store.getState()) ?? false;
  } catch (error) {
    Logger.error(
      new Error(String(error)),
      'Analytics: Failed to read analytics enabled state - returning false',
    );
    return false;
  }
};

/**
 * Check if user opted in for regular account
 *
 * @returns Promise with true if opted in, false otherwise
 */
const isOptedInForRegularAccount = async (): Promise<boolean> => {
  try {
    return (
      selectAnalyticsOptedInForRegularAccount(ReduxService.store.getState()) ??
      false
    );
  } catch (error) {
    // Default return false - analytics state read failures should not break the app
    Logger.error(
      new Error(String(error)),
      'Analytics: Failed to read opted in state for regular account - returning false',
    );
    return false;
  }
};

/**
 * Check if user opted in for social account
 *
 * @returns Promise with true if opted in, false otherwise
 */
const isOptedInForSocialAccount = async (): Promise<boolean> => {
  try {
    return (
      selectAnalyticsOptedInForSocialAccount(ReduxService.store.getState()) ??
      false
    );
  } catch (error) {
    // Default return false - analytics state read failures should not break the app
    Logger.error(
      new Error(String(error)),
      'Analytics: Failed to read opted in state for social account - returning false',
    );
    return false;
  }
};

/**
 * Generates default analytics values and stores them in MMKV via StorageWrapper if not already present.
 *
 * This function:
 * - Checks MMKV (via StorageWrapper) for existing values
 * - Generates UUIDv4 for analyticsId if missing
 * - Sets default opt-in values (false) if missing
 * - Returns all values (existing or newly generated)
 *
 * @returns Promise resolving to AnalyticsDefaults object with analyticsId and opt-in preferences
 */
const generateDefaults = async (): Promise<AnalyticsDefaults> => {
  // Read existing values from MMKV via StorageWrapper
  const existingId = await StorageWrapper.getItem(ANALYTICS_ID);
  const existingOptedInRegular = await StorageWrapper.getItem(
    ANALYTICS_OPTED_IN_REGULAR,
  );
  const existingOptedInSocial = await StorageWrapper.getItem(
    ANALYTICS_OPTED_IN_SOCIAL,
  );

  // Generate analytics ID if not present
  let analyticsId: string;
  if (existingId && typeof existingId === 'string' && existingId.length > 0) {
    analyticsId = existingId;
  } else {
    analyticsId = uuidv4();
    await StorageWrapper.setItem(ANALYTICS_ID, analyticsId, {
      emitEvent: false,
    });
  }

  // Set default opt-in values if not present
  const optedInForRegularAccount = existingOptedInRegular === 'true';
  if (existingOptedInRegular === null || existingOptedInRegular === undefined) {
    await StorageWrapper.setItem(ANALYTICS_OPTED_IN_REGULAR, 'false', {
      emitEvent: false,
    });
  }

  const optedInForSocialAccount = existingOptedInSocial === 'true';
  if (existingOptedInSocial === null || existingOptedInSocial === undefined) {
    await StorageWrapper.setItem(ANALYTICS_OPTED_IN_SOCIAL, 'false', {
      emitEvent: false,
    });
  }

  return {
    analyticsId,
    optedInForRegularAccount,
    optedInForSocialAccount,
  };
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
  optInForRegularAccount,
  optOutForRegularAccount,
  optInForSocialAccount,
  optOutForSocialAccount,
  getAnalyticsId,
  isEnabled,
  isOptedInForRegularAccount,
  isOptedInForSocialAccount,
  generateDefaults,
};
