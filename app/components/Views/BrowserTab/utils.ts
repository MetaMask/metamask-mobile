import AppConstants from '../../../core/AppConstants';
import URLParse from 'url-parse';
import { DocumentUrlForUrlBarPayload, SessionENSNames } from './types';

const DEFAULT_HTTP_PORTS: Record<string, string> = {
  'http:': '80',
  'https:': '443',
};

/** Loopback hosts that are allowed to use non-default ports for local dev. */
const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]']);

/**
 * Returns true when a URL specifies an explicit HTTP/HTTPS port other than the
 * protocol default. Local development hosts are exempt.
 */
export const isDisallowedExplicitPort = (url: string): boolean => {
  try {
    const parsed = new URLParse(url);
    const defaultPort = DEFAULT_HTTP_PORTS[parsed.protocol];

    if (!defaultPort || !parsed.port) {
      return false;
    }

    if (LOCAL_HOSTNAMES.has(parsed.hostname)) {
      return false;
    }

    return parsed.port !== defaultPort;
  } catch {
    return false;
  }
};

/**
 * Generates a unique id used to correlate a document URL sync request with the
 * message the WebView posts back in response.
 */
export const createRequestId = (): string =>
  `${Date.now()}-${Math.random().toString(36).slice(2)}`;

/**
 * Type guard validating a message payload posted back from the WebView for a
 * document URL sync request. Requires a non-empty `requestId` and `url`, and an
 * optional `title` that, when present, must be a string.
 */
export const isDocumentUrlForUrlBarPayload = (
  payload: unknown,
): payload is DocumentUrlForUrlBarPayload => {
  if (typeof payload !== 'object' || payload === null) {
    return false;
  }

  const { requestId, url, title } = payload as Record<string, unknown>;

  return (
    typeof requestId === 'string' &&
    requestId.length > 0 &&
    typeof url === 'string' &&
    url.length > 0 &&
    (title === undefined || typeof title === 'string')
  );
};

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
export const isValidUrl = (url: URLParse<string>): boolean => {
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
 * Checks if it is a ENS website
 */
export const isENSUrl = (urlToCheck: string, ensIgnoreList: string[]) => {
  const { hostname } = new URLParse(urlToCheck);
  const tld = hostname.split('.').pop();
  if (
    tld &&
    AppConstants.supportedTLDs.indexOf(
      tld.toLowerCase() as 'eth' | 'xyz' | 'test',
    ) !== -1
  ) {
    // Make sure it's not in the ignore list
    if (ensIgnoreList.indexOf(hostname) === -1) {
      return true;
    }
  }
  return false;
};

/**
 * Gets the url to be displayed to the user
 * For example, if it's ens then show [site].eth instead of ipfs url
 */
export const getMaskedUrl = (
  urlToMask: string,
  sessionENSNames: SessionENSNames,
) => {
  if (!urlToMask) return urlToMask;
  let replace = null;
  if (urlToMask.startsWith(AppConstants.IPFS_DEFAULT_GATEWAY_URL)) {
    replace = (key: string) =>
      `${AppConstants.IPFS_DEFAULT_GATEWAY_URL}${sessionENSNames[key].hash}/`;
  } else if (urlToMask.startsWith(AppConstants.IPNS_DEFAULT_GATEWAY_URL)) {
    replace = (key: string) =>
      `${AppConstants.IPNS_DEFAULT_GATEWAY_URL}${sessionENSNames[key].hostname}/`;
  } else if (urlToMask.startsWith(AppConstants.SWARM_DEFAULT_GATEWAY_URL)) {
    replace = (key: string) =>
      `${AppConstants.SWARM_DEFAULT_GATEWAY_URL}${sessionENSNames[key].hash}/`; //TODO: This was SWARM_GATEWAY_URL before, it was broken, understand what it does
  }

  if (replace) {
    const key = Object.keys(sessionENSNames).find((ens) =>
      urlToMask.startsWith(ens),
    );
    if (key) {
      urlToMask = urlToMask.replace(
        replace(key),
        `https://${sessionENSNames[key].hostname}/`,
      );
    }
  }
  return urlToMask;
};
