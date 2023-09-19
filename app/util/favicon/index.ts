import Logger from '../Logger';
import { DOMParser } from '@xmldom/xmldom';
import { store } from '../../store';
import { storeFavicon } from '../../actions/browser';
import isUrl from 'is-url';

/**
 * Fetches the HTML source of the origin
 * @param url - the origin URL
 * @returns - the HTML source
 */
const fetchHtmlSource = async (url: string) => {
  try {
    const response = await fetch(url);
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
  if (htmlSource) {
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
      const originWithProtocol = isUrl(origin) ? origin : `https://${origin}`;
      return new URL(originWithProtocol);
    } catch (e) {
      Logger.log(`invalid origin ${origin}`, e);
    }
  }
};

const originToHost = (origin: string) => {
  const normalisedOrigin = originToUrl(origin);
  if (normalisedOrigin) {
    try {
      return normalisedOrigin.host;
    } catch (e) {
      Logger.log(`invalid origin ${origin}`, e);
    }
  }
};

/**
 * Writes the favicon URL from the given origin in the browser state
 * @param originUrl - the origin used as cache key
 * @param faviconUrl - the stored favicon url
 */
export const cacheFavicon = async (originUrl: string, faviconUrl: string) => {
  try {
    const cacheKey = originToHost(originUrl);
    if (!cacheKey) return;
    store.dispatch(storeFavicon({ origin: cacheKey, url: faviconUrl }));
  } catch (e) {
    await Logger.log(`favicon caching failed for ${originUrl}`, e);
  }
};

/**
 * Reads the favicon URL for the given origin from the browser state
 * @param originUrl  -the origin used as cache key
 * @returns - the favicon url or null if none found
 */
export const getFaviconFromCache = async (originUrl: string) => {
  const cacheKey = originToHost(originUrl);
  if (!cacheKey) return;
  let faviconUrl = null;
  try {
    const { browser } = store.getState();
    const cachedFavicon = browser.favicons.find(
      (favicon: { origin: string; url: string }) => favicon.origin === cacheKey,
    );
    faviconUrl = cachedFavicon?.url || null;
  } catch (e) {
    await Logger.log(`favicon cache search failed for ${originUrl}`, e);
  }
  return faviconUrl;
};

/**
 * Returns URL for the favicon of the given url
 *
 * @param origin - String corresponding to website url or domain
 * @returns - String corresponding to favicon url or empty string if none found
 *
 */
export const getFaviconURLFromHtml = async (origin: string) => {
  // in case the url of origin can not be reached, state stores the 'null' string
  // which is not a valid url, so until we take the time to fix this, we return empty string
  if (origin && origin !== 'null') {
    try {
      const url = originToUrl(origin);
      if (url) {
        const htmlSource = await fetchHtmlSource(url.toString());
        const htmlDoc = await parseHtmlSource(htmlSource);
        const links = htmlDoc?.getElementsByTagName('link');
        const faviconUrl = getFaviconUrlFromLinks(links, url);
        return faviconUrl ? faviconUrl.toString() : '';
      }
    } catch (error) {
      await Logger.log('useFavicon fetchFavicon failed', error);
    }
  }
  return '';
};
