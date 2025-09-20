import Logger from '../Logger';
import { DOMParser } from '@xmldom/xmldom';
import { store } from '../../store';
import { storeFavicon } from '../../actions/browser';
import isUrl from 'is-url';
import { isNumber } from 'lodash';
import { ImageSourcePropType } from 'react-native';
import AppConstants from '../../../app/core/AppConstants';

/**
 * Fetches the HTML source of the origin
 * @param url - the origin URL
 * @returns - the HTML source
 */
const fetchHtmlSource = async (url: URL) => {
  try {
    const response = await fetch(url, { credentials: 'omit' });
    if (response?.ok) {
      return await response.text();
    }
  } catch (e) {
    await Logger.log(`favicon fetchHtmlSource failed for ${url}`, e);
  }
};

/**
 * Parses the HTML source into a DOM document
 * @param htmlSource - the HTML source
 * @returns - the DOM document
 */
const parseHtmlSource = async (htmlSource: string | undefined) => {
  if (htmlSource && htmlSource.length > 0) {
    // use a return statement for the error handler to avoid the console warning
    // as any error will result in fallback favicon
    return new DOMParser({
      errorHandler: (level, msg) => {
        if (level === 'error') Logger.log(level, msg);
      },
    }).parseFromString(htmlSource, 'text/html');
  }
};

/**
 * Returns the favicon URL from the HTML links collection
 * @param links - the HTML links collection
 * @param origin - the origin URL to be used to build the favicon url
 * @returns - the first found favicon URL or empty object if none found
 */
const getFaviconUrlFromLinks = (
  links: HTMLCollectionOf<Element> | undefined,
  origin: URL,
): URL | undefined => {
  let faviconURL;

  if (links && links.length > 0 && origin) {
    Array.from(links).every((link) => {
      const rel = link.getAttribute('rel');
      if (rel?.split(' ').includes('icon')) {
        const href = link.getAttribute('href');
        if (href) {
          faviconURL = new URL(href, origin);
          return false; //stop loop at first favicon found, same behaviour as browser extension
        }
      }
      return true;
    });
  }
  return faviconURL;
};

/**
 * Returns a URL object from the given origin even if it's not a valid URL
 * @param origin the origin string (ie: 'metamask.github.io' or full dapp URL 'https://metamask.github.io/test-dapp/')
 */
const originToUrl = (origin: string) => {
  if (origin) {
    try {
      // remove sdk origin prefixes before conversion
      const originWithoutPrefix = origin
        .replace(AppConstants.MM_SDK.SDK_REMOTE_ORIGIN, '')
        .replace(AppConstants.MM_SDK.SDK_CONNECT_V2_ORIGIN, '');
      const originWithProtocol = isUrl(originWithoutPrefix)
        ? originWithoutPrefix
        : `https://${originWithoutPrefix}`;
      return new URL(originWithProtocol);
    } catch (e) {
      Logger.log(`Can not convert ${origin} origin to URL`, e);
    }
  }
};

const originToHost = (origin: string) => {
  const normalisedOrigin = originToUrl(origin);
  if (normalisedOrigin) {
    return normalisedOrigin.host;
  }
};

/**
 * Writes the favicon URL from the given origin in the browser state
 * @param originUrl - the origin used as cache key
 * @param faviconUrl - the stored favicon url. Will not cache if this is undefined.
 */
export const cacheFavicon = (
  originUrl: string,
  faviconUrl: URL | undefined,
) => {
  if (!faviconUrl) return;
  const cacheKey = originToHost(originUrl);
  if (!cacheKey) return;
  store?.dispatch(
    storeFavicon({ origin: cacheKey, url: faviconUrl?.toString() }),
  );
};

/**
 * Reads the favicon URL for the given origin from the browser state
 * @param originUrl  -the origin used as cache key
 * @returns - the favicon url or null if none found
 */
export const getFaviconFromCache = (originUrl: string): string | undefined => {
  const cacheKey = originToHost(originUrl);
  if (!cacheKey) return;
  const { browser } = store.getState();
  const cachedFavicon = browser.favicons.find(
    (favicon: { origin: string; url: string }) => favicon.origin === cacheKey,
  );
  return cachedFavicon?.url;
};

/**
 * Returns URL for the favicon of the given url
 *
 * @param origin - String corresponding to website url or domain
 * @returns - URL corresponding to favicon url or empty string if none found
 *
 */
export const getFaviconURLFromHtml = async (origin: string) => {
  // in case the url of origin can not be reached, state stores the 'null' string
  // which is not a valid url, so until we take the time to fix this, we return empty string
  if (!origin || origin === 'null') {
    return;
  }
  const url = originToUrl(origin);
  if (url) {
    const htmlSource = await fetchHtmlSource(url);
    const htmlDoc = await parseHtmlSource(htmlSource);
    const links = htmlDoc?.getElementsByTagName('link');
    return getFaviconUrlFromLinks(links, url);
  }
};

/**
 * Returns the favicon URL from the image source if it is an SVG image
 * @param imageSource the image source
 */
export const isFaviconSVG = (imageSource: ImageSourcePropType) => {
  if (
    imageSource &&
    !isNumber(imageSource) &&
    'uri' in imageSource &&
    (imageSource.uri?.endsWith('.svg') ||
      imageSource.uri?.startsWith('data:image/svg+xml'))
  ) {
    return imageSource.uri;
  }
};
