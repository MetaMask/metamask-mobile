import { QuoteStreamCompleteReason } from '@metamask/bridge-controller';
import { isObject } from '@metamask/utils';

/**
 * Thrown when the limit orders API rejects an order because one of its
 * tokens is a real-world asset that is not available in the user's region.
 * Retrying the same order cannot succeed.
 */
export class LimitOrderGeoRestrictedError extends Error {
  constructor() {
    super(`createLimitOrder: ${QuoteStreamCompleteReason.RWA_GEO_RESTRICTED}`);
    this.name = 'LimitOrderGeoRestrictedError';
  }
}

/**
 * Whether a failed response is the API refusing the order for the user's
 * region, which it signals with a 403 whose `routeFetchingErrorCTA` (and
 * `message`) is `RWA_GEO_RESTRICTED`.
 *
 * @param response - The non-ok response; its body is consumed.
 * @returns True when the order is geo-restricted.
 */
export const isGeoRestrictedResponse = async (
  response: Response,
): Promise<boolean> => {
  if (response.status !== 403) {
    return false;
  }

  try {
    const body: unknown = await response.json();
    return (
      isObject(body) &&
      [body.routeFetchingErrorCTA, body.message].includes(
        QuoteStreamCompleteReason.RWA_GEO_RESTRICTED,
      )
    );
  } catch {
    return false;
  }
};
