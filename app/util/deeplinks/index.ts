import AppConstants from '../../core/AppConstants';

/**
 * Checks if a URL is an internal MetaMask deeplink that should be handled
 * within the app rather than passed to the OS
 *
 * @param url - The URL to check
 * @returns true if the URL is a MetaMask internal deeplink
 */
export const isInternalDeepLink = (url: string | null | undefined): boolean => {
  if (!url) return false;

  const metamaskHosts = [
    AppConstants.MM_UNIVERSAL_LINK_HOST || 'link.metamask.io',
    AppConstants.MM_IO_UNIVERSAL_LINK_HOST || 'link.metamask.io',
    AppConstants.MM_IO_UNIVERSAL_LINK_TEST_HOST || 'link-test.metamask.io',
    'metamask.app.link',
    'metamask.test-app.link',
    'metamask-alternate.app.link',
    'metamask-alternate.test-app.link',
  ].filter(Boolean);

  try {
    // Check custom schemes first (more efficient for these cases)
    const internalSchemes = ['metamask:', 'ethereum:', 'dapp:'];
    if (internalSchemes.some((scheme) => url.startsWith(scheme))) {
      return true;
    }

    // Parse URL for host checking
    const urlObj = new URL(url);

    // Check if it's a MetaMask universal link
    return metamaskHosts.includes(urlObj.hostname);
  } catch {
    // If URL parsing fails, check if it's a simple scheme match
    return ['metamask:', 'ethereum:', 'dapp:'].some((scheme) =>
      url.startsWith(scheme),
    );
  }
};

/**
 * Determines if a URL should be opened externally (outside the app)
 * This is the inverse of isInternalDeepLink but kept separate for clarity
 *
 * @param url - The URL to check
 * @returns true if the URL should be opened externally
 */
export const shouldOpenExternally = (url: string): boolean =>
  !isInternalDeepLink(url);
