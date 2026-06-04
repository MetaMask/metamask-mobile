import psl from 'psl';
import isLocalhostOrIPAddress from './isLocalhostOrIPAddress';

/**
 * Registrable domain (eTLD+1) for a URL, computed via the Public Suffix List
 * so multi-part suffixes like ".co.uk" resolve correctly. Used to group RPC
 * endpoints by provider so a single provider's wide outage (e.g. *.infura.io)
 * is treated as one failure rather than many.
 *
 * Localhost, IP literals, and single-label hosts are returned verbatim rather
 * than reduced to a domain (psl returns null or garbage for those, and callers
 * grouping by domain still need to distinguish them).
 *
 * @param urlString - The URL to extract a domain from.
 * @returns The domain, or null if the URL is invalid.
 */
function getDomain(urlString: string): string | null {
  let url: URL;
  try {
    url = new URL(urlString);
  } catch {
    return null;
  }

  const { hostname } = url;

  if (!hostname.includes('.') || isLocalhostOrIPAddress(hostname)) {
    return hostname;
  }

  return psl.get(hostname) ?? hostname;
}

export default getDomain;
