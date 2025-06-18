import AppConstants from '../../core/AppConstants';

/**
 * "Use require('punycode/') to import userland modules rather than core modules."
 * {@see {@link https://github.com/mathiasbynens/punycode.js?tab=readme-ov-file#installation}
 */
import { toASCII } from 'punycode/';
import DevLogger from '../../core/SDKConnect/utils/DevLogger';

const hostnameRegex =
  /^(?:[a-zA-Z][a-zA-Z0-9+.-]*:\/\/)?(?:www\.)?([^/?:]+)(?::\d+)?/;

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

/**
 * This method does not use the URL library because it does not support punycode encoding in react native.
 * It compares the original hostname to a punycode version of the hostname.
 */
export const isValidASCIIURL = (urlString?: string) => {
  if (!urlString || urlString.length === 0) {
    return false;
  }

  try {
    const originalHostname = urlString.match(hostnameRegex);
    const punycodeHostname = toASCII(originalHostname?.[1] || '');
    return originalHostname?.[1] === punycodeHostname;
  } catch (exp: unknown) {
    console.error(
      `Failed to detect if URL hostname contains non-ASCII characters: ${urlString}. Error: ${exp}`,
    );
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


export const getHostname = (uri: string): string => {
  try {
    // Handle empty or invalid URIs
    if (!uri) return '';

    // For standard URLs, use URL API
    if (uri.includes('://')) {
      try {
        const url = new URL(uri);
        return url.hostname;
      } catch (e) {
        // If URL parsing fails, continue with manual parsing
      }
    }

    // For protocol-based URIs like wc: or ethereum:
    const pathStart: number = uri.indexOf(':');
    if (pathStart !== -1) {
      return uri.substring(0, pathStart);
    }

    // If no protocol separator found, return the original string
    return uri;
  } catch (error) {
    DevLogger.log('Error in getHostname:', error);
    return uri;
  }
};