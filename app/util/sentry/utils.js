/* eslint-disable import/no-namespace */
import * as Sentry from '@sentry/react-native';
import { Dedupe, ExtraErrorData } from '@sentry/integrations';
import extractEthJsErrorMessage from '../extractEthJsErrorMessage';
import DefaultPreference from 'react-native-default-preference';
import { regex } from '../regex';
import { AGREED, METRICS_OPT_IN } from '../../constants/storage';
import { isTest } from '../test/utils';

const METAMASK_ENVIRONMENT = process.env['METAMASK_ENVIRONMENT'] || 'local'; // eslint-disable-line dot-notation
const METAMASK_BUILD_TYPE = process.env['METAMASK_BUILD_TYPE'] || 'main'; // eslint-disable-line dot-notation

const ERROR_URL_ALLOWLIST = [
  'cryptocompare.com',
  'coingecko.com',
  'etherscan.io',
  'codefi.network',
  'segment.io',
];
/**\
 * Required instrumentation for Sentry Performance to work with React Navigation
 */
export const routingInstrumentation =
  new Sentry.ReactNavigationV5Instrumentation();

/**
 * Capture Sentry user feedback and associate ID of captured exception
 *
 * @param options.sentryId - ID of captured exception
 * @param options.comments - User's feedback/comments
 */
export const captureSentryFeedback = ({ sentryId, comments }) => {
  const userFeedback = {
    event_id: sentryId,
    name: '',
    email: '',
    comments,
  };
  Sentry.captureUserFeedback(userFeedback);
};

function getProtocolFromURL(url) {
  return new URL(url).protocol;
}

function rewriteBreadcrumb(breadcrumb) {
  if (breadcrumb.data?.url) {
    breadcrumb.data.url = getProtocolFromURL(breadcrumb.data.url);
  }
  if (breadcrumb.data?.to) {
    breadcrumb.data.to = getProtocolFromURL(breadcrumb.data.to);
  }
  if (breadcrumb.data?.from) {
    breadcrumb.data.from = getProtocolFromURL(breadcrumb.data.from);
  }

  return breadcrumb;
}

function rewriteErrorMessages(report, rewriteFn) {
  // rewrite top level message
  if (typeof report.message === 'string') {
    /** @todo parse and remove/replace URL(s) found in report.message  */
    report.message = rewriteFn(report.message);
  }
  // rewrite each exception message
  if (report.exception && report.exception.values) {
    report.exception.values.forEach((item) => {
      if (typeof item.value === 'string') {
        item.value = rewriteFn(item.value);
      }
    });
  }
}

function simplifyErrorMessages(report) {
  rewriteErrorMessages(report, (errorMessage) => {
    // simplify ethjs error messages
    let simplifiedErrorMessage = extractEthJsErrorMessage(errorMessage);
    // simplify 'Transaction Failed: known transaction'
    if (
      simplifiedErrorMessage.indexOf(
        'Transaction Failed: known transaction',
      ) === 0
    ) {
      // cut the hash from the error message
      simplifiedErrorMessage = 'Transaction Failed: known transaction';
    }
    return simplifiedErrorMessage;
  });
}

function removeDeviceTimezone(report) {
  if (report.contexts && report.contexts.device)
    report.contexts.device.timezone = null;
}

function removeDeviceName(report) {
  if (report.contexts && report.contexts.device)
    report.contexts.device.name = null;
}

/**
 * Removes SES from the Sentry error event stack trace.
 * By default, SES is shown as the top level frame, which can obscure errors.
 * We filter it out by identifying the SES stack trace frame simply by 'filename',
 * since the 'context_line' is rather verbose.
 * @param {*} report - the error event
 */
function removeSES(report) {
  const stacktraceFrames = report?.exception?.values[0]?.stacktrace?.frames;
  if (stacktraceFrames) {
    const filteredFrames = stacktraceFrames.filter(
      (frame) => frame.filename !== 'app:///ses.cjs',
    );
    report.exception.values[0].stacktrace.frames = filteredFrames;
  }
}

function rewriteReport(report) {
  try {
    // filter out SES from error stack trace
    removeSES(report);
    // simplify certain complex error messages (e.g. Ethjs)
    simplifyErrorMessages(report);
    // remove urls from error message
    sanitizeUrlsFromErrorMessages(report);
    // Remove evm addresses from error message.
    // Note that this is redundent with data scrubbing we do within our sentry dashboard,
    // but putting the code here as well gives public visibility to how we are handling
    // privacy with respect to sentry.
    sanitizeAddressesFromErrorMessages(report);
    // remove device timezone
    removeDeviceTimezone(report);
    // remove device name
    removeDeviceName(report);
  } catch (err) {
    console.error('ENTER ERROR OF REPORT ', err);
    throw err;
  }

  return report;
}

/**
 * This function excludes events from being logged in the performance portion of the app.
 * @param {*} event - to be logged
 * @returns {(event|null)}
 */
export function excludeEvents(event) {
  //Modify or drop event here
  if (event?.transaction === 'Route Change') {
    //Route change is dropped because is does not reflect a screen we can action on.
    //Don't send the event to Sentry
    return null;
  }

  return event;
}

function sanitizeUrlsFromErrorMessages(report) {
  rewriteErrorMessages(report, (errorMessage) => {
    const urlsInMessage = errorMessage.match(regex.sanitizeUrl);

    urlsInMessage?.forEach((url) => {
      if (!ERROR_URL_ALLOWLIST.some((allowedUrl) => url.match(allowedUrl))) {
        errorMessage.replace(url, '**');
      }
    });
    return errorMessage;
  });
}

function sanitizeAddressesFromErrorMessages(report) {
  rewriteErrorMessages(report, (errorMessage) => {
    const newErrorMessage = errorMessage.replace(
      regex.replaceNetworkErrorSentry,
      '**',
    );
    return newErrorMessage;
  });
}

/**
 * Derives the Sentry environment based on input parameters.
 * This function is similar to the environment logic used in MetaMask extension.
 * - https://github.com/MetaMask/metamask-extension/blob/34375a57e558853aab95fe35d5f278aa52b66636/app/scripts/lib/setupSentry.js#L91
 *
 * @param {boolean} isDev - Represents if the current environment is development (__DEV__ global variable).
 * @param {string} [metamaskEnvironment='local'] - The environment MetaMask is running in
 *                                                  (process.env.METAMASK_ENVIRONMENT).
 *                                                  It defaults to 'local' if not provided.
 * @param {string} [metamaskBuildType='main'] - The build type of MetaMask
 *                                              (process.env.METAMASK_BUILD_TYPE).
 *                                              It defaults to 'main' if not provided.
 *
 * @returns {string} - "metamaskEnvironment-metamaskBuildType" or just "metamaskEnvironment" if the build type is "main".
 */
export function deriveSentryEnvironment(
  isDev,
  metamaskEnvironment = 'local',
  metamaskBuildType = 'main',
) {
  if (isDev || !metamaskEnvironment) {
    return 'development';
  }

  if (metamaskBuildType === 'main') {
    return metamaskEnvironment;
  }

  return `${metamaskEnvironment}-${metamaskBuildType}`;
}

// Setup sentry remote error reporting
export function setupSentry() {
  // Disable Sentry for E2E tests
  if (isTest) {
    return;
  }

  const init = async () => {
    const dsn = process.env.MM_SENTRY_DSN;

    const metricsOptIn = await DefaultPreference.get(METRICS_OPT_IN);

    const integrations = [new Dedupe(), new ExtraErrorData()];
    const environment = deriveSentryEnvironment(
      __DEV__,
      METAMASK_ENVIRONMENT,
      METAMASK_BUILD_TYPE,
    );

    Sentry.init({
      dsn,
      debug: __DEV__,
      environment,
      integrations:
        metricsOptIn === AGREED
          ? [
              ...integrations,
              new Sentry.ReactNativeTracing({
                routingInstrumentation,
              }),
            ]
          : integrations,
      tracesSampleRate: 0.04,
      beforeSend: (report) => rewriteReport(report),
      beforeBreadcrumb: (breadcrumb) => rewriteBreadcrumb(breadcrumb),
      beforeSendTransaction: (event) => excludeEvents(event),
    });
  };
  init();
}

// eslint-disable-next-line no-empty-function
export function deleteSentryData() {}
