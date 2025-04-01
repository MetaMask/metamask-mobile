import Url from 'url-parse';
import isUrl from 'is-url';
import { isOriginSafe } from './phishingProtection';

const ALLOWED_PROTOCOLS = ['http:', 'https:'];
const DENYLISTED_DOMAINS = ['metamask.app.link'];

const isAllowedProtocol = (protocol: string): boolean =>
  ALLOWED_PROTOCOLS.includes(protocol);

const isAllowedUrl = ({ hostname, origin }: Url<string>): boolean => {
  if (DENYLISTED_DOMAINS.includes(hostname)) {
    return false;
  }
  return isOriginSafe(origin);
};

export const isLinkSafe = (link: string): boolean => {
  try {
    const url = new Url(link);
    const { protocol, href } = url;
    
    // Check if it has a valid protocol and hostname
    if (!isAllowedProtocol(protocol)) {
      return false;
    }
    
    // Some URLs may not pass the isUrl check but are still valid
    // Focus on protocol and hostname validation instead
    if (url.hostname && url.hostname.includes('.')) {
      return isAllowedUrl(url);
    }
    
    return isUrl(href) && isAllowedUrl(url);
  } catch (err) {
    return false;
  }
};

export default isLinkSafe;
