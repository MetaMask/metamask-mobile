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

/**
 * Whether a request's analytics `request_source` indicates a remote transport
 * whose origin the wallet cannot independently verify: MetaMask SDK (v1),
 * MetaMask Connect / MWP (v2), or WalletConnect. Each of these reports its
 * origin (url, name, icon) over the connection rather than via a verified
 * browser/extension context, so it must not be presented as a trusted origin.
 *
 * Used alongside {@link isExternalAppOrigin} so the confirmation UI shows a
 * generic "External app" label for all unverifiable remote requests, regardless
 * of whether the transport surfaced the origin as a placeholder, a connection
 * id, or a self-reported domain.
 *
 * Note: `request_source` is currently only populated on signature requests
 * (`messageParams.meta.analytics.request_source`). Transactions persist only
 * `origin`, so unverifiable WalletConnect / SDK v1 *transactions* (whose origin
 * is a self-reported domain) still rely on {@link isExternalAppOrigin} and are
 * tracked as a follow-up.
 */
function isExternalAppRequestSource(requestSource?: string | null): boolean {
  const { REQUEST_SOURCES } = AppConstants;
  return (
    requestSource === REQUEST_SOURCES.SDK_REMOTE_CONN ||
    requestSource === REQUEST_SOURCES.MM_CONNECT ||
    requestSource === REQUEST_SOURCES.WC ||
    requestSource === REQUEST_SOURCES.WC2
  );
}

export { isDappOrigin, isExternalAppOrigin, isExternalAppRequestSource };
