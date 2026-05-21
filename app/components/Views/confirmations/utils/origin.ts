import AppConstants from '../../../../core/AppConstants';
import { MMM_ORIGIN, MM_MOBILE_ORIGIN } from '../constants/confirmations';

function isDappOrigin(origin?: string | null): boolean {
  return Boolean(
    origin && origin !== MMM_ORIGIN && origin !== MM_MOBILE_ORIGIN,
  );
}

/**
 * Whether an origin came from a path where the wallet cannot verify the dapp's identity.
 *
 * Currently true for `ORIGIN_DEEPLINK` (an `ethereum:` deeplink launched from an external browser app, where the OS hands us the URL with no verifiable sender) and `ORIGIN_QR_CODE` (a QR code scanned with the in-app camera that resolved to an `ethereum:` URL, where we have no way to verify what generated it).
 *
 * For these requests we cannot trust any self-reported metadata, so the confirmation UI should display a generic "External app" label instead of the raw origin constant. This mirrors the legacy `ApprovalTagUrl` / `ApproveTransactionHeader` / `TransactionHeader` behaviour, which already treats both origins as equivalent and hides the origin pill for them.
 */
function isExternalAppOrigin(origin?: string | null): boolean {
  return (
    origin === AppConstants.DEEPLINKS.ORIGIN_DEEPLINK ||
    origin === AppConstants.DEEPLINKS.ORIGIN_QR_CODE
  );
}

export { isDappOrigin, isExternalAppOrigin };
