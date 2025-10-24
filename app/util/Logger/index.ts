import {
  addBreadcrumb,
  captureException,
  withScope,
} from '@sentry/react-native';
import StorageWrapper from '../../store/storage-wrapper';
import { METRICS_OPT_IN, AGREED, DEBUG } from '../../constants/storage';

interface ExtraInfo {
  message?: string;
  [key: string]: unknown;
}

/**
 * Enhanced error logging options for Sentry.
 *
 * This interface enables teams to create searchable, filterable error dashboards
 * by organizing error metadata into tags (indexed), context (structured), and extras (display-only).
 *
 * @example
 * // Searchable tags for filtering and grouping
 * Logger.error(error, {
 *   tags: {
 *     feature: 'perps',
 *     provider: 'hyperliquid',
 *     network: 'mainnet',
 *   },
 *   context: {
 *     name: 'perps_operation',
 *     data: {
 *       method: 'placeOrder',
 *       orderType: 'limit',
 *     },
 *   },
 *   extras: {
 *     fullResponse: {...}, // Non-searchable debug data
 *   },
 * });
 *
 * @see https://docs.sentry.io/platforms/javascript/enriching-events/
 */
export interface LoggerErrorOptions {
  /**
   * Searchable key-value pairs for filtering in Sentry dashboards.
   * Use for: team identifiers, provider names, environment, error categories.
   *
   * Tags are indexed and enable queries like: `feature:perps provider:hyperliquid`
   */
  tags?: Record<string, string | number>;

  /**
   * Structured data grouped under a namespace (searchable in Sentry).
   * Use for: related metadata grouped logically, operation-specific details.
   *
   * Context is searchable via: `context.perps_operation.method:placeOrder`
   */
  context?: { name: string; data: Record<string, unknown> };

  /**
   * Display-only additional data (NOT searchable in Sentry).
   * Use for: large payloads, debug info, non-filterable metadata.
   */
  extras?: Record<string, unknown>;
}

/**
 * Wrapper class that allows us to override
 * console.log and console.error and in the future
 * we will have flags to do different actions based on
 * the environment, for ex. log to a remote server if prod
 *
 * The previously available message function has been removed
 * favoring the use of the error or log function:
 * - error: for logging errors that you want to see in Sentry,
 * - log: for logging general information and sending breadcrumbs only with the next Sentry event.
 */
export class AsyncLogger {
  /**
   * console.log wrapper
   *
   * @param {object} args - data to be logged
   * @returns - void
   */
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static async log(...args: any[]): Promise<void> {
    if (__DEV__) {
      args.unshift(DEBUG);
      console.log.apply(null, args); // eslint-disable-line no-console
      return;
    }

    // Check if user passed accepted opt-in to metrics
    const metricsOptIn = await StorageWrapper.getItem(METRICS_OPT_IN);
    if (metricsOptIn === AGREED) {
      addBreadcrumb({
        message: JSON.stringify(args),
      });
    }
  }

  /**
   * console.error wrapper
   *
   * Supports both legacy format (all fields as extras) and new format (tags + context + extras)
   * for backward compatibility.
   *
   * @param {Error} error - Error object to be logged
   * @param {string|object|LoggerErrorOptions} extra - Extra error info
   *
   * - Legacy: string or object → set as extras (display only)
   * - New: LoggerErrorOptions with tags/context/extras → searchable in Sentry
   *
   * @returns - void
   * @example Legacy (backward compatible)
   * Logger.error(error, { feature: 'perps', provider: 'hyperliquid' });
   * @example New (searchable)
   * Logger.error(error, {
   *   tags: { feature: 'perps', provider: 'hyperliquid' },
   *   context: { name: 'operation', data: { method: 'placeOrder' } },
   * });
   */
  static async error(
    error: Error,
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    extra?: ExtraInfo | string | LoggerErrorOptions | any,
  ): Promise<void> {
    if (__DEV__) {
      console.warn(DEBUG, error); // eslint-disable-line no-console
      return;
    }

    if (!error) {
      return console.warn('No error provided');
    }

    // Check if user passed accepted opt-in to metrics
    const metricsOptIn = await StorageWrapper.getItem(METRICS_OPT_IN);
    if (metricsOptIn === AGREED) {
      let exception = error;

      // Continue handling non Error cases to prevent breaking changes
      if (!(error instanceof Error)) {
        if (typeof error === 'string') {
          exception = new Error(error);
        } else {
          // error is an object but not an Error instance
          exception = new Error(JSON.stringify(error));
        }
        // TODO: Replace "any" with type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (exception as any).originalError = error;
      }

      if (extra) {
        withScope((scope) => {
          // Detect new format: has valid tags, context, or extras with correct types
          // Type guards prevent misclassifying legacy objects with same key names
          const isNewFormat =
            typeof extra === 'object' &&
            extra !== null &&
            (('tags' in extra &&
              typeof extra.tags === 'object' &&
              extra.tags !== null) ||
              ('context' in extra &&
                typeof extra.context === 'object' &&
                extra.context !== null &&
                'name' in extra.context &&
                typeof extra.context.name === 'string' &&
                'data' in extra.context &&
                typeof extra.context.data === 'object' &&
                extra.context.data !== null) ||
              ('extras' in extra &&
                typeof extra.extras === 'object' &&
                extra.extras !== null));

          if (isNewFormat) {
            // New API: Set tags, context, and extras separately
            const options = extra as LoggerErrorOptions;

            if (options.tags) {
              Object.entries(options.tags).forEach(([key, value]) => {
                scope.setTag(key, String(value));
              });
            }

            if (options.context) {
              scope.setContext(options.context.name, options.context.data);
            }

            // Merge explicit extras and unknown fields into a single object
            // to avoid overwriting (setExtras replaces, doesn't merge)
            const allExtras: Record<string, unknown> = {
              ...(options.extras || {}),
            };

            // Preserve unknown fields as extras for backward compatibility
            const knownKeys = ['tags', 'context', 'extras'];
            const unknownFields = Object.keys(extra).filter(
              (key) => !knownKeys.includes(key),
            );
            unknownFields.forEach((key) => {
              allExtras[key] = extra[key];
            });

            // Single setExtras call to avoid data loss
            if (Object.keys(allExtras).length > 0) {
              scope.setExtras(allExtras);
            }
          } else {
            // Legacy API: Set everything as extras (current behavior)
            const extras: ExtraInfo =
              typeof extra === 'string' ? { message: extra } : extra;
            scope.setExtras(extras);
          }

          captureException(exception);
        });
      } else {
        captureException(exception);
      }
    }
  }
}

export default class Logger {
  /**
   * console.log wrapper
   *
   * @param {object} args - data to be logged
   * @returns - void
   */
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static log(...args: any[]) {
    AsyncLogger.log(...args).catch(() => {
      // ignore error but avoid dangling promises
    });
  }

  /**
   * console.error wrapper
   *
   * @param {Error} error - Error to be logged
   * @param {string|object|LoggerErrorOptions} extra - Extra error info
   * @returns - void
   */
  static error(
    error: Error,
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    extra?: ExtraInfo | string | LoggerErrorOptions | any,
  ) {
    AsyncLogger.error(error, extra).catch(() => {
      // ignore error but avoid dangling promises
    });
  }
}
