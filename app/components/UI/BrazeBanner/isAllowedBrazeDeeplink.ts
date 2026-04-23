import { ACTIONS, PROTOCOLS } from '../../../constants/deeplinks';
import AppConstants from '../../../core/AppConstants';

/**
 * Campaigns must never trigger a MetaMask Wallet Protocol handshake.
 */
const MWP_PREFIX = `${PROTOCOLS.METAMASK}://${ACTIONS.CONNECT}/mwp`;

/**
 * MetaMask-owned universal-link hosts that Braze campaigns are allowed to
 * reference.
 */
const getAllowedHttpsHosts = (): ReadonlySet<string> =>
  new Set([
    AppConstants.MM_UNIVERSAL_LINK_HOST,
    AppConstants.MM_UNIVERSAL_LINK_HOST_ALTERNATE,
    AppConstants.MM_UNIVERSAL_LINK_TEST_APP_HOST,
    AppConstants.MM_UNIVERSAL_LINK_TEST_APP_HOST_ALTERNATE,
    AppConstants.MM_IO_UNIVERSAL_LINK_HOST,
    AppConstants.MM_IO_UNIVERSAL_LINK_TEST_HOST,
  ]);

/**
 * Returns `true` only for deeplinks that are safe to route through the central
 * deeplink pipeline from a Braze campaign tap.
 *
 * Allowed schemes:
 *  - `metamask://` — any path.
 *  - `https://` — only on MetaMask-owned universal-link hosts.
 *
 * Everything else (javascript:, file:, data:, intent:, https:// on third-party hosts,
 * malformed strings, etc.) is rejected.
 */
export function isAllowedBrazeDeeplink(uri: unknown): uri is string {
  if (typeof uri !== 'string' || uri.length === 0) return false;

  // Reject MWP before URL parsing. The handleDeeplink fast-path bypasses all
  // source and host validation for MWP URLs, so a campaign must never trigger
  // it.
  if (uri.startsWith(MWP_PREFIX)) return false;

  let parsed: URL;
  try {
    parsed = new URL(uri);
  } catch {
    return false;
  }

  const { protocol, hostname } = parsed;

  if (protocol === `${PROTOCOLS.METAMASK}:`) {
    // The central pipeline (parseDeeplink → handleUniversalLink) handles
    // further action validation and interstitial display.
    return true;
  }

  if (protocol === `${PROTOCOLS.HTTPS}:`) {
    return getAllowedHttpsHosts().has(hostname);
  }

  // Reject http:, javascript:, file:, data:, intent:, about:, wc:, etc.
  return false;
}
