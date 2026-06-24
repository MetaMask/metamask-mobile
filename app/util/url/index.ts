import AppConstants from '../../core/AppConstants';

/**
 * "Use require('punycode/') to import userland modules rather than core modules."
 * {@see {@link https://github.com/mathiasbynens/punycode.js?tab=readme-ov-file#installation}
 */
import { toASCII } from 'punycode/';
import Logger from '../Logger';

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

export const isCardUrl = (url: string) => {
  try {
    const currentUrl = new URL(url);
    return currentUrl.origin === AppConstants.CARD.URL;
  } catch (error) {
    Logger.log('Error in isCardUrl', error);
    return false;
  }
};

export const isCardTravelUrl = (url: string) => {
  try {
    const currentUrl = new URL(url);
    const travelUrl = new URL(AppConstants.CARD.TRAVEL_URL);
    return currentUrl.origin === travelUrl.origin;
  } catch (error) {
    Logger.log('Error in isCardTravelUrl', error);
    return false;
  }
};

export const isCardTosUrl = (url: string) => {
  try {
    const currentUrl = new URL(url);
    const tosUrl = new URL(AppConstants.CARD.CARD_TOS_URL);
    return currentUrl.origin === tosUrl.origin;
  } catch (error) {
    Logger.log('Error in isCardTosUrl', error);
    return false;
  }
};
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

export function isSameOrigin(a: string, b: string) {
  try {
    const urlA = new URL(a);
    const urlB = new URL(b);

    return urlA.origin === urlB.origin;
  } catch (e) {
    console.warn(e);
    return false;
  }
}
