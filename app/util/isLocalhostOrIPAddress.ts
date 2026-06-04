import ipRegex from 'ip-regex';

/**
 * Check if a hostname is localhost or an IP address (v4 or v6). Public RPC
 * providers use domain names, not raw IP addresses, so a `true` result means
 * the host should not be reduced to an eTLD+1.
 *
 * @param hostname - The hostname to check.
 * @returns True if the hostname is localhost or an IP address.
 */
function isLocalhostOrIPAddress(hostname: string): boolean {
  const lowerHostname = hostname.toLowerCase();

  if (lowerHostname === 'localhost') {
    return true;
  }

  // Remove brackets from IPv6 addresses for testing (e.g., [::1] -> ::1)
  const hostnameWithoutBrackets = lowerHostname.replace(/^\[|\]$/gu, '');

  return ipRegex({ exact: true }).test(hostnameWithoutBrackets);
}

export default isLocalhostOrIPAddress;
