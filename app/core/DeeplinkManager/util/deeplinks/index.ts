import AppConstants from '../../../AppConstants';
import { ACTIONS, PROTOCOLS } from '../../../../constants/deeplinks';

const {
  MM_UNIVERSAL_LINK_HOST,
  MM_UNIVERSAL_LINK_HOST_ALTERNATE,
  MM_UNIVERSAL_LINK_TEST_APP_HOST,
  MM_UNIVERSAL_LINK_TEST_APP_HOST_ALTERNATE,
  MM_IO_UNIVERSAL_LINK_HOST,
  MM_IO_UNIVERSAL_LINK_TEST_HOST,
  MM_COM_UNIVERSAL_LINK_HOST,
  MM_COM_UNIVERSAL_LINK_TEST_HOST,
} = AppConstants;

export const METAMASK_DEEPLINK_HOSTS: readonly string[] = [
  ...new Set(
    [
      MM_UNIVERSAL_LINK_HOST,
      MM_UNIVERSAL_LINK_HOST_ALTERNATE,
      MM_IO_UNIVERSAL_LINK_HOST,
      MM_IO_UNIVERSAL_LINK_TEST_HOST,
      MM_COM_UNIVERSAL_LINK_HOST,
      MM_COM_UNIVERSAL_LINK_TEST_HOST,
      MM_UNIVERSAL_LINK_TEST_APP_HOST,
      MM_UNIVERSAL_LINK_TEST_APP_HOST_ALTERNATE,
    ].filter(Boolean),
  ),
];

/**
 * Hosts Branch serves short links from (e.g. `metamask-alternate.app.link/1WkF6GmE40b`).
 * The path on these hosts may be a Branch link id instead of an in-app route.
 */
export const BRANCH_LINK_HOSTS: readonly string[] = [
  ...new Set(
    [
      MM_UNIVERSAL_LINK_HOST,
      MM_UNIVERSAL_LINK_HOST_ALTERNATE,
      MM_UNIVERSAL_LINK_TEST_APP_HOST,
      MM_UNIVERSAL_LINK_TEST_APP_HOST_ALTERNATE,
    ].filter(Boolean),
  ),
];

const KNOWN_DEEPLINK_ACTIONS: ReadonlySet<string> = new Set(
  Object.values(ACTIONS),
);

/**
 * Returns the Branch link id of a Branch short link the app cannot route by
 * itself: a Branch host URL whose only path segment is not a known action,
 * such as `https://metamask-alternate.app.link/1WkF6GmE40b?share=1` →
 * `1WkF6GmE40b`. Branch resolves such a link to its `$deeplink_path`
 * separately. Returns `null` for every other URL, including Branch host
 * URLs that already name a route (`https://metamask.app.link/swap`).
 *
 * @param url - The URL to check
 * @returns The Branch link id, or `null`
 */
export const getBranchShortLinkId = (
  url: string | null | undefined,
): string | null => {
  if (!url) return null;

  try {
    const urlObj = new URL(url);
    const protocol = urlObj.protocol.replace(':', '');
    if (
      (protocol !== PROTOCOLS.HTTP && protocol !== PROTOCOLS.HTTPS) ||
      !BRANCH_LINK_HOSTS.includes(urlObj.hostname)
    ) {
      return null;
    }

    const segments = urlObj.pathname.split('/').filter(Boolean);
    if (segments.length !== 1 || KNOWN_DEEPLINK_ACTIONS.has(segments[0])) {
      return null;
    }
    return segments[0];
  } catch {
    return null;
  }
};

export const METAMASK_SDK_DEEPLINK_ACTIONS = [
  ACTIONS.ANDROID_SDK,
  ACTIONS.CONNECT,
  ACTIONS.MMSDK,
] as const;

export const SDK_SERVICE_DEEPLINK_ACTIONS = [
  ...METAMASK_SDK_DEEPLINK_ACTIONS,
  ACTIONS.WC,
] as const;

type MetaMaskSDKDeeplinkAction = (typeof METAMASK_SDK_DEEPLINK_ACTIONS)[number];
type SDKServiceDeeplinkAction = (typeof SDK_SERVICE_DEEPLINK_ACTIONS)[number];

export const isMetaMaskSDKDeeplinkAction = (
  action: string,
): action is MetaMaskSDKDeeplinkAction =>
  METAMASK_SDK_DEEPLINK_ACTIONS.includes(action as MetaMaskSDKDeeplinkAction);

const isSDKServiceDeeplinkAction = (
  action: string,
): action is SDKServiceDeeplinkAction =>
  SDK_SERVICE_DEEPLINK_ACTIONS.includes(action as SDKServiceDeeplinkAction);

/**
 * Checks if a URL is a MetaMask universal link (host-based only).
 *
 * This does NOT match custom-scheme URLs like ethereum:, dapp:, or metamask:.
 * Use this when you only need to intercept universal links that would otherwise
 * be opened by the OS (e.g. to prevent iOS from bouncing to Safari).
 *
 * @param url - The URL to check
 * @returns true if the URL is a MetaMask universal link
 */
export const isMetaMaskUniversalLink = (
  url: string | null | undefined,
): boolean => {
  if (!url) return false;

  try {
    const urlObj = new URL(url);
    return METAMASK_DEEPLINK_HOSTS.includes(urlObj.hostname);
  } catch {
    return false;
  }
};

/**
 * Checks if a deeplink is backed by SDKConnect / WalletConnect services.
 *
 * Used by the cold-start saga to preserve the fast path for normal deeplinks
 * while waiting for SDK/WC initialization before service-backed deeplinks are
 * parsed.
 */
export const isSDKServiceDeeplink = (
  url: string | null | undefined,
): boolean => {
  if (!url) return false;

  try {
    const urlObj = new URL(url);
    const protocol = urlObj.protocol.replace(':', '');

    if (protocol === PROTOCOLS.WC) {
      return true;
    }

    if (protocol === PROTOCOLS.METAMASK) {
      return isSDKServiceDeeplinkAction(urlObj.hostname);
    }

    if (
      (protocol === PROTOCOLS.HTTP || protocol === PROTOCOLS.HTTPS) &&
      METAMASK_DEEPLINK_HOSTS.includes(urlObj.hostname)
    ) {
      const action = urlObj.pathname.split('/').filter(Boolean)[0] ?? '';
      return isSDKServiceDeeplinkAction(action);
    }

    return false;
  } catch {
    return false;
  }
};

/**
 * Checks if a URL is an internal MetaMask deeplink that should be handled
 * within the app rather than passed to the OS.
 *
 * Matches both custom schemes (metamask:, ethereum:, dapp:, solana:) and
 * MetaMask universal link hosts (metamask.app.link, link.metamask.io,
 * link.metamask.com, etc.).
 *
 * @param url - The URL to check
 * @returns true if the URL is a MetaMask internal deeplink
 */
export const isInternalDeepLink = (url: string | null | undefined): boolean => {
  if (!url) return false;

  // Check custom schemes first (more efficient for these cases)
  const internalSchemes = ['metamask:', 'ethereum:', 'dapp:', 'solana:'];
  if (internalSchemes.some((scheme) => url.startsWith(scheme))) {
    return true;
  }

  return isMetaMaskUniversalLink(url);
};

/**
 * Determines if a URL should be opened externally (Linking.openURL())
 * This is the inverse of isInternalDeepLink but kept separate for clarity.
 *
 * @param url - The URL to check
 * @returns true if the URL should be opened externally
 */
export const shouldOpenExternally = (url: string): boolean =>
  !isInternalDeepLink(url);
