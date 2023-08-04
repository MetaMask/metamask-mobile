import Logger from '../Logger';
import { DOMParser } from '@xmldom/xmldom';
import { forEach } from 'lodash';

/**
 * Fetches the HTML source of the origin
 * @param url the origin URL
 * @returns {Promise<string>} the HTML source
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
 * @param htmlSource the HTML source
 * @returns {Promise<Document>} the DOM document
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
 * @param links the HTML links collection
 * @param origin the origin URL to be used to build the favicon url
 * @returns {string} the first found favicon URL or empty object if none found
 */
const getFaviconUrlFromLinks = (
  links: HTMLCollectionOf<Element> | undefined,
  origin: string,
) => {
  let faviconURL = '';

  console.debug('getFaviconUrlFromLinks length', links?.length);

  if (links && links.length > 0 && origin) {
    // use lodash forEach as the collection require iteration to prevent named items to be returned
    forEach(links, (link) => {
      const rel = link.getAttribute('rel');
      if (rel?.split(' ').includes('icon')) {
        const href = link.getAttribute('href');
        if (href) {
          faviconURL = new URL(href, origin).toString();
          return false; //stop loop at first favicon found, same behaviour as browser extension
        }
      }
    });
  }
  return faviconURL;
};

const verifyOrigin = (origin: string) => {
  if (origin) {
    try {
      const originWithProtocol = origin.startsWith('http')
        ? origin
        : `https://${origin}`;
      return new URL(originWithProtocol).toString();
    } catch (e) {
      Logger.log(`invalid origin ${origin}`, e);
    }
  }
};

/**
 * Returns URL for the favicon of the given url
 *
 * @param origin - String corresponding to website url or domain
 * @returns {Promise<string>} - String corresponding to favicon url or empty string if none found
 *
 */
const getFaviconURLFromHtml = async (origin: string) => {
  if (origin) {
    try {
      const url = verifyOrigin(origin);
      if (url) {
        const htmlSource = await fetchHtmlSource(url);
        const htmlDoc = await parseHtmlSource(htmlSource);
        const links = htmlDoc?.getElementsByTagName('link');
        return getFaviconUrlFromLinks(links, url);
      }
    } catch (error) {
      await Logger.log('useFavicon fetchFavicon failed', error);
    }
  }
  return '';
};

export default getFaviconURLFromHtml;
