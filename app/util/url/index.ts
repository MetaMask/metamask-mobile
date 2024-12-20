import AppConstants from '../../core/AppConstants';
import punycode from 'punycode';

export function isPortfolioUrl(url: string) {
  try {
    const currentUrl = new URL(url);
    return currentUrl.origin === AppConstants.PORTFOLIO.URL;
  } catch (error) {
    return false;
  }
}

export function isBridgeUrl(url: string) {
  try {
    const currentUrl = new URL(url);
    const bridgeUrl = new URL(AppConstants.BRIDGE.URL);

    return (
      currentUrl.origin === bridgeUrl.origin &&
      removePathTrailingSlash(currentUrl.pathname) ===
        removePathTrailingSlash(bridgeUrl.pathname)
    );
  } catch (error) {
    return false;
  }
}

export const isValidASCIIURL = (urlString?: string) => {
  try {
    return urlString?.includes(punycode.toASCII(new URL(urlString).host));
  } catch (exp: unknown) {
    console.error(exp);
    return false;
  }
};

function removePathTrailingSlash(path: string) {
  return path.endsWith('/') ? path.slice(0, -1) : path;
}

/** 
 * Note: We use the punycode library here because the url library in react native doesn't support punycode encoding.
 * It is supported in node.js which allows tests to pass, but behavior in react-native does not match the
 * behavior in the tests. This differs from the toPunycodeURL util method in metamask-extension.
 */
export const toPunycodeURL = (urlString: string) => {
  try {
    const url = new URL(urlString);
    const punycodeHostname = punycode.toASCII(url.hostname);
    const { protocol, port, search, hash } = url;
    const pathname =
      url.pathname === '/' && !urlString.endsWith('/') ? '' : url.pathname;

    return `${protocol}//${punycodeHostname}${port}${pathname}${search}${hash}`;
  } catch (err: unknown) {
    console.error(`Failed to convert URL to Punycode: ${err}`);
    return urlString;
  }
};
