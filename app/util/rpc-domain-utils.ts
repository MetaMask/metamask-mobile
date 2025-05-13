/**
 * Extracts the domain from an RPC endpoint URL with privacy considerations
 * Returns 'private' for unknown domains, 'invalid' for invalid URLs
 *
 * @param rpcUrl - The RPC endpoint URL to extract the domain from
 * @returns The domain of the RPC endpoint, 'private', or 'invalid'
 */
export function extractRpcDomain(rpcUrl: string): string {
  if (!rpcUrl) {
    return 'invalid';
  }

  // Special case for localhost:port format
  if (rpcUrl.startsWith('localhost:') || rpcUrl.match(/^localhost:\d+$/)) {
    return 'localhost';
  }

  try {
    // Try to parse the URL directly
    const url = new URL(rpcUrl);
    return url.hostname.toLowerCase();
  } catch (e) {
    // Handle domain:port format without protocol
    if (rpcUrl.includes(':') && !rpcUrl.includes('//')) {
      const domainPart = rpcUrl.split(':')[0];
      if (domainPart) {
        return domainPart.toLowerCase();
      }
    }

    // Try adding https:// prefix for all other cases
    try {
      const url = new URL(`https://${rpcUrl}`);
      return url.hostname.toLowerCase();
    } catch (error) {
      return 'invalid';
    }
  }
}
