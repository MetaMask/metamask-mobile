import AppConstants from '../../../AppConstants';
import { ACTIONS, PROTOCOLS } from '../../../../constants/deeplinks';

const {
  MM_UNIVERSAL_LINK_HOST,
  MM_UNIVERSAL_LINK_HOST_ALTERNATE,
  MM_UNIVERSAL_LINK_TEST_APP_HOST,
  MM_UNIVERSAL_LINK_TEST_APP_HOST_ALTERNATE,
  MM_IO_UNIVERSAL_LINK_HOST,
  MM_IO_UNIVERSAL_LINK_TEST_HOST,
} = AppConstants;

export const METAMASK_DEEPLINK_HOSTS: readonly string[] = [
  ...new Set(
    [
      MM_UNIVERSAL_LINK_HOST,
      MM_UNIVERSAL_LINK_HOST_ALTERNATE,
      MM_IO_UNIVERSAL_LINK_HOST,
      MM_IO_UNIVERSAL_LINK_TEST_HOST,
      MM_UNIVERSAL_LINK_TEST_APP_HOST,
      MM_UNIVERSAL_LINK_TEST_APP_HOST_ALTERNATE,
    ].filter(Boolean),
  ),
];

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
 * Matches both custom schemes (metamask:, ethereum:, dapp:) and
 * MetaMask universal link hosts (metamask.app.link, link.metamask.io, etc.).
 *
 * @param url - The URL to check
 * @returns true if the URL is a MetaMask internal deeplink
 */
export const isInternalDeepLink = (url: string | null | undefined): boolean => {
  if (!url) return false;

  // Check custom schemes first (more efficient for these cases)
  const internalSchemes = ['metamask:', 'ethereum:', 'dapp:'];
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
