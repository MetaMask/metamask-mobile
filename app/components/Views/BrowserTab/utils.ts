import { prefixUrlWithProtocol } from '../../../util/browser';
import URL from 'url-parse';

/**
 * Validates url for browser
 *
 * Regular domains (e.g., google.com)
 * Localhost URLs (e.g., http://localhost:3000)
 * URLs with ports (e.g., http://localhost:1234)
 * HTTPS/HTTP protocols
 *
 * @param url - The url to validate
 * @returns
 */
export const isValidUrl = (url: URL<string>): boolean => {
  const urlPattern = /^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/\S*)?$/;
  try {
    return (
      (url.protocol === 'http:' || url.protocol === 'https:') &&
      (urlPattern.test(url.origin) || url.hostname === 'localhost')
    );
  } catch {
    return false;
  }
};

/**
 * Processes url for browser
 *
 * @param urlString - The url to process
 * @returns
 */
export const processUrlForBrowser = (urlString: string): string => {
  const urlWithProtocol = prefixUrlWithProtocol(urlString);
  const url = new URL(urlWithProtocol);
  if (!isValidUrl(url)) {
    return `https://www.google.com/search?q=${encodeURIComponent(urlString)}`;
  }
  return urlWithProtocol;
};
