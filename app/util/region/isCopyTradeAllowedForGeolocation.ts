import {
  UNKNOWN_LOCATION,
  type GeolocationRequestStatus,
} from '@metamask/geolocation-controller';

const UK_COUNTRY_CODE = 'GB';

/**
 * Whether Copy trade can be shown for a GeolocationController result.
 *
 * UK residents (`GB`, including `GB-ENG` style region codes) never see it.
 * The button stays hidden until a completed lookup names some other country,
 * so it does not appear and then disappear for a UK user.
 */
export function isCopyTradeAllowedForGeolocation(
  location: string | null | undefined,
  status: GeolocationRequestStatus | null | undefined,
): boolean {
  if (status !== 'complete') {
    return false;
  }

  if (!location || location === UNKNOWN_LOCATION) {
    return false;
  }

  return location.toUpperCase().split('-')[0] !== UK_COUNTRY_CODE;
}
