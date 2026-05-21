import AppConstants from '../../../../core/AppConstants';
import { MMM_ORIGIN, MM_MOBILE_ORIGIN } from '../constants/confirmations';

function isDappOrigin(origin?: string | null): boolean {
  return Boolean(
    origin && origin !== MMM_ORIGIN && origin !== MM_MOBILE_ORIGIN,
  );
}

/**
 * Whether an origin came from a path where the wallet cannot verify the
 * dapp's identity (currently only the `ethereum:` deeplink path used by
 * external browser apps).
 *
 * For these requests we cannot trust any self-reported metadata, so the
 * confirmation UI should display a generic "External app" label instead of
 * the raw `'deeplink'` constant.
 */
function isExternalAppOrigin(origin?: string | null): boolean {
  return origin === AppConstants.DEEPLINKS.ORIGIN_DEEPLINK;
}

export { isDappOrigin, isExternalAppOrigin };
