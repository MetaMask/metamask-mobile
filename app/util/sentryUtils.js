/* eslint-disable import/no-namespace */
import * as Sentry from '@sentry/react-native';
import { Dedupe, ExtraErrorData } from '@sentry/integrations';
import extractEthJsErrorMessage from './extractEthJsErrorMessage';
import DefaultPreference from 'react-native-default-preference';
import { AGREED, METRICS_OPT_IN } from '../constants/storage';

const METAMASK_ENVIRONMENT = process.env['METAMASK_ENVIRONMENT'] || 'local'; // eslint-disable-line dot-notation
const SENTRY_DSN_PROD =
  'https://ae39e4b08d464bba9fbf121c85ccfca0@sentry.io/2299799'; // metamask-mobile
const SENTRY_DSN_DEV =
  'https://332890de43e44fe2bc070bb18d0934ea@sentry.io/2651591'; // test-metamask-mobile

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

function rewriteReportUrls(report) {
  // update request url
  report.request.url = toMetamaskUrl();
  // update exception stack trace
  if (report.exception && report.exception.values) {
    report.exception.values.forEach((item) => {
      if (item.stacktrace) {
        item.stacktrace.frames.forEach((frame) => {
          frame.filename = toMetamaskUrl(frame.filename);
        });
      }
    });
  }
}

function removeDeviceTimezone(report) {
  if (report.contexts && report.contexts.device)
    report.contexts.device.timezone = null;
}

function removeDeviceName(report) {
  if (report.contexts && report.contexts.device)
    report.contexts.device.name = null;
}

function toMetamaskUrl() {
  const metamaskUrl = `metamask-mobile`;
  return metamaskUrl;
}

function rewriteReport(report) {
  try {
    // simplify certain complex error messages (e.g. Ethjs)
    simplifyErrorMessages(report);
    // remove urls from error message
    sanitizeUrlsFromErrorMessages(report);
    // Remove evm addresses from error message.
    // Note that this is redundent with data scrubbing we do within our sentry dashboard,
    // but putting the code here as well gives public visibility to how we are handling
    // privacy with respect to sentry.
    sanitizeAddressesFromErrorMessages(report);
    // modify report urls
    rewriteReportUrls(report);
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

function sanitizeUrlsFromErrorMessages(report) {
  rewriteErrorMessages(report, (errorMessage) => {
    const re =
      /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/gu;

    const urlsInMessage = errorMessage.match(re);

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
    const newErrorMessage = errorMessage.replace(/0x[A-Fa-f0-9]{40}/u, '**');
    return newErrorMessage;
  });
}

// Setup sentry remote error reporting
export function setupSentry() {
  const init = async () => {
    const environment =
      __DEV__ || !METAMASK_ENVIRONMENT ? 'development' : METAMASK_ENVIRONMENT;
    const dsn = environment === 'production' ? SENTRY_DSN_PROD : SENTRY_DSN_DEV;

    const metricsOptIn = await DefaultPreference.get(METRICS_OPT_IN);

    const integrations = [new Dedupe(), new ExtraErrorData()];

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
      tracesSampleRate: 0.2,
      beforeSend: (report) => rewriteReport(report),
      beforeBreadcrumb: (breadcrumb) => rewriteBreadcrumb(breadcrumb),
    });
  };
  init();
}

// eslint-disable-next-line no-empty-function
export function deleteSentryData() {}
