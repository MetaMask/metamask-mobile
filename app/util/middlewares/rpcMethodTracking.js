import { MetaMetricsEvents } from '../../core/Analytics';

/**
 * These types determine how the method tracking middleware handles incoming
 * requests based on the method name. There are three options right now but
 * the types could be expanded to cover other options in the future.
 */
const RATE_LIMIT_TYPES = {
  RATE_LIMITED: 'rate_limited',
  BLOCKED: 'blocked',
  NON_RATE_LIMITED: 'non_rate_limited',
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
  eth_requestAccounts: RATE_LIMIT_TYPES.RATE_LIMITED,
  wallet_requestPermissions: RATE_LIMIT_TYPES.RATE_LIMITED,
  metamask_sendDomainMetadata: RATE_LIMIT_TYPES.BLOCKED,
  metamask_getProviderState: RATE_LIMIT_TYPES.BLOCKED,
  metamask_injectHomepageScripts: RATE_LIMIT_TYPES.BLOCKED,
};

const rateLimitTimeouts = {};

/**
 * Returns a middleware that tracks inpage_provider usage using sampling for
 * each type of event except those that require user interaction, such as
 * signature requests
 *
 * @param {object} opts - options for the rpc method tracking middleware
 * @param {MetaMetrics} opts.metrics - the MetaMetrics instance
 * @param {number} [opts.rateLimitSeconds] - number of seconds to wait before
 *  allowing another set of events to be tracked.
 * @returns {Function}
 */
export default function createRPCMethodTrackingMiddleware({
  metrics,
  rateLimitSeconds = 60 * 5,
}) {
  return async function rpcMethodTrackingMiddleware(
    /** @type {any} */ req,
    /** @type {any} */ res,
    /** @type {Function} */ next,
  ) {
    const { origin, method } = req;

    // Determine what type of rate limit to apply based on method
    const rateLimitType =
      RATE_LIMIT_MAP[method] ?? RATE_LIMIT_TYPES.RATE_LIMITED;

    // If the rateLimitType is RATE_LIMITED check the rateLimitTimeouts
    const rateLimited =
      rateLimitType === RATE_LIMIT_TYPES.RATE_LIMITED &&
      typeof rateLimitTimeouts[method] !== 'undefined';

    // Get the participateInMetaMetrics state to determine if we should track
    // anything. This is extra redundancy because this value is checked in
    // the metametrics controller's trackEvent method as well.
    const userParticipatingInMetaMetrics = metrics.isEnabled();

    // Boolean variable that reduces code duplication and increases legibility
    const shouldTrackEvent =
      // Don't track if this is a blocked method
      rateLimitType !== RATE_LIMIT_TYPES.BLOCKED &&
      // Don't track if the rate limit has been hit
      rateLimited === false &&
      // Don't track if the user isn't participating in metametrics
      userParticipatingInMetaMetrics === true;

    if (shouldTrackEvent) {
      metrics.trackAfterInteractions(MetaMetricsEvents.PROVIDER_METHOD_CALLED, {
        referrer: {
          url: origin,
        },
        properties: {
          method,
        },
      });

      rateLimitTimeouts[method] = setTimeout(() => {
        delete rateLimitTimeouts[method];
      }, 1000 * rateLimitSeconds);
    }

    next();
  };
}
