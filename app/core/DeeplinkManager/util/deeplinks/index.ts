import AppConstants from '../../../AppConstants';

const {
  MM_UNIVERSAL_LINK_HOST,
  MM_IO_UNIVERSAL_LINK_HOST,
  MM_IO_UNIVERSAL_LINK_TEST_HOST,
} = AppConstants;

const METAMASK_HOSTS = [
  ...new Set(
    [
      MM_UNIVERSAL_LINK_HOST || 'link.metamask.io',
      MM_IO_UNIVERSAL_LINK_HOST || 'link.metamask.io',
      MM_IO_UNIVERSAL_LINK_TEST_HOST || 'link-test.metamask.io',
      'metamask.app.link',
      'metamask.test-app.link',
    ].filter(Boolean),
  ),
];

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
    return METAMASK_HOSTS.includes(urlObj.hostname);
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
