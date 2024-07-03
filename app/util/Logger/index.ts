import {
  addBreadcrumb,
  captureException,
  withScope,
} from '@sentry/react-native';
import DefaultPreference from 'react-native-default-preference';
import { METRICS_OPT_IN, AGREED, DEBUG } from '../../constants/storage';

interface ExtraInfo {
  message?: string;
  [key: string]: unknown;
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
    const metricsOptIn = await DefaultPreference.get(METRICS_OPT_IN);
    if (metricsOptIn === AGREED) {
      addBreadcrumb({
        message: JSON.stringify(args),
      });
    }
  }

  /**
   * console.error wrapper
   *
   * @param {Error} error - Error object to be logged
   * @param {string|object} extra - Extra error info
   * @returns - void
   */
  static async error(
    error: Error,
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    extra?: ExtraInfo | string | any,
  ): Promise<void> {
    if (__DEV__) {
      console.warn(DEBUG, error); // eslint-disable-line no-console
      return;
    }

    if (!error) {
      return console.warn('No error provided');
    }

    // Check if user passed accepted opt-in to metrics
    const metricsOptIn = await DefaultPreference.get(METRICS_OPT_IN);
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
        const extras: ExtraInfo =
          typeof extra === 'string' ? { message: extra } : extra;
        withScope((scope) => {
          scope.setExtras(extras);
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
   * @param {string|object} extra - Extra error info
   * @returns - void
   */
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static error(error: Error, extra?: ExtraInfo | string | any) {
    AsyncLogger.error(error, extra).catch(() => {
      // ignore error but avoid dangling promises
    });
  }
}
