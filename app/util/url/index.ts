import AppConstants from '../../core/AppConstants';

/**
 * "Use require('punycode/') to import userland modules rather than core modules."
 * {@see {@link https://github.com/mathiasbynens/punycode.js?tab=readme-ov-file#installation}
*/
import { toASCII } from 'punycode/';

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
    if (!urlString) { return false; }

    const urlPunycodeString = toASCII(new URL(urlString).href);
    return urlPunycodeString?.includes(urlString);
  } catch (exp: unknown) {
    console.error(`Failed to detect if URL contains non-ASCII characters: ${urlString}. Error: ${exp}`);
    return false;
  }
};

function removePathTrailingSlash(path: string) {
  return path.endsWith('/') ? path.slice(0, -1) : path;
}

/**
 * Note: We use the punycode library here because the URL library in react native doesn't support punycode encoding.
 * We do have the 'react-native-url-polyfill' package which supports the URL library, but it doesn't support punycode encoding.
 * The URL library is supported in node.js which allows tests to pass, but behavior differs in react-native runtime.
 */
export const toPunycodeURL = (urlString: string) => {
  try {
    const url = new URL(urlString);
    const punycodeUrl = toASCII(url.href);
    const isWithoutEndSlash = url.pathname === '/' && !urlString.endsWith('/');

    return isWithoutEndSlash ? punycodeUrl.slice(0, -1) : punycodeUrl;
  } catch (err: unknown) {
    console.error(`Failed to convert URL to Punycode: ${err}`);
    return urlString;
  }
};
