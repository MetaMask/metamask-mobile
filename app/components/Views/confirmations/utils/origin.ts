import AppConstants from '../../../../core/AppConstants';
import { isUUID } from '../../../../core/SDKConnect/utils/isUUID';
import { MMM_ORIGIN, MM_MOBILE_ORIGIN } from '../constants/confirmations';

function isDappOrigin(origin?: string | null): boolean {
  return Boolean(
    origin && origin !== MMM_ORIGIN && origin !== MM_MOBILE_ORIGIN,
  );
}

/**
 * Whether an origin came from a path where the wallet cannot verify the dapp's identity.
 *
 * Returns `true` for:
 * - `ORIGIN_DEEPLINK` — an `ethereum:` deeplink launched from an external browser app, where the OS hands us the URL with no verifiable sender.
 * - `ORIGIN_QR_CODE` — a QR code scanned with the in-app camera that resolved to an `ethereum:` URL, where we have no way to verify what generated it.
 * - A bare UUID — the connection/channel id that MetaMask SDK (v1 channel id) and MetaMask Connect / MWP (v2 connection id) use as the request origin. For these remote connections the only identifying metadata (url, name, icon) is self-reported by the dapp over the transport and cannot be independently verified (see the security warnings in `setupBridge`, `getDefaultBridgeParams`, and `rpc-bridge-adapter`). Verifiable origins (in-app browser, WalletConnect) always present a domain/URL, never a bare UUID, so this check does not affect them.
 *
 * For these requests we cannot trust any self-reported metadata, so the confirmation UI should display a generic "External app" label instead of the raw origin. This mirrors the legacy `ApprovalTagUrl` / `ApproveTransactionHeader` / `TransactionHeader` behaviour, which already treats deeplink/QR origins as equivalent and hides the origin pill for them.
 */
function isExternalAppOrigin(origin?: string | null): boolean {
  return Boolean(
    origin &&
      (origin === AppConstants.DEEPLINKS.ORIGIN_DEEPLINK ||
        origin === AppConstants.DEEPLINKS.ORIGIN_QR_CODE ||
        isUUID(origin)),
  );
}

export { isDappOrigin, isExternalAppOrigin };
