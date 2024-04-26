import { MetaMetricsEvents } from '../../core/Analytics';

/**
 * These types determine how the method tracking middleware handles incoming
 * requests based on the method name.
 */
const RATE_LIMIT_TYPES = {
  TIMEOUT: 'timeout',
  BLOCKED: 'blocked',
  NON_RATE_LIMITED: 'non_rate_limited',
  RANDOM_SAMPLE: 'random_sample',
};

/**
 * This object maps a method name to a RATE_LIMIT_TYPE. If not in this map the
 * default is 'RATE_LIMITED'
 */
const RATE_LIMIT_MAP = {
  eth_sign: RATE_LIMIT_TYPES.NON_RATE_LIMITED,
  eth_signTypedData: RATE_LIMIT_TYPES.NON_RATE_LIMITED,
  eth_signTypedData_v3: RATE_LIMIT_TYPES.NON_RATE_LIMITED,
  eth_signTypedData_v4: RATE_LIMIT_TYPES.NON_RATE_LIMITED,
  personal_sign: RATE_LIMIT_TYPES.NON_RATE_LIMITED,
  eth_decrypt: RATE_LIMIT_TYPES.NON_RATE_LIMITED,
  eth_getEncryptionPublicKey: RATE_LIMIT_TYPES.NON_RATE_LIMITED,
  eth_requestAccounts: RATE_LIMIT_TYPES.TIMEOUT,
  wallet_requestPermissions: RATE_LIMIT_TYPES.TIMEOUT,
  metamask_sendDomainMetadata: RATE_LIMIT_TYPES.BLOCKED,
  metamask_getProviderState: RATE_LIMIT_TYPES.BLOCKED,
  metamask_injectHomepageScripts: RATE_LIMIT_TYPES.BLOCKED,
  metamask_logWeb3ShimUsage: RATE_LIMIT_TYPES.BLOCKED,
  eth_chainId: RATE_LIMIT_TYPES.BLOCKED,
  eth_accounts: RATE_LIMIT_TYPES.BLOCKED,
};

const rateLimitTimeoutsByMethod = {};
let globalRateLimitCount = 0;

/**
 * Returns a middleware that tracks inpage_provider usage using sampling for
 * each type of event except those that require user interaction, such as
 * signature requests
 *
 * @param {object} opts - options for the rpc method tracking middleware
 * @param {MetaMetrics} opts.metrics - the MetaMetrics instance
 * @param {number} [opts.rateLimitTimeout] - time, in milliseconds, to wait before
 *  allowing another set of events to be tracked for methods rate limited by timeout.
 * @param {number} [opts.rateLimitSamplePercent] - percentage, in decimal, of events
 *  that should be tracked for methods rate limited by random sample.
 * @param {number} [opts.globalRateLimitTimeout] - time, in milliseconds, of the sliding
 * time window that should limit the number of method calls tracked to globalRateLimitMaxAmount.
 * @param {number} [opts.globalRateLimitMaxAmount] - max number of method calls that should
 * tracked within the globalRateLimitTimeout time window.
 * @returns {Function}
 */
export default function createRPCMethodTrackingMiddleware({
  metrics,
  rateLimitTimeout = 60 * 5 * 1000, // 5 minutes
  rateLimitSamplePercent = 0.001, // 0.1%
  globalRateLimitTimeout = 60 * 5 * 1000, // 5 minutes
  globalRateLimitMaxAmount = 10, // max of events in the globalRateLimitTimeout window. pass 0 for no global rate limit
}) {
  return async function rpcMethodTrackingMiddleware(
    /** @type {any} */ req,
    /** @type {any} */ res,
    /** @type {Function} */ next,
  ) {
    const { origin, method } = req;

    const rateLimitType =
      RATE_LIMIT_MAP[method] ?? RATE_LIMIT_TYPES.RANDOM_SAMPLE;

    let isRateLimited;
    switch (rateLimitType) {
      case RATE_LIMIT_TYPES.TIMEOUT:
        isRateLimited =
          typeof rateLimitTimeoutsByMethod[method] !== 'undefined';
        break;
      case RATE_LIMIT_TYPES.NON_RATE_LIMITED:
        isRateLimited = false;
        break;
      case RATE_LIMIT_TYPES.BLOCKED:
        isRateLimited = true;
        break;
      default:
      case RATE_LIMIT_TYPES.RANDOM_SAMPLE:
        isRateLimited = Math.random() >= rateLimitSamplePercent;
        break;
    }

    const isGlobalRateLimited =
      globalRateLimitMaxAmount > 0 &&
      globalRateLimitCount >= globalRateLimitMaxAmount;

    // Get the participateInMetaMetrics state to determine if we should track
    // anything. This is extra redundancy because this value is checked in
    // the metametrics controller's trackEvent method as well.
    const userParticipatingInMetaMetrics = metrics.isEnabled();

    const shouldTrackEvent =
      // Don't track if the rate limit has been hit
      !isRateLimited &&
      // Don't track if the global rate limit has been hit
      !isGlobalRateLimited &&
      // Don't track if the user isn't participating in metametrics
      userParticipatingInMetaMetrics === true;

    if (shouldTrackEvent) {
      metrics.trackEvent(MetaMetricsEvents.PROVIDER_METHOD_CALLED, {
        referrer: {
          url: origin,
        },
        properties: {
          method,
        },
      });

      if (rateLimitType === RATE_LIMIT_TYPES.TIMEOUT) {
        rateLimitTimeoutsByMethod[method] = setTimeout(() => {
          delete rateLimitTimeoutsByMethod[method];
        }, rateLimitTimeout);
      }

      globalRateLimitCount += 1;
      setTimeout(() => {
        globalRateLimitCount -= 1;
      }, globalRateLimitTimeout);
    }

    next();
  };
}
